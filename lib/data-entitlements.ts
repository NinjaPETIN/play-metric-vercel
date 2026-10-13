import {publicCatalog} from './public-access';
import {expandDashboard} from './compact-dashboard';
import {basicPlayer} from './account-plan';
// Authorization is applied after reading the shared raw-data cache.
export function entitledDashboard(data:any,{individual,example,pro}:{individual:boolean;example:boolean;pro:boolean}){
 if(!data.players)return data;
 if(!individual&&!example&&!pro)return publicCatalog(expandDashboard(data));
 return {...data,players:data.players.map((p:any)=>basicPlayer(p,pro&&individual))};
}
