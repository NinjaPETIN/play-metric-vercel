import {PlanError} from './account-plan';
const forbidden=new Set(['__proto__','prototype','constructor']);
function validateTree(root:unknown){
 const pending:{value:unknown;depth:number}[]=[{value:root,depth:0}];let nodes=0;
 while(pending.length){const {value,depth}=pending.pop()!;if(++nodes>4000||depth>12)throw new PlanError(400,'Solicitud demasiado compleja.');if(!value||typeof value!=='object')continue;for(const [key,child] of Object.entries(value)){if(forbidden.has(key))throw new PlanError(400,'Campo no válido.');pending.push({value:child,depth:depth+1});}}
}
export async function accountJson(req:Request,maxBytes=8192,timeoutMs=10000){
 if(req.headers.get('origin')!==new URL(req.url).origin||req.headers.get('sec-fetch-site')==='cross-site')throw new PlanError(403,'Origen no válido.');
 if(req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new PlanError(415,'Se requiere JSON.');
 const declared=req.headers.get('content-length');if(declared!==null&&!/^\d+$/.test(declared))throw new PlanError(400,'Tamaño no válido.');
 if(Number(declared)>maxBytes)throw new PlanError(413,'Solicitud demasiado grande.');
 const reader=req.body?.getReader();if(!reader)throw new PlanError(400,'Solicitud vacía.');
 let timer:ReturnType<typeof setTimeout>|undefined;
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new PlanError(408,'La solicitud tardó demasiado.'));void reader.cancel().catch(()=>{});},timeoutMs);});
 let length=0;const parts:Uint8Array[]=[];
 try{
  while(true){const part=await Promise.race([reader.read(),deadline]);if(part.done)break;length+=part.value.byteLength;if(length>maxBytes){void reader.cancel().catch(()=>{});throw new PlanError(413,'Solicitud demasiado grande.');}parts.push(part.value);}
  const joined=new Uint8Array(length);let offset=0;for(const part of parts){joined.set(part,offset);offset+=part.length;}
  const body:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(joined));
  if(!body||typeof body!=='object'||Array.isArray(body))throw new PlanError(400,'Solicitud no válida.');
  validateTree(body);return body as Record<string,unknown>;
 }catch(e){if(e instanceof PlanError)throw e;throw new PlanError(400,'Solicitud no válida.');}
 finally{clearTimeout(timer);reader.releaseLock();}
}
