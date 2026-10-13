import {publicCatalog} from './public-access';
import {expandDashboard} from './compact-dashboard';
import {basicPlayer} from './account-plan';
import type {CatalogOptions} from './catalog-summary';
// Authorization is applied after reading the shared raw-data cache.
export function entitledDashboard(data:any,{individual,example,pro,catalog}:{individual:boolean;example:boolean;pro:boolean;catalog?:CatalogOptions}){
 if(!data.players)return data;
 if(!individual&&!example&&!pro)return publicCatalog(expandDashboard(data),catalog);
 return {...data,players:data.players.map((p:any)=>basicPlayer(p,pro&&individual))};
}
