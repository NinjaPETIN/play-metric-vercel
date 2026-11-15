const espn='https://site.api.espn.com/apis/site/v2/sports/basketball/nba/';

export async function readEspn(path:string) {
  const response=await fetch(espn+path,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
  if (!response.ok||!response.headers.get('content-type')?.includes('json')||!response.body) throw new Error('Resumen no disponible');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];
  let bytes=0;
  for (;;) {
    const part=await reader.read();
    if (part.done) break;
    bytes+=part.value.byteLength;
    if (bytes>2_000_000) {await reader.cancel();throw new Error('Resumen demasiado grande');}
    chunks.push(part.value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}


