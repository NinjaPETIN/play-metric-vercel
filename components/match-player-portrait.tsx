'use client';
import directory from '../lib/player-directory.json';
const key=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const ids=new Map<string,string|null>();for(const p of directory){const name=key(p.name);ids.set(name,ids.has(name)?null:String(p.id));}
export default function MatchPlayerPortrait({person}:{person:{name:string}}){const id=ids.get(key(person.name));return <span className="live-box-portrait"><span>{person.name.split(' ').map(s=>s[0]).slice(0,2).join('')}</span>{id&&<img src={'https://cdn.nba.com/headshots/nba/latest/260x190/'+id+'.png'} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none';}}/>}</span>;}
