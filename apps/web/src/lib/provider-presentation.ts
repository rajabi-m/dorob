import {courseProviders} from '@dorob/core';

// Core owns IDs and names; this module only adds bundled presentation assets.
export const providers=courseProviders.map(provider=>({...provider,logo:{src:`/providers/${provider.id}.svg`,alt:''}}));
export const providerLogo=(id:string)=>providers.find(provider=>provider.id===id)?.logo;
