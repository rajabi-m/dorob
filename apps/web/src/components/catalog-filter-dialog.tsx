'use client';
import './catalog.css';
import type {ReactNode,RefObject} from 'react';
import {X} from 'lucide-react';

/** Native modal owns Escape; controls stay domain-specific at the call site. */
export function CatalogFilterDialog({dialog,trigger,id,title,closeLabel,children,restoreFocus}:{dialog:RefObject<HTMLDialogElement|null>;trigger:RefObject<HTMLButtonElement|null>;id:string;title:string;closeLabel:string;children:ReactNode;restoreFocus?:()=>void}){
 return <dialog ref={dialog} className="catalog-filter-dialog" aria-labelledby={id} onKeyDown={event=>{
  if(event.key!=='Tab')return;
  const controls=[...event.currentTarget.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex="0"]')].filter(node=>!node.hasAttribute('disabled')&&(!node.matches('input[type="radio"]')||(node as HTMLInputElement).checked));
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }} onClose={()=>restoreFocus?restoreFocus():trigger.current?.focus()} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}><div className="catalog-panel-heading"><h2 id={id}>{title}</h2><button autoFocus className="ds-compare" aria-label={closeLabel} onClick={()=>dialog.current?.close()}><X size={22} aria-hidden="true"/></button></div>{children}</dialog>;
}
