import {test,expect} from 'bun:test';
import {parseSuggestionInput,parseAdminQuery,isReviewVersion,validCourseId,isPairReview} from '../src';
const input={courseId:'test:Python / فارسی',systemId:'system-one',systemName:'سیستم نمونه',submissionId:'first',confidencePercent:87.5};
test('submission confidence, normalized replay payload and canonical course identities',()=>{
  for(const confidencePercent of [0,87.5,100])expect(parseSuggestionInput({...input,confidencePercent}).confidencePercent).toBe(confidencePercent);
  for(const confidencePercent of [-1,101,NaN,Infinity,'90'])expect(()=>parseSuggestionInput({...input,confidencePercent})).toThrow();
  for(const field of ['systemId','systemName','submissionId','courseId'])expect(()=>parseSuggestionInput({...input,[field]:' '})).toThrow();
  expect(parseSuggestionInput({...input,systemName:'  نمونه  '}).systemName).toBe('نمونه');
  expect(decodeURIComponent(encodeURIComponent(input.courseId))).toBe(input.courseId);expect(validCourseId(input.courseId)).toBe(true);
  expect(()=>parseSuggestionInput({...input,courseId:'../manage'})).toThrow();
});
test('strict filters, status and optimistic review version boundaries',()=>{
  expect(parseAdminQuery(new URLSearchParams('q=پایتون&category=code&isPublished=false&offset=20'),'groups')).toMatchObject({isPublished:false,offset:20});
  for(const q of ['status=unknown','limit=101','offset=-1','status=pending&status=approved','url=http://evil'])expect(()=>parseAdminQuery(new URLSearchParams(q),'suggestions')).toThrow();
  expect(parseAdminQuery(new URLSearchParams(),'suggestions').status).toBe('pending');
  for(const v of [-1,1.5,'1',2147483647])expect(isReviewVersion(v)).toBe(false);expect(isReviewVersion(0)).toBe(true);
  expect(isPairReview({status:'unknown'})).toBe(false);
});
