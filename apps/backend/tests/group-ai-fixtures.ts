// Synthetic outputs for orchestration acceptance, never educational quality evaluation.
import type { GenerationRequest } from "@dorob/backend/model-clients";
import type { Draft, Evidence } from "@dorob/backend/group-ai-contracts";
export function draftFixture(evidence: Evidence[]): Draft {
  return { titleFa: "مقایسه آزمایشی پایتون", topicId: "python", targetLearnerFa: "یادگیرنده آزمایشی",
    outcomesFa: ["خروجی آزمایشی"], scopeFa: "دامنه آزمایشی پایتون", prerequisitesFa: "پیش‌نیاز مطابق منبع",
    level: "unknown", rubric: [{ id: "scope", titleFa: "پوشش", criterionFa: "پوشش سرفصل منتشرشده" }],
    evidenceIds: evidence.map(e => `${e.revisionId}:description`), limitationsFa: ["داده ساختگی برای آزمون"] };
}
export function generationFixture(request: GenerationRequest) {
  const body = JSON.parse(request.messages[1].content) as { evidence: Evidence[]; context: { draft?: Draft } };
  const e = body.evidence[0];
  const data = request.response_format.json_schema.name === "dorob_definition_v1" ? draftFixture(body.evidence) : {
    courseId: e.courseId, revisionId: e.revisionId, status: "assessed",
    coverage: body.context.draft!.rubric.map(r => ({ rubricId: r.id, status: "advertised", evidenceIds: [`${e.revisionId}:description`] })),
    claims: [{ textFa: "منبع دامنه آموزشی پایتون را معرفی می‌کند.", dimension: "scope", basis: "provider-fact", kind: "coverage",
      evidenceIds: [`${e.revisionId}:description`], quotes: [{ evidenceId: `${e.revisionId}:description`, quote: e.evidence.find(x => x.path === "description")!.value }] }],
    evidenceLimitationsFa: ["کیفیت تدریس بررسی نشده است."] };
  return { model: "offline-generative-served-v1", choices: [{ finish_reason: "stop", message: { content: JSON.stringify(data) } }],
    usage: { prompt_tokens: 100, completion_tokens: 100, cost: 0 } };
}
