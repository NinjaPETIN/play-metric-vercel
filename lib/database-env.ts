import {createClient,type Client,type InValue,type ResultSet} from '@libsql/client';
let client:Client|undefined;
export function databaseClient(){if(!client){const url=process.env.TURSO_DATABASE_URL;if(!url)throw new Error('Falta TURSO_DATABASE_URL');client=createClient({url,authToken:process.env.TURSO_AUTH_TOKEN});}return client;}
function result(r:ResultSet){return {success:true,results:r.rows.map(row=>Object.fromEntries(r.columns.map((col,i)=>[col,row[i]]))),meta:{changes:r.rowsAffected,last_row_id:Number(r.lastInsertRowid??0)}};}
export class Statement {
 constructor(readonly sql:string,readonly args:InValue[]=[]){ }
 bind(...args:InValue[]){return new Statement(this.sql,args);}
 async all<T=Record<string,unknown>>(){return result(await databaseClient().execute({sql:this.sql,args:this.args})) as {success:boolean;results:T[];meta:{changes:number;last_row_id:number}};}
 async first<T=Record<string,unknown>>(column?:string):Promise<T|null>{const r=await this.all<T>();return r.results.length?(column?(r.results[0] as Record<string,unknown>)[column] as T:r.results[0]):null;}
 async raw(){const r=await databaseClient().execute({sql:this.sql,args:this.args});return r.rows.map(row=>r.columns.map((_,i)=>row[i]));}
 async run(){return this.all();}
}
export const database={prepare(sql:string){return new Statement(sql);},async batch(statements:Statement[]){return (await databaseClient().batch(statements.map(s=>({sql:s.sql,args:s.args})),'write')).map(result);}};
// Preserve existing SQLite queries and atomic batches through a tested D1-compatible adapter.
export const env={get DB(){return database as unknown as D1Database;}};
