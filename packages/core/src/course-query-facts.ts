import { courseProviders } from './public-courses';
import type { CourseIngestion } from './ingestion';
import type { PriceSummary, PublicOffer } from './public-courses';

/** Bump and explicitly rebuild when normalization, provider names or price rules change. */
export const COURSE_QUERY_VERSION = 1;
export const providerNames: Record<string,string> = Object.fromEntries(courseProviders.map(p=>[p.id,p.name]));
export const normalizeSearch = (text: string) => text.normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/\s+/g,' ').trim().toLocaleLowerCase('fa-IR');
export function selectPrice(offers: PublicOffer[] | null): PriceSummary {
  const sorted = [...(offers ?? [])].sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const once = sorted.filter(o => o.type !== 'subscription' && o.status !== 'subscription');
  const free = once.find(o => o.status === 'free' && o.amount === 0);
  const paid = once.filter(o => o.status === 'paid' && o.amount !== null && o.amount > 0).sort((a,b) => a.amount! - b.amount!);
  const subscription = sorted.find(o => o.status === 'subscription');
  const selected = free ?? paid[0] ?? subscription;
  if (!selected) return { status:'unknown',offerId:null,amount:null,originalAmount:null,unit:'toman',startingPrice:false,billingPeriod:null,unavailableReason:'not-established' };
  return { status:selected.status,offerId:selected.id,amount:selected.amount,originalAmount:selected.originalAmount,unit:'toman',startingPrice:selected.status === 'paid' && once.length > 1,billingPeriod:selected.status === 'subscription' ? selected.billingPeriod : null,unavailableReason:null };
}
export function publicOffers(p: CourseIngestion): PublicOffer[] | null {
  return p.pricing.data?.map(o => ({ id:o.id,type:o.type,label:o.label,amount:o.amount,originalAmount:o.amount !== null && o.originalAmount !== null && o.originalAmount > o.amount ? o.originalAmount : null,unit:o.unit,status:o.status,billingPeriod:o.billingPeriod,certificateIncluded:o.certificateIncluded,accessDescription:o.accessDescription,supportDescription:o.supportDescription })) ?? null;
}
export function deriveCourseQueryFacts(p: CourseIngestion) {
  return {
    version: COURSE_QUERY_VERSION,
    providerId: p.providerId,
    searchText: normalizeSearch(`${p.title} ${p.providerId} ${providerNames[p.providerId] ?? p.providerId} ${p.instructors?.data?.map(i=>i.name).join(' ') ?? ''}`),
    contentMinutes: p.education?.data?.duration.contentMinutes ?? null,
    price: selectPrice(publicOffers(p)),
  };
}
