export const LIVE_POLL_MS=15000;
export const LIVE_CACHE_MS=10000;
// These endpoints expose public game data and perform no account operations.
export function publicLiveRead(path:string,method:string){return method==='GET'&&/^\/api\/nba\/live(?:\/\d{10})?\/?$/.test(path);}
