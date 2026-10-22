import { providerNames, publicOffers, selectPrice } from '@dorob/core';
export { normalizeSearch, selectPrice } from '@dorob/core';
import type { CategoryId, CourseSnapshot, PublicCourseDetail } from '@dorob/core';
export function presentCourse(snapshot: CourseSnapshot, categoryIds: CategoryId[]): PublicCourseDetail {
  const p = snapshot.payload, asset = snapshot.thumbnail.status === 'ready' ? snapshot.thumbnail.asset : null;
  const offers = publicOffers(p);
  return { id:snapshot.courseId,snapshotId:snapshot.id,checkedAt:p.source.checkedAt,provider:{ id:p.providerId,name:providerNames[p.providerId] ?? p.providerId },title:p.title,sourceUrl:p.sourceUrl,
    thumbnail:asset ? { id:asset.id,path:asset.url,width:asset.width,height:asset.height,alt:p.thumbnail.data?.alt ?? '' } : null,
    level:p.classification?.data?.providerLevel ?? null,contentMinutes:p.education?.data?.duration.contentMinutes ?? null,instructors:p.instructors?.data ?? null,categoryIds,
    price:selectPrice(offers),description:p.description?.data ?? null,syllabus:p.curriculum?.data?.syllabus ?? null,offers };
}
