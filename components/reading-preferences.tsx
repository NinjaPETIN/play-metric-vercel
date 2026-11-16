'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const key = 'statlane:reading-preferences';
const defaults = { statsOnly: false, pauseUntil: 0 };
type PreferencesValue = typeof defaults;
type AccountPreferences = { preferences: PreferencesValue | null; authenticated: boolean };
const endpoint = '/api/account/reading-preferences';
const Preferences = createContext({ ...defaults, reduced: false, now: 0, syncError: false, setStatsOnly: (_value: boolean) => {}, pause: (_days: number) => {} });

function localPreferences(): PreferencesValue {
 try {
  const raw = JSON.parse(localStorage.getItem(key) ?? 'null');
  return { statsOnly: raw?.statsOnly === true, pauseUntil: Number.isFinite(raw?.pauseUntil) ? raw.pauseUntil : 0 };
 } catch { return defaults; }
}

async function accountPreferences(patch?: Partial<PreferencesValue>): Promise<AccountPreferences | null> {
 try {
  const response = await fetch(endpoint, patch ? {
   method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  } : { cache: 'no-store' });
  return response.ok ? await response.json() : null;
 } catch { return null; }
}

export function ReadingPreferencesProvider({ children }: { children: ReactNode }) {
 const [prefs, setPrefs] = useState(defaults);
 const [now, setNow] = useState(0);
 const [syncError, setSyncError] = useState(false);
 const pending = useRef<Partial<PreferencesValue>>({});
 const syncing = useRef(false);
 const sync = useRef<() => Promise<void>>(async () => {});
 const mounted = useRef(false);

 useEffect(() => {
  mounted.current = true;
  sync.current = async () => {
   if (syncing.current || document.hidden) return;
   syncing.current = true;
   const patch = pending.current;
   const remote = await accountPreferences();
   try {
    if (!mounted.current || patch !== pending.current) return;
    if (!remote) {
     setSyncError(Object.keys(patch).length > 0);
     return;
    }
    if (!remote.authenticated) {
     pending.current = {};
     setSyncError(false);
     return;
    }
    const local = localPreferences();
    const migration = !remote.preferences && (local.statsOnly || local.pauseUntil > Date.now())
     ? { ...local, pauseUntil: local.pauseUntil > Date.now() ? local.pauseUntil : 0 }
     : {};
    const changes = { ...migration, ...patch };
    const saved = Object.keys(changes).length ? await accountPreferences(changes) : remote;
    if (!mounted.current || patch !== pending.current) return;
    if (!saved) {
     setSyncError(true);
     return;
    }
    pending.current = {};
    setSyncError(false);
    if (saved.preferences) {
     const next = { ...saved.preferences, pauseUntil: Math.max(local.pauseUntil, saved.preferences.pauseUntil) };
     setPrefs(next);
     try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
    }
   } finally {
    syncing.current = false;
    if (mounted.current && Object.keys(pending.current).length && patch !== pending.current) void sync.current();
   }
  };
  function refresh() {
   setNow(Date.now());
   setPrefs(localPreferences());
   void sync.current();
  }
  const initial = window.setTimeout(refresh, 0);
  const tick = window.setInterval(() => {
   setNow(Date.now());
   void sync.current();
  }, 30000);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('storage', refresh);
  return () => {
   mounted.current = false;
   clearTimeout(initial);
   clearInterval(tick);
   window.removeEventListener('focus', refresh);
   document.removeEventListener('visibilitychange', refresh);
   window.removeEventListener('storage', refresh);
  };
 }, []);

 function save(patch: Partial<PreferencesValue>) {
  const next = { ...prefs, ...patch };
  pending.current = { ...pending.current, ...patch };
  setNow(Date.now());
  setPrefs(next);
  try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  void sync.current();
 }

 return <Preferences.Provider value={{ ...prefs, now, syncError, reduced: prefs.statsOnly || prefs.pauseUntil > now,
  setStatsOnly: statsOnly => save({ statsOnly }), pause: days => save({ pauseUntil: Date.now() + days * 86400000 }) }}>
  {children}
 </Preferences.Provider>;
}

export function useReadingPreferences() { return useContext(Preferences); }

const resources={
 nacional:{name:'Argentina · recursos por provincia',url:'https://www.argentina.gob.ar/node/9653'},
 caba:{name:'Ciudad de Buenos Aires',url:'https://juegosegurolegal.gob.ar/?id=20&page=noticia'},
 gba:{name:'Provincia de Buenos Aires',url:'https://www.loteria.gba.gov.ar/index.php?id=133'},
};

export function ReadingControls({compact=false}:{compact?:boolean}){
 const {statsOnly,setStatsOnly,pauseUntil,pause,now,syncError}=useReadingPreferences();
 const [region,setRegion]=useState<keyof typeof resources>('nacional');
 const paused=pauseUntil>now;
 return <details className={'reading-controls'+(compact?' reading-controls-compact':'')}>
  <summary>Modo de lectura y pausa</summary>
  <div>
   <label><input type="checkbox" checked={statsOnly} onChange={e=>setStatsOnly(e.target.checked)}/> Solo estadísticas</label>
   <p>Oculta rankings por referencia, notas del cruce y alertas. Tus preferencias se sincronizan al iniciar sesión.</p>
   {syncError&&<p role="status">El cambio se guardó en este navegador. La sincronización se reintentará.</p>}<strong>Tomar una pausa</strong>
   {paused ? <p role="status">Pausa activa hasta el {new Date(pauseUntil).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',dateStyle:'short',timeStyle:'short'})} (Argentina).</p> : <div className="reading-actions">
    <button type="button" className="button subtle" onClick={()=>pause(1)}>Pausar 24 horas</button>
    <button type="button" className="button subtle" onClick={()=>pause(7)}>Pausar 7 días</button>
   </div>}
   <label>Recursos de ayuda <select value={region} onChange={e=>setRegion(e.target.value as keyof typeof resources)}>
    {Object.entries(resources).map(([id,item])=><option key={id} value={id}>{item.name}</option>)}
   </select></label>
   <a href={resources[region].url} target="_blank" rel="noreferrer">Ver orientación sobre juego problemático ↗</a>
  </div>
 </details>;
}
