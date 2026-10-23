import {test,expect} from 'bun:test';
import {sortAssessedCourses} from '../src/public-group-judgments';
import {publicGroupDetailExample} from '../src/public-group-judgment-examples';
import type {AssessedCourse} from '@dorob/core';
test('retained displayed-price sorting preserves buckets, ties, canonical order and paged completeness',()=>{
 const prices:[AssessedCourse['course']['price']['status'],number|null,number|null,boolean][]=[
  ['paid',100,900,true],['subscription',10,null,false],['paid',50,500,false],['free',null,null,false],
  ['paid',100,null,false],['unknown',null,null,false],['subscription',500,null,false],['paid',null,null,false],['subscription',null,null,false],
 ];
 const courses=prices.map(([status,amount,originalAmount,startingPrice],n)=>{const e=structuredClone(publicGroupDetailExample.courses.items[0]!);e.course.id='example:'+n;e.course.price={...e.course.price,status,amount,originalAmount,startingPrice,billingPeriod:status==='subscription'?(n===1?'yearly':'monthly'):null};return e;});
 const ids=(items:AssessedCourse[])=>items.map(e=>Number(e.course.id.split(':')[1]));
 const before=JSON.stringify(courses);
 expect(ids(sortAssessedCourses(courses))).toEqual([0,1,2,3,4,5,6,7,8]);
 expect(ids(sortAssessedCourses(courses,'price-asc'))).toEqual([3,2,0,4,1,6,5,7,8]);
 expect(ids(sortAssessedCourses(courses,'price-desc'))).toEqual([0,4,2,3,1,6,5,7,8]);
 const sorted=sortAssessedCourses(courses,'price-asc');expect(ids(sorted.slice(0,2))).toEqual([3,2]);
 expect(new Set([...sorted.slice(0,2),...sorted.slice(2,4),...sorted.slice(4)].map(e=>e.course.id)).size).toBe(courses.length);
 expect(JSON.stringify(courses)).toBe(before);
});
