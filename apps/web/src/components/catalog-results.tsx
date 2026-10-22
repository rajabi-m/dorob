'use client';

import './catalog.css';
import type {ReactNode, RefObject} from 'react';
import {SlidersHorizontal} from 'lucide-react';

type CatalogResultsProps = {
 sidebarId: string;
 sidebarTitle: string;
 sidebar: ReactNode;
 headingId: string;
 heading: ReactNode;
 headingRef: RefObject<HTMLHeadingElement | null>;
 resultsRef?: RefObject<HTMLElement | null>;
 pending: boolean;
 status: ReactNode;
 filterLabel: string;
 filterButton: RefObject<HTMLButtonElement | null>;
 openFilters: () => void;
 chips: ReactNode;
 children: ReactNode;
};

/** Shared layout owns the toolbar; callers retain domain filters and results. */
export function CatalogResults({sidebarId, sidebarTitle, sidebar, headingId, heading, headingRef, resultsRef, pending, status, filterLabel, filterButton, openFilters, chips, children}: CatalogResultsProps) {
 return <div className="catalog-layout">
  <aside className="catalog-sidebar" aria-labelledby={sidebarId}><h2 id={sidebarId}>{sidebarTitle}</h2>{sidebar}</aside>
  <section ref={resultsRef} className="catalog-results" aria-labelledby={headingId} aria-busy={pending}>
   <h2 className="discovery-sr-only" id={headingId} tabIndex={-1} ref={headingRef}>{heading}</h2>
   <div className="catalog-results-head">
    <p className="catalog-count" role="status" aria-atomic="true">{status}</p>
    <button ref={filterButton} className="ds-button ds-secondary catalog-filter-trigger" type="button" aria-haspopup="dialog" onClick={openFilters}><SlidersHorizontal size={18} aria-hidden="true"/>{filterLabel}</button>
   </div>
   <div className="catalog-active">{chips}</div>
   {children}
  </section>
 </div>;
}
