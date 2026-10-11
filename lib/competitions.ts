export const competitions={regular:{label:'Temporada regular',namespace:'nba_api'},preseason:{label:'Pretemporada',namespace:'nba_pre'},playoffs:{label:'Playoffs',namespace:'nba_post'}} as const;
export type Competition=keyof typeof competitions;
export const isCompetition=(v:string):v is Competition=>Object.hasOwn(competitions,v);
export const snapshotKey=(year:number,competition:Competition)=>competitions[competition].namespace+':'+year;
