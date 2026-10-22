"use client";
import {Suspense,type CSSProperties} from 'react';
import {ArrowRight} from 'lucide-react';
import type {PublicJudgedGroupDetail} from '@dorob/core';
import type {GroupResult} from '@/lib/group-result';
import {providers as marqueeProviders} from '@/lib/provider-presentation';
import {ProviderMark} from './provider-mark';
import {FeaturedGroupShelf,FeaturedGroupLoading} from './featured-group-shelf';
import './home-hero-variants.css';

function ProviderMarquee() {
  return <div className="hero-provider-strip">
    <span className="discovery-sr-only">ارائه‌دهنده‌ها: مکتب‌خونه، تاپ‌لرن، کوئرا، سبزلرن و راکت</span>
    <div className="hero-provider-window" aria-hidden="true">
      <div className="hero-provider-track">{[0, 1].map(copy => <div className="hero-provider-lap" key={copy}>{marqueeProviders.map(provider => <span className="hero-provider-item" key={provider.id}>
        <ProviderMark id={provider.id} size={25}/> {provider.name}
      </span>)}</div>)}</div>
    </div>
  </div>;
}

function ProviderWheel() {
  return <div className="hero-provider-wheel">
    <span className="discovery-sr-only">ارائه‌دهنده‌ها: مکتب‌خونه، تاپ‌لرن، کوئرا، سبزلرن و راکت</span>
    <div className="hero-wheel-stage" aria-hidden="true">
      {marqueeProviders.map((provider, index) => <span className="hero-wheel-logo" key={provider.id}
        style={{ "--wheel-delay": `${-9 - index * 3.6}s` } as CSSProperties}>
        <ProviderMark id={provider.id} size={48}/>
        <span>{provider.name}</span>
      </span>)}
    </div>
  </div>;
}

export function HomeHero({featuredGroup}:{featuredGroup:Promise<GroupResult<PublicJudgedGroupDetail>>}){
  return <section className="hero-option hero-discovery" aria-labelledby="home-title">
    <div className="hero-option-copy">
      <h1 id="home-title">شروع یادگیری،<br />با یک انتخاب خوب.</h1>
      <p>دوره‌های ارائه‌دهنده‌های مختلف را یک‌جا ببین. محتوا، زمان و هزینه را بررسی کن و قدم بعدی‌ات را بردار.</p>
      <a className="ds-button" href="#groups">دیدن مجموعه دوره‌ها <ArrowRight className="home-directional" size={18} aria-hidden="true" /></a>
      <ProviderMarquee />
      <ProviderWheel />
    </div>
    <Suspense fallback={<FeaturedGroupLoading/>}><FeaturedGroupShelf initial={featuredGroup}/></Suspense>
  </section>;
}
