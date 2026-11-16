// Authentication, quota and plan checks run outside this shared NBA cache.
type Entry = { at: number; bytes: number; value: unknown };

const reads = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();
const freshMs = 60_000;
const staleMs = 15 * 60_000;
const maxEntries = 24;
const maxEntryBytes = 8_000_000;
const maxBytes = 24_000_000;
let storedBytes = 0;

function remove(key: string) {
 const entry = reads.get(key);
 if (entry) storedBytes -= entry.bytes;
 reads.delete(key);
}

function remember(key: string, value: unknown) {
 const bytes = Buffer.byteLength(JSON.stringify(value));
 if (bytes >= maxEntryBytes) return;
 remove(key);
 reads.set(key, { at: Date.now(), bytes, value });
 storedBytes += bytes;
 while (reads.size > maxEntries || storedBytes > maxBytes) remove(reads.keys().next().value!);
}

export function clearNbaReadCache(key?: string) {
 if (key) {
  remove(key);
  inFlight.delete(key);
 } else {
  reads.clear();
  inFlight.clear();
  storedBytes = 0;
 }
}

export async function cachedNbaRead<T>(key: string, read: () => Promise<T>, force = false): Promise<T> {
 const existing = reads.get(key);
 if (!force && existing && Date.now() - existing.at < freshMs) {
  reads.delete(key);
  reads.set(key, existing);
  return existing.value as T;
 }
 const active = inFlight.get(key);
 if (!force && active) return active as Promise<T>;
 const job: Promise<T> = read().then(value => {
  if (inFlight.get(key) === job) remember(key, value);
  return value;
 }).catch(error => {
  // Invalid requests, permission errors and quota errors always reach callers.
  const status = (error as { status?: number })?.status;
  if (!force && existing && Date.now() - existing.at < staleMs && (!status || status >= 500)) {
   return (typeof existing.value === 'object' && existing.value !== null
    ? { ...existing.value, dataStale: true }
    : existing.value) as T;
  }
  throw error;
 }).finally(() => {
  if (inFlight.get(key) === job) inFlight.delete(key);
 });
 inFlight.set(key, job);
 return job;
}

export function forceNbaRead(request: Request) {
 const cache = request.headers.get('cache-control') ?? '';
 return request.headers.get('x-playmetric-refresh') === '1' || cache.includes('no-cache') || cache.includes('no-store');
}
