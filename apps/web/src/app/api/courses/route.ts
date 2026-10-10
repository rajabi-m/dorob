import { courseListHandler } from '@/lib/course-api';
export const dynamic='force-dynamic';
export async function GET(request: Request) { return courseListHandler(request); }
