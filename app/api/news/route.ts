import {readNews} from '../../../lib/news-store';
export const dynamic='force-dynamic';
export const maxDuration=30;
export async function GET(req:Request){const q=new URL(req.url).searchParams;const player=q.get('player');if([...q.keys()].some(k=>k!=='player')||player&&!/^\d{1,10}$/.test(player))return Response.json({error:'Selección no válida'},{status:400});try{const feed=await readNews();return Response.json({...feed,articles:(player?feed.articles.filter(a=>a.playerIds.includes(player)):feed.articles).slice(0,40)},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({articles:[],status:'unavailable',provider:'GDELT',checkedAt:null,fetchedAt:null,lastAttempt:'failed'},{status:503,headers:{'Cache-Control':'no-store'}});}}
