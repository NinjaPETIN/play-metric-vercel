import type {BoxData} from './live-boxscore';
type Play=NonNullable<BoxData['context']>['plays'][number];
export function recentCourt(plays:Play[],teams:readonly string[]){
 // Source order preserves the order of events sharing the same clock.
 const action=plays.at(-1);
 const timeout=!!action&&/\btime[\s-]?out\b/i.test(action.text)&&!/\b(violation|technical)\b/i.test(action.text);
 return {action,timeout,timeoutTeam:timeout&&action?.team&&teams.includes(action.team)?action.team:null};
}
