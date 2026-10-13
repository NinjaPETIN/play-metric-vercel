import {popularPlayers} from '../../../../lib/popular-players';
let cached:{at:number;ids:string[]}|undefined;
export async function GET(){try{if(!cached||Date.now()-cached.at>60_000)cached={at:Date.now(),ids:await popularPlayers()};return Response.json({playerIds:cached.ids,windowDays:7},{headers:{'Cache-Control':'public, max-age=60, s-maxage=60'}});}catch{return Response.json({error:'Ranking no disponible'},{status:503,headers:{'Cache-Control':'no-store'}});}}
