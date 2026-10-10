import type { CourseSnapshot } from '../src';
import { rich } from '../../../apps/api/src/ingestion-examples';
import { presentCourse } from '../../../apps/api/src/public-course-projection';
const snapshot = (payload = rich()): CourseSnapshot => ({ id:crypto.randomUUID(),courseId:`${payload.providerId}:${payload.providerCourseId}`,payload,receivedAt:'2026-10-10T00:00:00Z',acceptanceOrder:1,requestHash:'secret',factHash:'secret',presentationReady:true,thumbnail:{ status:'ready',failureCode:null,asset:{ id:crypto.randomUUID(),hash:'secret',profile:'profile',width:128,height:64,byteSize:100,format:'webp',url:'' } } });
export function example(payload = rich()) { const s = snapshot(payload); s.thumbnail.asset!.url = `/assets/thumbnails/${s.thumbnail.asset!.id}`; return presentCourse(s,[]); }
