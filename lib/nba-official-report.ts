import {injuryReportUrl} from './match-availability';

export type OfficialReport={url:string;clock:string};

export function officialReportFromPage(html:string,date:string):OfficialReport|null{
 const reports=new Map<number,OfficialReport>();
 for(const match of html.matchAll(/https:\/\/official\.nba\.com\/referee\/injury\/Injury-Report_(\d{4}-\d{2}-\d{2})_(\d{2})_(\d{2})(AM|PM)\.pdf/gi)){
  const [url,day,h,m,suffix]=match;
  if(day!==date||Number(h)<1||Number(h)>12||Number(m)>59)continue;
  const hour=Number(h)%12+(suffix.toUpperCase()==='PM'?12:0);
  reports.set(hour*60+Number(m),{url,clock:String(hour).padStart(2,'0')+':'+m+' ET'});
 }
 const last=Math.max(-1,...reports.keys());
 return reports.get(last)??null;
}

export async function readOfficialReport(date:string){
 const response=await fetch(injuryReportUrl(date),{next:{revalidate:300},signal:AbortSignal.timeout(5000),redirect:'error'});
 if(!response.ok)return null;
 return officialReportFromPage(await response.text(),date);
}
