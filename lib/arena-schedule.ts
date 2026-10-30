import type {Calendar} from './nba-snapshot';

export const argentinaDay=(iso:string)=>new Date(iso).toLocaleDateString('en-CA',{timeZone:'America/Argentina/Buenos_Aires'});

/** Pick an actual calendar day; never label the next available day as today. */
export function arenaSchedule(calendar:Calendar,now:string){
 const today=argentinaDay(now);
 const games=calendar.games.filter(g=>g.competition==='regular').map(g=>({game:g,day:g.startsAt?argentinaDay(g.startsAt):g.date}));
 const day=games.some(g=>g.day===today)?today:games.filter(g=>g.day>today).map(g=>g.day).sort()[0];
 return {today:day===today,day:day??null,games:day?games.filter(g=>g.day===day).map(g=>g.game).sort((a,b)=>(a.startsAt??a.date).localeCompare(b.startsAt??b.date)):[]};
}
