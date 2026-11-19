'use client';
import {useEffect,type RefObject} from 'react';
type Position={windowY:number;mainY:number;at:number};
export function useNavigationPosition(ref:RefObject<HTMLElement|null>,ready:boolean,scope:string){
 useEffect(()=>{
  if(!ready)return;
  const key='statlane:position:v1:'+scope;
  const main=ref.current;
  let writeFrame=0,frame=0,attempts=0,restored=false,stopped=false,leaving=false;
  const prior=history.scrollRestoration;
  history.scrollRestoration='manual';
  let saved:Position|null=null;
  try{const raw=JSON.parse(sessionStorage.getItem(key)??'null');if(raw&&[raw.windowY,raw.mainY,raw.at].every(Number.isFinite)&&raw.windowY>=0&&raw.mainY>=0&&raw.windowY<1e7&&raw.mainY<1e7&&Date.now()-raw.at<86400000)saved=raw;}catch{}
  function save(){if(!restored||leaving)return;try{sessionStorage.setItem(key,JSON.stringify({windowY:window.scrollY,mainY:main?.scrollTop??0,at:Date.now()}));}catch{}}
  function rememberNavigation(){save();leaving=true;cancelAnimationFrame(writeFrame);}
  function captureClick(event:MouseEvent){save();const link=event.target instanceof Element?event.target.closest('a[href]'):null;if(link instanceof HTMLAnchorElement&&(!link.target||link.target==='_self')&&link.origin===location.origin&&link.pathname+link.search!==location.pathname+location.search)rememberNavigation();}
  function scheduleSave(){if(!writeFrame)writeFrame=requestAnimationFrame(()=>{writeFrame=0;save();});}
  function restore(){
   if(stopped)return;
   const enough=!saved||(document.documentElement.scrollHeight-innerHeight>=saved.windowY-2&&(main?.scrollHeight??0)-(main?.clientHeight??0)>=saved.mainY-2);
   if(enough||attempts++>=180){if(saved){window.scrollTo({top:saved.windowY,behavior:'instant'});main?.scrollTo({top:saved.mainY,behavior:'instant'});}restored=true;return;}
   frame=requestAnimationFrame(restore);
  }
  function stop(){stopped=true;restored=true;cancelAnimationFrame(frame);}
  frame=requestAnimationFrame(restore);
  main?.addEventListener('scroll',scheduleSave,{passive:true});window.addEventListener('scroll',scheduleSave,{passive:true});window.addEventListener('pagehide',save);window.addEventListener('statlane:remember-position',rememberNavigation);
  document.addEventListener('click',captureClick,true);window.addEventListener('wheel',stop,{passive:true,once:true});window.addEventListener('touchstart',stop,{passive:true,once:true});
  return()=>{save();cancelAnimationFrame(frame);cancelAnimationFrame(writeFrame);main?.removeEventListener('scroll',scheduleSave);window.removeEventListener('scroll',scheduleSave);window.removeEventListener('pagehide',save);window.removeEventListener('statlane:remember-position',rememberNavigation);document.removeEventListener('click',captureClick,true);window.removeEventListener('wheel',stop);window.removeEventListener('touchstart',stop);history.scrollRestoration=prior;};
 },[ref,ready,scope]);
}
