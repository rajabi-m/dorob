// Synthetic offline transport: no claims of live model quality or provider correctness.
import type { DecisionRequest } from "@dorob/backend/placement-contracts";
export function decisionFixture(request: DecisionRequest, options: { topic?: string; level?: string; probability?: number; evidence?: number } = {}) {
  return { model: "offline-jev-fixture-v1", usage: { input_tokens: 100, output_tokens: 100, cost: 0 },
    answers: Object.fromEntries(Object.entries(request.questions).map(([id, q]) => {
      if (q.type === "noul") return [id, { type: "noul", noul: id.endsWith("Evidence") ? options.evidence ?? 0.99 : options.probability ?? 0.99 }];
      const choice = id === "topic" ? options.topic ?? "python" : options.level ?? "unknown";
      return [id, { type: "choice", choice, confidence: 0.95, probabilities: Object.fromEntries(Object.keys(q.criteria).map(key => [key, key === choice ? 1 : 0])) }];
    })) };
}
