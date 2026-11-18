import directory from '../../../../../lib/player-directory.json';
import {cachedNbaRead} from '../../../../../lib/read-cache';
import {loadDashboard} from '../../../../../lib/provider';
const known=new Set(directory.map(p=>String(p.id)));
export const maxDuration=15;
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^\d{1,10}$/.test(id))return new Response(null,{status:404});
 try{
  if(!known.has(id)){const catalog=await cachedNbaRead('headshot-catalog',()=>loadDashboard(undefined,'regular',true));if(!catalog.players.some(p=>p.id===id))return new Response(null,{status:404});}
  const large=new URL(req.url).searchParams.get('size')==='large';
  let response=await fetch('https://cdn.nba.com/headshots/nba/latest/'+(large?'1040x760':'260x190')+'/'+id+'.png',{signal:AbortSignal.timeout(large?6000:9000),next:{revalidate:86400}}).catch(()=>null);
  if(large&&(!response?.ok||!response.headers.get('content-type')?.startsWith('image/')))response=await fetch('https://cdn.nba.com/headshots/nba/latest/260x190/'+id+'.png',{signal:AbortSignal.timeout(5000),next:{revalidate:86400}});
  if(!response?.ok||!response.headers.get('content-type')?.startsWith('image/'))return new Response(null,{status:404});
  const bytes=await response.arrayBuffer();if(bytes.byteLength>2_000_000)return new Response(null,{status:413});
  return new Response(bytes,{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response(null,{status:503});}
}
