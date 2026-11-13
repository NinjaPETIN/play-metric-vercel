import type {Calendar} from './nba-snapshot';

type Game=Calendar['games'][number];
export type TeamRecord={wins:number;losses:number};
export type MatchRecords={away:TeamRecord;home:TeamRecord};

export function recordsBeforeMatch(games:Game[],match:Game):MatchRecords|null {
 if(match.competition!=='regular')return null;
 const records={away:{wins:0,losses:0},home:{wins:0,losses:0}};
 const seen=new Set<string>();
 for(const game of games){
  const earlier=game.date<match.date || (game.date===match.date&&game.startsAt&&match.startsAt&&Date.parse(game.startsAt)<Date.parse(match.startsAt));
  if(!earlier||game.id===match.id||game.competition!=='regular'||game.status!==3||seen.has(game.id))continue;
  if(game.awayScore===null||game.homeScore===null||game.awayScore===game.homeScore)continue;
  seen.add(game.id);
  const winner=game.awayScore>game.homeScore?game.away:game.home;
  for(const side of ['away','home'] as const){
   if(match[side]!==game.away&&match[side]!==game.home)continue;
   records[side][match[side]===winner?'wins':'losses']++;
  }
 }
 return records;
}

export function recordWithResult(record:TeamRecord,score:number|null,opponentScore:number|null):TeamRecord {
 if(score===null||opponentScore===null||score===opponentScore)return record;
 return {wins:record.wins+Number(score>opponentScore),losses:record.losses+Number(score<opponentScore)};
}
