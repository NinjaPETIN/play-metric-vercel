'use client';
import {useState} from 'react';
import NextImage from 'next/image';
import {nbaPlayerId} from '../lib/player-identity';
function Portrait({id,name}:{id:string|null;name:string}){
 const [loaded,setLoaded]=useState(false),[lowResolution,setLowResolution]=useState(false),[failed,setFailed]=useState(false);
 return <span className="live-box-portrait">{(!loaded||failed||!id)&&<span aria-hidden="true">{name.split(' ').map(s=>s[0]).slice(0,2).join('')}</span>}{id&&!failed&&<NextImage sizes="180px" width={1040} height={760} src={'https://cdn.nba.com/headshots/nba/latest/'+(lowResolution?'260x190':'1040x760')+'/'+id+'.png'} alt="" loading="lazy" decoding="async" onLoad={()=>setLoaded(true)} onError={()=>{setLoaded(false);if(!lowResolution)setLowResolution(true);else setFailed(true);}}/>}</span>;
}
export default function MatchPlayerPortrait({person}:{person:{name:string}}){const id=nbaPlayerId(person.name);return <Portrait key={id??person.name} id={id} name={person.name}/>;}
