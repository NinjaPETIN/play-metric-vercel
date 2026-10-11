import PlayerTraitsCard from './player-traits-card';
import type {Player} from '../lib/data';
import {type Game,type Market} from '../lib/analytics';
import type {PlayerProfile} from '../lib/player-profile';
export default function EditorialContext({player,games,profile,market,opponent,fetchedAt,season,competition,filtered}:{player:Player;games:Game[];profile:PlayerProfile|null;market:Market;opponent:string;fetchedAt:string;season:number;competition:string;filtered:boolean}){
 return <div className="editorial-context"><PlayerTraitsCard id={player.id} name={player.name} games={games} season={season} competition={competition} filtered={filtered} initialTraits={player.traits} initialLeague={player.leagueContext}/></div>;
}
