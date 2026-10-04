import { z } from "zod";

const bool = z.enum(["true", "false"]).transform(value => value === "true");
const positive = z.coerce.number().int().positive();
const optionalText = z.preprocess(value => value === "" ? undefined : value, z.string().min(1).optional());
const configSchema = z.object({
  DATABASE_URL: z.string().url().refine(value => /^postgres(?:ql)?:\/\//.test(value)),
  DATABASE_POOL_SIZE: positive.max(50).default(5),
  BACKEND_HOST: z.string().default("127.0.0.1"),
  BACKEND_PORT: positive.max(65535).default(4000),
  BACKEND_OPERATOR_TOKEN: optionalText,
  PGBOSS_SCHEMA: z.string().regex(/^[a-z][a-z0-9_]*$/).max(50).default("pgboss"),
  WORKER_CONCURRENCY: positive.max(8).default(1),
  PROVIDER_CONCURRENCY: z.coerce.number().int().min(1).max(1).default(1),
  JEV_CONCURRENCY: positive.max(8).default(1),
  GENERATIVE_CONCURRENCY: z.coerce.number().int().min(1).max(1).default(1),
  SCHEDULES_ENABLED: bool.default(false),
  LIVE_MODEL_CALLS_ENABLED: bool.default(false),
  OPENROUTER_API_KEY: optionalText,
  JEV_MODEL_ID: z.string().min(1).default("typesafe/jev-1.13"),
  GENERATIVE_MODEL_ID: optionalText,
  EMBEDDING_MODEL_ID: optionalText,
  EMBEDDING_DIMENSIONS: z.preprocess(value => value === "" ? undefined : value, positive.max(16000).optional()),
  MODEL_MAX_OUTPUT_TOKENS: positive.max(32000).default(2000),
  MODEL_RUN_BUDGET_USD: z.preprocess(value => value === "" ? undefined : value, z.coerce.number().positive().optional()),
});

export function readConfig(env: Record<string, string | undefined> = process.env) {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    // Never echo environment values, credentials or the database URL in errors.
    throw new Error(`Invalid configuration: ${[...new Set(result.error.issues.map(issue => issue.path.join(".")))].join(", ")}`);
  }
  const config = result.data;
  if (config.BACKEND_OPERATOR_TOKEN && config.BACKEND_OPERATOR_TOKEN.length < 32) throw new Error("BACKEND_OPERATOR_TOKEN must be at least 32 characters");
  if (config.SCHEDULES_ENABLED) throw new Error("Schedules are not implemented; keep SCHEDULES_ENABLED=false");
  if (config.LIVE_MODEL_CALLS_ENABLED) throw new Error("Live model calls are not implemented; keep LIVE_MODEL_CALLS_ENABLED=false");
  if (Boolean(config.EMBEDDING_MODEL_ID) !== Boolean(config.EMBEDDING_DIMENSIONS)) throw new Error("Configure EMBEDDING_MODEL_ID and EMBEDDING_DIMENSIONS together");
  return config;
}
export type Config = ReturnType<typeof readConfig>;
