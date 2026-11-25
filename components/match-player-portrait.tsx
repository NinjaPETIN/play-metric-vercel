'use client';
import NextImage from 'next/image';
import {nbaPlayerId} from '../lib/player-identity';
export default function MatchPlayerPortrait({person}:{person:{name:string}}){const id=nbaPlayerId(person.name);return <span className="live-box-portrait"><span>{person.name.split(' ').map(s=>s[0]).slice(0,2).join('')}</span>{id&&<NextImage sizes="64px" width={260} height={190} src={'https://cdn.nba.com/headshots/nba/latest/260x190/'+id+'.png'} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none';}}/>}</span>;}
