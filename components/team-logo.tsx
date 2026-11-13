'use client';
import {memo,useState} from 'react';

import {teamLogoUrl} from '../lib/team-logo-url';

/** Official NBA marks, with a readable fallback if the CDN is unavailable. */
function TeamLogo({team,size=24}:{team:string;size?:number}){
 const code=team.toUpperCase();
 const [failedSource,setFailedSource]=useState('');
 const src=teamLogoUrl(code);
 return <span className="team-logo" style={{width:size,height:size}} aria-hidden="true">
 {src&&failedSource!==src?<img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" onError={()=>setFailedSource(src)}/>:<span className="team-logo-fallback">{code.slice(0,3)}</span>}
 </span>;
}

export default memo(TeamLogo);
