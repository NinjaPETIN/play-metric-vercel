const codes=['ATL','BOS','CLE','NOP','CHI','DAL','DEN','GSW','HOU','LAC','LAL','MIA','MIL','MIN','BKN','NYK','ORL','IND','PHI','PHX','POR','SAC','SAS','OKC','TOR','UTA','MEM','WAS','DET','CHA'];

/** @param {(url:string)=>Promise<any>} readJson */
export async function collectRoster(readJson) {
 const players=[],seen=new Set();
 for(let start=0;start<codes.length;start+=6){
  const batch=await Promise.all(codes.slice(start,start+6).map(async(team,offset)=>{
   const teamId=1610612737+start+offset;
   const data=await readJson(`https://content-api-prod.nba.com/public/1/teams/${teamId}/roster`);
   const rows=data.results?.roster;
   if(!Array.isArray(rows)||rows.length<10||rows.length>40)throw Error(`Plantilla incompleta: ${team}`);
   return {team,rows};
  }));
  for(const {team,rows} of batch)for(const p of rows){
   // The team's endpoint determines membership even if the embedded team ID is older.
   if(!Number.isSafeInteger(p.id)||p.id<=0||typeof p.name!=='string'||!p.name.trim()||seen.has(p.id))throw Error(`Plantilla inconsistente: ${team}`);
   seen.add(p.id);
   players.push({id:String(p.id),name:p.name,team,position:p.position??''});
  }
 }
 return {source:'NBA.com',fetchedAt:new Date().toISOString(),players};
}
