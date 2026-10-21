import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createGroupClient} from '@/lib/group-api';
import {catalogHref,catalogQuery,lastCatalogPage,parseCatalogState,type CatalogState} from '@/lib/group-catalog';
import {GroupCatalog,InvalidCatalog} from '@/components/group-catalog';
import '../design-system/preview.css';
import '../home.css';
import './catalog.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'مجموعه دوره‌ها — دورُب',description:'مجموعه دوره‌های آموزشی را جست‌وجو کن، موضوعت را انتخاب کن و دوره‌ها را مقایسه کن.'};
export default async function CatalogPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 let state:CatalogState;
 try{state=parseCatalogState(await searchParams);}catch{return <InvalidCatalog/>;}
 const result=await createGroupClient().list(catalogQuery(state));
 if(result.ok&&state.page>lastCatalogPage(result.data.total))redirect(catalogHref({...state,page:lastCatalogPage(result.data.total)}));
 return <GroupCatalog state={state} result={result}/>;
}
