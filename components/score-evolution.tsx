'use client';
import {useState} from 'react';
import type {BoxData} from '../lib/live-boxscore';
import {gameEvolution} from '../lib/game-evolution';
export default function ScoreEvolution({data}:{data:BoxData}){
 const model=gameEvolution(data),[selected,setSelected]=useState<number|null>(null),points=model.points;
 if(points.length<2)return <section className="card sl-evolution"><h3>Evolución del marcador</h3><p>El gráfico aparecerá cuando haya suficientes jugadas publicadas.</p></section>;
 const maxX=Math.max(points.at(-1)!.seconds,720),maxY=Math.max(...points.flatMap(p=>[p.awayScore,p.homeScore]),10),x=(v:number)=>56+v/maxX*690,y=(v:number)=>230-v/maxY*190,index=Math.min(selected??points.length-1,points.length-1),point=points[index];
 return <section className="card sl-evolution" aria-label="Evolución del marcador"><header><h3>Evolución del marcador</h3><span><i className="sl-away-dot"/>{data.game.away}<i className="sl-home-dot"/>{data.game.home}</span></header><svg viewBox="0 0 790 270" role="img" aria-label={'Marcador a lo largo del partido: '+data.game.away+' '+point.awayScore+', '+data.game.home+' '+point.homeScore}>
 {[0,1,2,3,4].map(i=><g key={i}><line x1="56" x2="746" y1={y(maxY*i/4)} y2={y(maxY*i/4)} stroke="currentColor" opacity=".13"/><text x="42" y={y(maxY*i/4)+5} textAnchor="end">{Math.round(maxY*i/4)}</text></g>)}
 {Array.from({length:Math.max(1,Math.ceil(maxX/720))},(_,i)=><text key={i} x={x(Math.min((i+.5)*720,maxX))} y="258" textAnchor="middle">{i<4?'C'+(i+1):'TE'}</text>)}
 <polyline fill="none" stroke="#8995ff" strokeWidth="4" points={points.map(p=>x(p.seconds)+','+y(p.awayScore)).join(' ')}/><polyline fill="none" stroke="#35bfa0" strokeWidth="4" points={points.map(p=>x(p.seconds)+','+y(p.homeScore)).join(' ')}/>
 <line x1={x(point.seconds)} x2={x(point.seconds)} y1="25" y2="230" stroke="currentColor" strokeDasharray="4 5" opacity=".55"/><circle cx={x(point.seconds)} cy={y(point.awayScore)} r="6" fill="#8995ff"/><circle cx={x(point.seconds)} cy={y(point.homeScore)} r="6" fill="#35bfa0"/>
 </svg><div className="sl-evolution-readout"><b>{data.game.away} {point.awayScore} - {point.homeScore} {data.game.home}</b><span>{point.period<5?'C'+point.period:'TE'+(point.period-4)} · {point.clock}</span></div><input type="range" min={0} max={points.length-1} value={index} aria-label="Explorar el marcador jugada a jugada" onChange={e=>setSelected(Number(e.target.value))}/><div className="sl-evolution-facts"><span>Mayor ventaja <b>{data.game.away} +{model.awayLead}</b></span><span>Cambios de líder <b>{model.changes}</b></span><span>Parcial reciente <b>{model.recent?model.recent.away+' - '+model.recent.home:'—'}</b></span></div><small>Calculado sobre las jugadas disponibles. Deslizá para explorar cada momento.</small></section>;
}
