import { z } from "zod";
import type { Config } from "./config.ts";
import { type DecisionRequest, type EmbeddingIdentity, usageSchema, validateVector } from "./placement-contracts.ts";

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
export function liveClients(config: Config, transport: typeof fetch = fetch): { decision: DecisionClient; embedding: EmbeddingClient } {
  function key(model: string) {
    if (!config.LIVE_MODEL_CALLS_ENABLED || !config.OPENROUTER_API_KEY || !model || !config.MODEL_RUN_BUDGET_USD) throw new Error("Explicit live enablement, key, model and budget required");
    return config.OPENROUTER_API_KEY;
  }
  return {
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
