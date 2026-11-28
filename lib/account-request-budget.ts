import {consumeBudget} from './metrics-budget';
import {PlanError} from './account-plan';
export async function accountRequestBudget(userId:string,bucket:'visits'|'references'|'participation',limit=120){
 if(!await consumeBudget('account:'+bucket+':'+userId,limit,60000))throw new PlanError(429,'Muchas solicitudes juntas. Esperá un minuto y volvé a intentar.');
}
