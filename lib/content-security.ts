export function contentSecurityPolicy(nonce:string,development=false){
 if(!/^[A-Za-z0-9+/=_-]+$/.test(nonce))throw Error('Nonce no válido');
 return [`default-src 'self'`,`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development?" 'unsafe-eval'":''}`,`style-src 'self' 'unsafe-inline'`,`img-src 'self' data: blob: https://cdn.nba.com`,`font-src 'self'`,`connect-src 'self'${development?' ws: wss:':''}`,`frame-src 'none'`,`frame-ancestors 'none'`,`object-src 'none'`,`base-uri 'self'`,`form-action 'self'`,...(!development?['upgrade-insecure-requests']:[])].join('; ');
}
