/** Operator diagnostics are allowlisted; never render arbitrary exceptions. */
export const messages = {
  missing_checkpoint: "--checkpoint is required.",
  incompatible_options: "Choose one of --url, --limit or --all.",
  invalid_limit: "--limit must be a positive integer.",
  invalid_arguments: "Unknown option, positional argument or missing option value; see --help.",
  unknown_option: "Unknown option; see --help for supported flags.",
  invalid_option_value: "An option value is missing or has the wrong type; see --help.",
  help_json: "Invoke --help alone to print usage; omit --json when requesting help.",
  invalid_selection: "Invalid course selection; use canonical public course URLs.",
  invalid_destination: "Backend invalid_destination: use a credential-free HTTP(S) origin (HTTP is local only).",
  invalid_options: "Invalid request options.",
  checkpoint_path: "Checkpoint must be a .json file beneath apps/utils/output, without control characters.",
  checkpoint_exists: "Checkpoint already exists; choose a new file or explicitly resume.",
  checkpoint_invalid: "Invalid or incompatible worker checkpoint; resume requires an existing private regular file.",
  checkpoint_mismatch: "Checkpoint configuration or selection mismatch; use its matching provider, extractor, backend and selections.",
  checkpoint_locked: "Checkpoint lock exists; inspect its owner and recover only after confirming it has stopped. Do not remove a live lock.",
  checkpoint_io: "Checkpoint filesystem operation failed; check directory access and available disk space. Retain existing saved work.",
  checkpoint_save: "Checkpoint save failed; ingestion stopped to protect checkpoint-before-delivery ordering. Retain existing saved work.",
  checkpoint_release: "Checkpoint lock release failed; inspect the lock owner before manual recovery.",
  discovery_failed: "Discovery failed; check provider access and retry with a new checkpoint after resolving the cause.",
  collection_failed: "Course extraction or request failed.",
  delivery_failed: "Backend delivery failed with an unknown cause.",
  image_failed: "Thumbnail processing failed.",
  image_pending: "Backend accepted facts; thumbnail processing remains pending.",
  access_denied: "Provider access was denied; review provider access rules before retrying.",
  canceled: "Run canceled.",
  timeout: "Request timeout.",
  transport: "Unknown transport failure; check destination availability and connectivity. The exact connection cause is not known.",
  invalid_response: "Backend returned an invalid response.",
  receipt_mismatch: "Backend receipt does not match the saved observation or snapshot.",
  unknown_failure: "Unexpected ingestion failure; inspect configuration and services before retrying.",
} as const;
export type DiagnosticCode = keyof typeof messages | `http_${number}`;
export function safeCode(input: string, fallback: DiagnosticCode = "unknown_failure"): DiagnosticCode {
  return Object.hasOwn(messages, input) || /^http_[1-5]\d\d$/.test(input) ? input as DiagnosticCode : fallback;
}
export function diagnosticMessage(code: DiagnosticCode): string {
  return /^http_[1-5]\d\d$/.test(code) ? `Request returned HTTP ${code.slice(5)}.` : messages[code as keyof typeof messages];
}
export class DiagnosticError extends Error {
  constructor(readonly code: DiagnosticCode, readonly saved = false, readonly stage: "invocation" | "checkpoint" | "discovery" = "invocation") { super(diagnosticMessage(code)); }
}
export type RetryEvent = { attempt: number; waitMs: number; code: DiagnosticCode };
export function observe<T>(observer: ((event: T) => void) | undefined, event: T) {
  try { observer?.(event); } catch { /* Reporting is outside the durable state machine. */ }
}
export function safeText(input: string, max = 100): string {
  // Strip terminal controls and bidi overrides/isolation, preserving Persian ZWNJ.
  return input.replace(/[\u0000-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069]/g, " ").slice(0, max);
}
export function courseIdentity(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    let decoded = pathname;
    try { decoded = decodeURIComponent(pathname); } catch { /* Malformed escapes stay literal. */ }
    return safeText(decoded);
  } catch { return "course"; }
}
