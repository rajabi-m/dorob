import { failure } from "@/lib/course-result";
import { safeResponse, createCourseClient } from '@/lib/course-api';
export async function GET(request: Request, context: { params:Promise<{ assetId:string }> }) {
  if (new URL(request.url).search) return safeResponse(failure("invalid_input"));
  return createCourseClient().image((await context.params).assetId,request.headers.get('if-none-match') ?? undefined);
}
