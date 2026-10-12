import {writeFile} from 'node:fs/promises';
const codes=['ATL','BOS','CLE','NOP','CHI','DAL','DEN','GSW','HOU','LAC','LAL','MIA','MIL','MIN','BKN','NYK','ORL','IND','PHI','PHX','POR','SAC','SAS','OKC','TOR','UTA','MEM','WAS','DET','CHA'];
async function json(url,options={}){for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(url,{...options,signal:AbortSignal.timeout(25000),redirect:'error'});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.json();}catch(e){if(attempt===2)throw e;await new Promise(resolve=>setTimeout(resolve,1000*2**attempt));}}}
const players=[],seen=new Set();
for(let i=0;i<codes.length;i++){
 const teamId=1610612737+i,team=codes[i],data=await json(`https://content-api-prod.nba.com/public/1/teams/${teamId}/roster`),rows=data.results?.roster;
 if(!Array.isArray(rows)||rows.length<10||rows.length>40)throw Error(`Plantilla incompleta: ${team}. Se conserva la generación anterior.`);
 for(const p of rows){if(p.teamId!==teamId||!Number.isSafeInteger(p.id)||p.id<=0||typeof p.name!=='string'||!p.name.trim()||seen.has(p.id))throw Error(`Plantilla inconsistente: ${team}. Se conserva la generación anterior.`);seen.add(p.id);players.push({id:String(p.id),name:p.name,team,position:p.position??''});}
}
const snapshot={source:'NBA.com',fetchedAt:new Date().toISOString(),players};
if(process.env.ROSTER_OUTPUT)await writeFile(process.env.ROSTER_OUTPUT,JSON.stringify(snapshot));
if(process.argv.includes('--upload')){
 const origin=new URL(process.env.PLAY_METRIC_URL??''),token=process.env.PLAY_METRIC_SERVICE_TOKEN;
 if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.username||origin.password||origin.search||origin.hash||!token||token.length<32)throw Error('Origen o credencial de servicio no válido');
 const receipt=await json(new URL('/api/nba/roster',origin),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(snapshot)});
 if(!receipt.verified||receipt.fetchedAt!==snapshot.fetchedAt||receipt.players!==players.length||receipt.teams!==30)throw Error('No se verificó la importación');
 const check=await json(new URL('/api/nba/roster',origin));if(check.fetchedAt!==snapshot.fetchedAt||JSON.stringify(check.players)!==JSON.stringify(players))throw Error('La lectura posterior no coincide');
}
console.log(`Plantillas NBA: 30 equipos, ${players.length} jugadores; comprobación ${snapshot.fetchedAt}.`);
