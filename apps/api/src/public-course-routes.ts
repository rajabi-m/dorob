import { Elysia, t } from 'elysia';
import { courseProviders, coursePriceStatuses, courseDurations, parseCourseQuery, publicCoursePageSchema, publicCourseDetailSchema, validCourseId, type PublicCourse, type PublicCourseDetail, type Page, type PublicSchema, isPublicCoursePage, isPublicCourseDetail } from '@dorob/core';
import { CatalogError } from './catalog';
import type { PublicCourseRepository } from './public-courses';
import type { TSchema, TUnsafe } from '@sinclair/typebox';
export function apiSchema(s: PublicSchema): TSchema {
  if (s.anyOf) return t.Union(s.anyOf.map(apiSchema));
  if (s.enum) return t.Union(s.enum.map(v => v === null ? t.Null() : t.Literal(v as string)));
  switch (s.type) {
    case 'object': return t.Object(Object.fromEntries(Object.entries(s.properties!).map(([k,v]) => [k,apiSchema(v)])),{ additionalProperties:false });
    case 'array': return t.Array(apiSchema(s.items!));
    case 'string': return t.String({ minLength:s.minLength,maxLength:s.maxLength,pattern:s.pattern });
    case 'integer': return t.Integer({ minimum:s.minimum,maximum:s.maximum });
    case 'number': return t.Number({ minimum:s.minimum,maximum:s.maximum });
    case 'boolean': return t.Boolean();
    case 'null': return t.Null();
    default: throw new Error('Unsupported schema');
  }
}
const error = t.Object({ error:t.Object({ code:t.String(),message:t.String() }) });
const errors = { 422:error,404:error,503:error };
export function publicCourseRoutes(repository?: PublicCourseRepository) {
  const repo = () => { if (!repository) throw new CatalogError(503); return repository; };
  return new Elysia({ name:'public-courses',normalize:false })
    .onError(({ code,error,set }) => {
      const e = code === 'VALIDATION' && !('type' in error && error.type === 'response') ? new CatalogError(422) : error instanceof CatalogError ? error : new CatalogError(503);
      set.status=e.status;
      return { error:{ code:e.status === 404 ? 'not_found' : e.status === 422 ? 'invalid_input' : 'unavailable',message:e.message } };
    })
    .get('/api/v1/courses',async ({ request }): Promise<Page<PublicCourse>> => {
      let query; try { query=parseCourseQuery(new URL(request.url).searchParams); } catch { throw new CatalogError(422); }
      const page = await repo().list(query); if (!isPublicCoursePage(page)) throw new CatalogError(503); return page;
    }, { query:t.Object({ provider:t.Optional(t.String({ enum:courseProviders.map(p=>p.id) })),priceStatus:t.Optional(t.String({ enum:[...coursePriceStatuses] })),duration:t.Optional(t.String({ enum:[...courseDurations] })),q:t.Optional(t.String({ maxLength:200 })),category:t.Optional(t.String({ enum:['code','design','data','business','language','tools'] })),freeOnly:t.Optional(t.String({ enum:['true','false'] })),limit:t.Optional(t.String({ pattern:'^\\d+$',default:'18' })),offset:t.Optional(t.String({ pattern:'^\\d+$',default:'0' })) }),response:{ 200:apiSchema(publicCoursePageSchema) as TUnsafe<Page<PublicCourse>>,...errors },detail:{ tags:['Public catalog'],summary:'Current ready courses; literal normalized search, provider, price status, content duration, editorial category and explicit-free filtering before paging',description:'Default limit 18, maximum 100. Acceptance time descending then canonical ID. Reads do not collect or process images.' } })
    .get('/api/v1/courses/:courseId',async ({ params }): Promise<PublicCourseDetail> => { if (!validCourseId(params.courseId)) throw new CatalogError(422); const course = await repo().detail(params.courseId); if (!isPublicCourseDetail(course)) throw new CatalogError(503); return course; },
      { params:t.Object({ courseId:t.String({ minLength:1,maxLength:265 }) }),response:{ 200:apiSchema(publicCourseDetailSchema) as TUnsafe<PublicCourseDetail>,...errors },detail:{ tags:['Public catalog'],summary:'Current presentation-ready course detail (URL-encode canonical course ID)' } });
}
