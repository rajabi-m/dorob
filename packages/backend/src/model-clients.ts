import { z } from "zod";
import type { Config } from "./config.ts";
import { type DecisionRequest, type EmbeddingIdentity, usageSchema, validateVector } from "./placement-contracts.ts";

export type GenerationRequest = { model: string; max_tokens: number; messages: { role: "system" | "user"; content: string }[];
  response_format: { type: "json_schema"; json_schema: { name: string; strict: true; schema: Record<string, unknown> } };
  provider: { require_parameters: true; allow_fallbacks: false }; stream: false };
export type GenerativeClient = (request: GenerationRequest, signal: AbortSignal) => Promise<unknown>;
export function validateGeneration(input: unknown, maxOutput: number) {
  const result = z.object({ model: z.string().min(1).max(200), choices: z.array(z.object({ finish_reason: z.literal("stop"),
    message: z.object({ content: z.string().max(100000) }) })).length(1),
    usage: z.object({ prompt_tokens: z.number().int().nonnegative(), completion_tokens: z.number().int().nonnegative(),
      cost: z.number().finite().nonnegative().optional() }) }).parse(input);
  if (result.usage.completion_tokens > maxOutput) throw new Error("Output token bound exceeded");
  return { model: result.model, data: JSON.parse(result.choices[0].message.content),
    usage: { input_tokens: result.usage.prompt_tokens, output_tokens: result.usage.completion_tokens, cost: result.usage.cost } };
}
export type DecisionClient = (request: DecisionRequest, signal: AbortSignal) => Promise<unknown>;
export type EmbeddingClient = (text: string, identity: EmbeddingIdentity, signal: AbortSignal) => Promise<unknown>;
export class ModelHttpError extends Error {
  constructor(public status: number) { super("Model endpoint rejected request"); }
}
async function post(path: string, body: unknown, key: string, signal: AbortSignal, transport: typeof fetch) {
  const encoded = JSON.stringify(body);
  if (Buffer.byteLength(encoded) > 65536) throw new Error("Model payload exceeds 64 KiB; select smaller evidence explicitly");
  const response = await transport(`https://openrouter.ai/api/${path}`, { method: "POST", redirect: "error", signal,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: encoded });
  if (!response.ok) { await response.body?.cancel(); throw new ModelHttpError(response.status); }
  if (!response.body) throw new Error("Missing model response");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length;
      if (length > 131072) throw new Error("Model response exceeds 128 KiB"); chunks.push(value); }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function liveClients(config: Config, transport: typeof fetch = fetch): { decision: DecisionClient; embedding: EmbeddingClient; generative: GenerativeClient } {
  function key(model: string) {
    if (!config.LIVE_MODEL_CALLS_ENABLED || !config.OPENROUTER_API_KEY || !model || !config.MODEL_RUN_BUDGET_USD) throw new Error("Explicit live enablement, key, model and budget required");
    return config.OPENROUTER_API_KEY;
  }
  return {
    generative: async (request, signal) => {
      if (!config.GENERATIVE_MODEL_ID || request.model !== config.GENERATIVE_MODEL_ID || request.max_tokens > config.MODEL_MAX_OUTPUT_TOKENS) throw new Error("Configured generative identity/output bound required");
      return post("v1/chat/completions", request, key(request.model), signal, transport);
    },
    decision: async (request, signal) => {
      if (!config.JEV_MODEL_ID || request.model !== config.JEV_MODEL_ID || !request.model.startsWith("typesafe/jev-")) throw new Error("Configured Jev model required");
      // Decisions has no documented output-token request parameter. Bound question count/options,
      // response bytes and reported output; never send invented chat API parameters.
      return post("alpha/decisions", request, key(request.model), signal, transport);
    },
    embedding: async (text, identity, signal) => {
      if (identity.model !== config.EMBEDDING_MODEL_ID || identity.dimensions !== config.EMBEDDING_DIMENSIONS) throw new Error("Configured embedding identity required");
      return post("v1/embeddings", { model: identity.model, input: text, dimensions: identity.dimensions, encoding_format: "float" }, key(identity.model), signal, transport);
    },
  };
}
export function validateEmbedding(input: unknown, identity: EmbeddingIdentity) {
  const result = z.object({ model: z.string().min(1), data: z.array(z.object({ index: z.literal(0), embedding: z.array(z.number().finite()) })).length(1), usage: usageSchema }).parse(input);
  // Require returned identity to match the configured pinned identity. Aliases must be resolved
  // by the operator before embedding; a different served version cannot share this vector space.
  if (result.model !== identity.model) throw new Error("Served embedding model differs");
  return { model: result.model, vector: validateVector(result.data[0].embedding, identity), usage: result.usage };
}
