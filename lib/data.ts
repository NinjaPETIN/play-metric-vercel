import type {TraitsSnapshot} from './player-traits';
import type {LeagueContext} from './league-context';
import type {PlayerProfile} from './player-profile';
import {type Game,type Market} from './analytics';
export type Player={id:string;name:string;team:string;currentTeam?:string|null;rosterFetchedAt?:string;position:string;profile?:PlayerProfile|null;traits?:TraitsSnapshot|null;leagueContext?:LeagueContext;color:string;base:[number,number,number,number];lines:Record<Market,number>;games:Game[]};
