// Keep the in-flight lease longer than the 8-second provider timeout.
export const LIVE_LEASE_MS=10000;
export const LIVE_POLL_MS=5000;
export const LIVE_CACHE_MS=5000;
// These endpoints expose public game data and perform no account operations.
export function publicLiveRead(path:string,method:string){return method==='GET'&&/^\/api\/nba\/live(?:\/\d{10})?\/?$/.test(path);}
