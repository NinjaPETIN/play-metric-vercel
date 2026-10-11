import {authorizePlayer,PlanError} from '../../../lib/account-plan';
import {loadDashboard} from '../../../lib/provider';
import {isCompetition} from '../../../lib/competitions';
import {getChatGPTUser} from '../../chatgpt-auth';
export async function GET(req:Request){
 if(!await getChatGPTUser())return Response.json({error:'Iniciá sesión.'},{status:401});
 const q=new URL(req.url).searchParams,action=q.get('action'),season=q.get('season'),competition=q.get('competition')??'regular';
 if(!isCompetition(competition)||(season&&!/^20\d{2}$/.test(season)))return Response.json({error:'Temporada o competición no válida'},{status:400});
 try{const data=await loadDashboard(season?Number(season):undefined,competition);
 if(action==='status'||action==='seasons')return Response.json({configured:true,provider:'nba_api',seasons:data.seasons,competition});
 if(action==='search'){const search=q.get('search')?.trim()??'';if(search.length<3||search.length>60)return Response.json({error:'Ingresá entre 3 y 60 caracteres.'},{status:400});const key=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return Response.json({players:data.players.filter(p=>key(p.name).includes(key(search))).map(p=>({id:Number(p.id),name:p.name})).slice(0,30)});}
 if(action==='stats'){const id=q.get('id')??'';if(!/^\d{1,8}$/.test(id))return Response.json({error:'Jugador no válido'},{status:400});const p=data.players.find(p=>p.id===id);if(p)await authorizePlayer(id);return p?Response.json({source:data.source,season:data.season,competition,games:p.games,fetchedAt:data.fetchedAt}):Response.json({error:'Jugador no encontrado'},{status:404});}
 return Response.json({error:'Acción no válida'},{status:400});
 }catch(e){if(e instanceof PlanError)return Response.json({error:e.message},{status:e.status});return Response.json({error:'Historial no disponible.'},{status:503});}
}
