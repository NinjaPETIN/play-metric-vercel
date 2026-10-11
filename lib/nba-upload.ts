import {createHash} from 'node:crypto';
export const UPLOAD_PART_BYTES=500_000;
export const UPLOAD_MAX_BYTES=16_000_000;
export function sha256(data:Uint8Array|string){return createHash('sha256').update(data).digest('hex')}
export function joinUpload(parts:string[],bytes:number,digest:string){const decoded=parts.map(p=>Buffer.from(p,'base64'));if(decoded.some(p=>p.length>UPLOAD_PART_BYTES)||decoded.reduce((n,p)=>n+p.length,0)!==bytes||bytes>UPLOAD_MAX_BYTES)throw new Error('Tamaño de lotes no válido.');const body=Buffer.concat(decoded);if(sha256(body)!==digest)throw new Error('La integridad del historial no coincide.');return body.toString('utf8')}
