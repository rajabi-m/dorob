'use client';

import {useEffect, useRef, useTransition} from 'react';
import {useRouter} from 'next/navigation';

/** Domain callers supply serialized URLs; this owns only browsing mechanics. */
export function useCatalogNavigation(page: number) {
 const router = useRouter();
 const [pending, startTransition] = useTransition();
 const dialog = useRef<HTMLDialogElement>(null);
 const filterButton = useRef<HTMLButtonElement>(null);
 const heading = useRef<HTMLHeadingElement>(null);
 const results = useRef<HTMLElement>(null);
 const previousPage = useRef(page);
 useEffect(() => {
  if (previousPage.current !== page) {
   heading.current?.focus({preventScroll: true});
   results.current?.scrollIntoView({block: 'start'});
  }
  previousPage.current = page;
 }, [page]);
 function navigate(url: string) {
  dialog.current?.close();
  startTransition(() => router.push(url, {scroll: false}));
 }
 function retry() { startTransition(() => router.refresh()); }
 function restoreFilterFocus() {
  // A queued native close event must not override committed pagination focus.
  if (document.activeElement !== heading.current) filterButton.current?.focus();
 }
 return {pending, dialog, filterButton, heading, results, navigate, retry, restoreFilterFocus};
}
