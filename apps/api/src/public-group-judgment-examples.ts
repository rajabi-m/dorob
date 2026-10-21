import type {PublicJudgedGroupDetail,PublicJudgedGroup} from '@dorob/core';
const id='00000000-0000-4000-8000-000000000001';
const thumbnail={id,path:'/assets/thumbnails/'+id,width:320,height:180,alt:'دوره'};
const provider={id:'example',name:'ارائه‌دهندهٔ آزمایشی'};
const facts={snapshotId:id,checkedAt:'2026-10-19T00:00:00Z',provider,sourceUrl:'https://example.org/course',thumbnail,level:null,contentMinutes:60,instructors:null,categoryIds:['code' as const],price:{status:'unknown' as const,offerId:null,amount:null,originalAmount:null,unit:'toman' as const,startingPrice:false,billingPeriod:null,unavailableReason:'not-established' as const},offers:null,rating:null};
const courses=['one','two'].map(n=>({course:{...facts,id:'example:'+n,title:'دورهٔ '+n},assessment:{tags:[],strengths:[],weaknesses:[]}}));
const common={id,slug:'python',categoryId:'code' as const,hero:{title:'مقایسه دوره‌های پایتون',subtitle:'انتخاب مسیر یادگیری',description:'مسیرهای شروع یادگیری پایتون را مقایسه کنید.',topicLabel:'پایتون',levelSummary:'مقدماتی'},courseCount:2,providers:[provider],judgmentId:id,judgedAt:'2026-10-19T00:00:00Z'};
export const publicGroupDetailExample:PublicJudgedGroupDetail={...common,courses:{items:courses,total:2,limit:20,offset:0}};
export const publicGroupSummaryExample:PublicJudgedGroup={...common,covers:courses.map(({course})=>({courseId:course.id,title:course.title,thumbnail}))};
export function addPublicGroupExamples(document:{paths?:Record<string,Record<string,{responses?:Record<string,{content?:Record<string,{example?:unknown}>}>}>>}){
 for(const [path,example]of [['/api/v1/judged-groups',{items:[publicGroupSummaryExample],total:1,limit:12,offset:0}],['/api/v1/judged-groups/{slug}',publicGroupDetailExample]] as const){const responses=document.paths?.[path]?.get.responses;if(!responses)continue;const content=responses['200']?.content?.['application/json'];if(content)content.example=example;
 for(const [status,code]of [[404,'not_found'],[409,'conflict'],[422,'invalid_input'],[503,'unavailable']] as const){const error=responses[String(status)]?.content?.['application/json'];if(error)error.example={error:{code,message:status===409?'Comparison replaced or withdrawn; restart comparison.':'Public comparison unavailable.'}};}
 }
}
