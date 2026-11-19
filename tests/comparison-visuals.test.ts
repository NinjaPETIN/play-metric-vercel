import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ComparisonCharts from '../components/comparison-charts';
import type {Player} from '../lib/data';
import type {Game} from '../lib/analytics';
const player=(id:string)=>({id,name:'Jugador '+id}) as Player;
const game=(points:number,steals?:number)=>({date:'2026-11-18',played:true,minutes:30,opponent:'BOS',home:true,points,rebounds:3,assists:4,threes:0,steals}) as Game;
test('rendered comparisons use identical geometry and distinguish missing statistics from recorded zeroes',()=>{
 const props={players:[player('1'),player('2')],samples:[[game(10)],[game(30)]],market:'points' as const,line:15,side:'over' as const};
 const html=renderToStaticMarkup(createElement(ComparisonCharts,props));
 const heights=[...html.matchAll(/class="ux-chart-column" style="height:([0-9.]+)%"/g)].map(match=>Number(match[1]));
 assert.equal(heights.length,2);assert.ok(Math.abs(heights[0]/heights[1]-1/3)<1e-8);assert.ok(heights[1]<100);assert.match(html,/Escala común/);
 const missing=renderToStaticMarkup(createElement(ComparisonCharts,{...props,market:'steals',line:1,samples:[[game(10)],[game(10,0)]]}));
 assert.equal([...missing.matchAll(/class="ux-chart-column"/g)].length,1);assert.match(missing,/No hay registros de/);assert.match(missing,/height:1%/);
});
