import {PlanError} from './account-plan';
import {publicRead,samplePlayer} from './public-access';
import {entitledDashboard} from './data-entitlements';
import {catalogOptions} from './catalog-options';
type Dependencies={user:()=>Promise<unknown|null>;plan:()=>Promise<{plan:string}>;authorize:(id:string)=>Promise<{plan:string}>;read:()=>Promise<any>};
export async function scopedNbaRead(path:string[],url:string,deps:Dependencies){
 const user=await deps.user(),individual=path[0]==='players'&&!!path[1],example=individual&&samplePlayer(path[1],new URL(url).searchParams.get('competition')??'regular');
 if(!user&&!publicRead(path,url))throw new PlanError(401,'Creá tu cuenta gratuita para consultar este jugador.');
 const account=user?(individual&&!example?await deps.authorize(path[1]):await deps.plan()):null;
 if(individual&&path[2]==='league-context'&&account?.plan!=='pro')throw new PlanError(403,'La comparativa con la liga está disponible en Pro.');
 const catalog=individual?undefined:catalogOptions(url);
 const data=await deps.read();
 if(individual&&path[2]==='traits'&&account?.plan!=='pro')return {...data,sources:{zones:data.sources?.zones??null}};
 return entitledDashboard(data,{individual,example,pro:account?.plan==='pro',catalog});
}
