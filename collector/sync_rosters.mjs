import {writeFile} from 'node:fs/promises';
import {collectRoster} from './roster-source.mjs';
async function json(url,options={}){for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(url,{...options,signal:AbortSignal.timeout(25000),redirect:'error'});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.json();}catch(e){if(attempt===2)throw e;await new Promise(resolve=>setTimeout(resolve,1000*2**attempt));}}}
const snapshot=await collectRoster(json);
const {players}=snapshot;
if(process.env.ROSTER_OUTPUT)await writeFile(process.env.ROSTER_OUTPUT,JSON.stringify(snapshot));
if(process.argv.includes('--upload')){
 const origin=new URL(process.env.PLAY_METRIC_URL??''),token=process.env.PLAY_METRIC_SERVICE_TOKEN;
 if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.username||origin.password||origin.search||origin.hash||!token||token.length<32)throw Error('Origen o credencial de servicio no válido');
 const receipt=await json(new URL('/api/nba/roster',origin),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(snapshot)});
 if(!receipt.verified||receipt.fetchedAt!==snapshot.fetchedAt||receipt.players!==players.length||receipt.teams!==30)throw Error('No se verificó la importación');
 const check=await json(new URL('/api/nba/roster',origin));if(check.fetchedAt!==snapshot.fetchedAt||JSON.stringify(check.players)!==JSON.stringify(players))throw Error('La lectura posterior no coincide');
}
console.log(`Plantillas NBA: 30 equipos, ${players.length} jugadores; comprobación ${snapshot.fetchedAt}.`);
