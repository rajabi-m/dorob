import "server-only";
import { createDataService } from "./data-service";
// No NEXT_PUBLIC variables, credentials, operator token, DB or server-package imports.
export function dataService() {
  return createDataService({ mode: process.env.DOROB_DATA_MODE, backendUrl: process.env.DOROB_BACKEND_URL });
}
