import { failure } from "@/lib/course-result";
import { safeResponse, courseDetailHandler } from '@/lib/course-api';
export const dynamic='force-dynamic';
export async function GET(request: Request, context: { params:Promise<{ courseId:string }> }) {
  if (new URL(request.url).search) return safeResponse(failure("invalid_input"));
  return courseDetailHandler((await context.params).courseId);
}
