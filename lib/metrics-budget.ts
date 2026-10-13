import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import {database} from './database-env';
export async function consumeBudget(scope:string,limit:number,windowMs:number,now=Date.now()){
 const window=Math.floor(now/windowMs),expiresAt=new Date((window+2)*windowMs).toISOString();
 const row=await database.prepare("INSERT INTO provider_cache(key,payload,expires_at) VALUES (?,json_object('window',?,'n',1),?) ON CONFLICT(key) DO UPDATE SET payload=CASE WHEN json_extract(payload,'$.window')<>? THEN json_object('window',?,'n',1) ELSE json_set(payload,'$.n',json_extract(payload,'$.n')+1) END,expires_at=? WHERE json_extract(payload,'$.window')<>? OR json_extract(payload,'$.n')<? RETURNING key").bind('pm:limit:metrics:'+scope,window,expiresAt,window,window,expiresAt,window,limit).first();
 return !!row;
}
export function connectionHash(req:Request,secret:string,now=Date.now(),vercel=process.env.VERCEL==='1'){
 // These forwarding headers are trusted only when deployed behind Vercel.
 const raw=vercel?(req.headers.get('x-vercel-forwarded-for')??req.headers.get('x-forwarded-for')??'').split(',')[0].trim():'';
 const ip=isIP(raw)?raw:'unknown';
 return createHmac('sha256',secret).update('metrics-connection:'+Math.floor(now/86400_000)+':'+ip).digest('hex');
}
