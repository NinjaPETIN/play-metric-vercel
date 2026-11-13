import type {BoxData} from './live-boxscore';

type Play = NonNullable<BoxData['context']>['plays'][number];
export type Shot = {made: boolean; value: 1 | 2 | 3};

export function classifyShot(text: string, shooting: boolean | undefined, points: number): Shot | null {
 const freeThrow = /\bfree throw\b/i.test(text);
 const missed = /\bmisses\b/i.test(text);
 if (shooting !== true && !freeThrow) return null;
 if (points >= 1 && points <= 3) return {made: true, value: points as Shot['value']};
 if (!missed) return null;
 return {made: false, value: freeThrow ? 1 : /\bthree[ -]point\b/i.test(text) ? 3 : 2};
}

export function playerShots(plays: Play[], playerId: string, period: number | null) {
 return plays.flatMap(play => {
  if (play.athleteId !== playerId || (period !== null && play.period !== period)) return [];
  const shot = play.shot === undefined
   ? classifyShot(play.text,!!play.shotLocation || /\b(makes|misses)\b/i.test(play.text),play.pointsAdded ?? 0)
   : play.shot;
  return shot ? [{...play,shot}] : [];
 });
}
