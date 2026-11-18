'use client';
import {useEffect,type RefObject} from 'react';
export function useFilterDrawer(ref:RefObject<HTMLElement|null>,open:boolean){
 useEffect(()=>{
  if(!open)return;
  const panel=ref.current,prior=document.activeElement,overflow=document.body.style.overflow;
  if(!panel)return;
  const background=[...document.querySelectorAll<HTMLElement>('.topbar,.sidebar,.main-grid > main,.live-score-dock')].map(el=>({el,inert:el.inert}));
  background.forEach(({el})=>{el.inert=true;});document.body.style.overflow='hidden';
  const frame=requestAnimationFrame(()=>panel.querySelector<HTMLElement>('button')?.focus());
  function trap(e:KeyboardEvent){if(e.key!=='Tab')return;const nodes=panel!.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled)');const first=nodes[0],last=nodes[nodes.length-1];if(!first)return;if(e.shiftKey&&(document.activeElement===first||!panel!.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!panel!.contains(document.activeElement))){e.preventDefault();first.focus();}}
  document.addEventListener('keydown',trap);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',trap);background.forEach(({el,inert})=>{el.inert=inert;});document.body.style.overflow=overflow;if(prior instanceof HTMLElement&&prior.isConnected)prior.focus();};
 },[ref,open]);
}
