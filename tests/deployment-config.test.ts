import test from 'node:test';
import assert from 'node:assert/strict';

test('Git deployment identifiers fit the hosting limit without changing response protections',async()=>{
 const previousId=process.env.NEXT_DEPLOYMENT_ID,previousSha=process.env.VERCEL_GIT_COMMIT_SHA;
 try{
  delete process.env.NEXT_DEPLOYMENT_ID;
  const sha='4cdc0d55ca6848d242f1db34012d713820517ee7';
  process.env.VERCEL_GIT_COMMIT_SHA=sha;
  const {default:config}=await import('../next.config');
  assert.equal(config.deploymentId?.length,32);
  assert.ok(sha.startsWith(config.deploymentId!));
  assert.equal(config.poweredByHeader,false);
  const headers=await config.headers!();
  assert.ok(headers.find(row=>row.source==='/api/:path*')?.headers.some(header=>header.key==='Cache-Control'&&header.value==='private, no-store'));
 }finally{
  if(previousId===undefined)delete process.env.NEXT_DEPLOYMENT_ID;else process.env.NEXT_DEPLOYMENT_ID=previousId;
  if(previousSha===undefined)delete process.env.VERCEL_GIT_COMMIT_SHA;else process.env.VERCEL_GIT_COMMIT_SHA=previousSha;
 }
});
