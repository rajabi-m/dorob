import { categoryRegistry, type CategoryId } from './categories';
import type { Page } from './index';
import type { SourceFactsV2 } from './ingestion';
export type PublicOffer = Omit<NonNullable<SourceFactsV2['offers']>[number], 'sourcePrice'>;
export interface PriceSummary {
  status: 'free' | 'paid' | 'subscription' | 'unknown'; offerId: string | null;
  amount: number | null; originalAmount: number | null; unit: 'toman';
  startingPrice: boolean; billingPeriod: PublicOffer['billingPeriod']; unavailableReason: 'not-established' | null;
}
export interface PublicCourse {
  id: string; snapshotId: string; checkedAt: string;
  provider: { id: string; name: string }; title: string; sourceUrl: string;
  thumbnail: { id: string; path: string; width: number; height: number; alt: string };
  level: string | null; contentMinutes: number | null; instructors: { name: string; role: string | null }[] | null;
  categoryIds: CategoryId[]; price: PriceSummary;
}
export interface PublicCourseDetail extends PublicCourse {
  description: string | null; syllabus: SourceFactsV2['syllabus']; offers: PublicOffer[] | null;
}
export type CourseQuery = { q: string; category?: CategoryId; freeOnly: boolean; limit: number; offset: number };
export const uuidPattern = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
export const validCourseId = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*:[^\u0000-\u001f]{1,200}$/u.test(value) && value.length <= 265 && value.indexOf(':') <= 64 && value.slice(value.indexOf(':')+1).trim() === value.slice(value.indexOf(':')+1);
export function parseCourseQuery(params: URLSearchParams): CourseQuery {
  if ([...params.keys()].some(key => !['q','category','freeOnly','limit','offset'].includes(key)) || [...new Set(params.keys())].some(key => params.getAll(key).length !== 1)) throw new Error('Invalid query');
  const q = params.get('q') ?? '', category = params.get('category') ?? undefined, free = params.get('freeOnly') ?? 'false';
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const text = params.get(key); if (text !== null && !/^\d+$/.test(text)) throw new Error('Invalid query');
    const n = text === null ? fallback : Number(text); if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error('Invalid query'); return n;
  };
  if (q.length > 200 || (category !== undefined && !categoryRegistry.some(item => item.id === category)) || !['true','false'].includes(free)) throw new Error('Invalid query');
  return { q, category: category as CategoryId | undefined, freeOnly: free === 'true', limit: integer('limit',18,1,100), offset: integer('offset',0,0,2147483647) };
}
// Small JSON-schema subset shared by the runtime boundary and OpenAPI, with no server imports.
export type PublicSchema = { type?: string; properties?: Record<string, PublicSchema>; required?: string[]; additionalProperties?: boolean; items?: PublicSchema; anyOf?: PublicSchema[]; enum?: unknown[]; pattern?: string; minLength?: number; maxLength?: number; minimum?: number; maximum?: number };
const str = (maxLength = 20000): PublicSchema => ({ type:'string', maxLength });
const text = (max = 20000): PublicSchema => ({ ...str(max), minLength:1, pattern:'\\S' });
const num = (maximum = Number.MAX_SAFE_INTEGER): PublicSchema => ({ type:'number', minimum:0, maximum });
const int = (minimum = 0, maximum = Number.MAX_SAFE_INTEGER): PublicSchema => ({ type:'integer', minimum, maximum });
const bool: PublicSchema = { type:'boolean' };
const values = (...items: unknown[]): PublicSchema => ({ enum:items });
const nullable = (schema: PublicSchema): PublicSchema => ({ anyOf:[schema,{ type:'null' }] });
const array = (items: PublicSchema): PublicSchema => ({ type:'array',items });
const object = (properties: Record<string, PublicSchema>): PublicSchema => ({ type:'object',properties,required:Object.keys(properties),additionalProperties:false });
const uuid: PublicSchema = { ...text(),pattern:uuidPattern };
const period = nullable(values('monthly','yearly','other'));
const offer = object({ id:text(200),type:values('full','content','subscription','free','other'),label:nullable(str()),amount:nullable(num()),originalAmount:nullable(num()),unit:values('toman'),status:values('free','paid','subscription','unknown'),billingPeriod:period,certificateIncluded:nullable(bool),accessDescription:nullable(str()),supportDescription:nullable(str()) });
const lesson = object({ id:nullable(str()),order:int(),title:text(),description:nullable(str()),type:values('video','text','exercise','quiz','project','live','other','unknown'),providerType:nullable(str()),contentMinutes:nullable(num()) });
const courseProperties = {
  id:{ ...text(265),pattern:'^[a-z0-9]+(?:-[a-z0-9]+)*:[^\\u0000-\\u001f]{1,200}$' },snapshotId:uuid,checkedAt:text(100),
  provider:object({ id:{ ...text(64),pattern:'^[a-z0-9]+(?:-[a-z0-9]+)*$' },name:text() }),title:text(300),sourceUrl:text(2048),
  thumbnail:object({ id:uuid,path:{ ...text(),pattern:'^/assets/thumbnails/[0-9a-fA-F-]{36}$' },width:int(1,640),height:int(1,640),alt:str() }),
  level:nullable(str()),contentMinutes:nullable(num()),instructors:nullable(array(object({ name:text(),role:nullable(str()) }))),categoryIds:array(values(...categoryRegistry.map(item => item.id))),
  price:object({ status:values('free','paid','subscription','unknown'),offerId:nullable(text(200)),amount:nullable(num()),originalAmount:nullable(num()),unit:values('toman'),startingPrice:bool,billingPeriod:period,unavailableReason:nullable(values('not-established')) }),
};
export const publicCourseSchema = object(courseProperties);
export const publicCourseDetailSchema = object({ ...courseProperties,description:nullable(str()),syllabus:nullable(array(object({ id:nullable(str()),order:int(),title:text(),description:nullable(str()),lessons:nullable(array(lesson)) }))),offers:nullable(array(offer)) });
export const publicCoursePageSchema = object({ items:array(publicCourseSchema),total:int(),limit:int(1,100),offset:int(0,2147483647) });
function conforms(schema: PublicSchema, value: unknown): boolean {
  if (schema.anyOf) return schema.anyOf.some(item => conforms(item,value));
  if (schema.enum) return schema.enum.includes(value);
  switch(schema.type) {
    case 'null': return value === null;
    case 'boolean': return typeof value === 'boolean';
    case 'number': case 'integer': return typeof value === 'number' && Number.isFinite(value) && (schema.type !== 'integer' || Number.isSafeInteger(value)) && value >= (schema.minimum ?? -Infinity) && value <= (schema.maximum ?? Infinity);
    case 'string': return typeof value === 'string' && value.length >= (schema.minLength ?? 0) && value.length <= (schema.maxLength ?? Infinity) && (!schema.pattern || new RegExp(schema.pattern,'u').test(value));
    case 'array': return Array.isArray(value) && value.every(item => conforms(schema.items!,item));
    case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).every(key => Object.hasOwn(schema.properties!,key)) && schema.required!.every(key => conforms(schema.properties![key],(value as Record<string, unknown>)[key]));
    default: return false;
  }
}
function validPrice(p: PriceSummary | PublicOffer): boolean {
  if (p.status === 'free' && p.amount !== 0) return false;
  if (p.status === 'paid' && (p.amount === null || p.amount <= 0)) return false;
  if (p.originalAmount !== null && (p.amount === null || p.originalAmount <= p.amount)) return false;
  if ('startingPrice' in p) {
    if (p.status === 'unknown') return p.offerId === null && p.amount === null && p.originalAmount === null && p.unavailableReason === 'not-established' && !p.startingPrice && p.billingPeriod === null;
    if (p.offerId === null || p.unavailableReason !== null || (p.status !== 'paid' && p.startingPrice)) return false;
    if (p.status !== 'subscription' && p.billingPeriod !== null) return false;
  }
  return true;
}
function validCourse(c: PublicCourse): boolean {
  try {
    const url = new URL(c.sourceUrl);
    return validCourseId(c.id) && c.id.startsWith(c.provider.id + ':') && ['http:','https:'].includes(url.protocol) && !url.username && !url.password && !/\s/.test(c.sourceUrl) && /^\d{4}-\d\d-\d\dT/.test(c.checkedAt) && Number.isFinite(Date.parse(c.checkedAt)) && c.thumbnail.path === `/assets/thumbnails/${c.thumbnail.id}` && new Set(c.categoryIds).size === c.categoryIds.length && validPrice(c.price);
  } catch { return false; }
}
export function isPublicCoursePage(value: unknown): value is Page<PublicCourse> {
  if (!conforms(publicCoursePageSchema,value)) return false;
  const page = value as Page<PublicCourse>;
  return page.items.every(validCourse) && new Set(page.items.map(c => c.id)).size === page.items.length && page.items.length <= page.limit && page.items.length === Math.min(page.limit,Math.max(0,page.total-page.offset));
}
export function isPublicCourseDetail(value: unknown): value is PublicCourseDetail {
  if (!conforms(publicCourseDetailSchema,value)) return false;
  const c = value as PublicCourseDetail;
  return validCourse(c) && (c.offers === null || (c.offers.every(validPrice) && new Set(c.offers.map(o => o.id)).size === c.offers.length)) && (c.price.offerId === null || !!c.offers?.some(o => o.id === c.price.offerId && o.status === c.price.status && o.amount === c.price.amount && o.originalAmount === c.price.originalAmount));
}
