'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const key = 'statlane:reading-preferences';
const defaults = { statsOnly: false, pauseUntil: 0 };
const Preferences = createContext({ ...defaults, reduced: false, now: 0, setStatsOnly: (_value: boolean) => {}, pause: (_days: number) => {} });

export function ReadingPreferencesProvider({children}:{children:ReactNode}) {
 const [prefs,setPrefs]=useState(defaults);
 const [now,setNow]=useState(0);
 useEffect(()=>{
  function read() {
   setNow(Date.now());
   try {
    const raw=JSON.parse(localStorage.getItem(key)??'null');
    setPrefs({statsOnly:raw?.statsOnly===true,pauseUntil:Number.isFinite(raw?.pauseUntil)?raw.pauseUntil:0});
   } catch { setPrefs(defaults); }
  }
  const initial=window.setTimeout(read,0);
  const tick=window.setInterval(()=>setNow(Date.now()),15000);
  window.addEventListener('storage',read);
  window.addEventListener('focus',read);
  return ()=>{clearTimeout(initial);clearInterval(tick);window.removeEventListener('storage',read);window.removeEventListener('focus',read);};
 },[]);
 function save(next:typeof defaults){
  setNow(Date.now());
  setPrefs(next);
  try { localStorage.setItem(key,JSON.stringify(next)); } catch {}
 }
 return <Preferences.Provider value={{...prefs,now,reduced:prefs.statsOnly||prefs.pauseUntil>now,
  setStatsOnly:statsOnly=>save({...prefs,statsOnly}),pause:days=>save({...prefs,pauseUntil:Date.now()+days*86400000})}}>
  {children}
 </Preferences.Provider>;
}

export function useReadingPreferences(){return useContext(Preferences);}

const resources={
 nacional:{name:'Argentina · recursos por provincia',url:'https://www.argentina.gob.ar/node/9653'},
 caba:{name:'Ciudad de Buenos Aires',url:'https://juegosegurolegal.gob.ar/?id=20&page=noticia'},
 gba:{name:'Provincia de Buenos Aires',url:'https://www.loteria.gba.gov.ar/index.php?id=133'},
};

export function ReadingControls({compact=false}:{compact?:boolean}){
 const {statsOnly,setStatsOnly,pauseUntil,pause,now}=useReadingPreferences();
 const [region,setRegion]=useState<keyof typeof resources>('nacional');
 const paused=pauseUntil>now;
 return <details className={'reading-controls'+(compact?' reading-controls-compact':'')}>
  <summary>Modo de lectura y pausa</summary>
  <div>
   <label><input type="checkbox" checked={statsOnly} onChange={e=>setStatsOnly(e.target.checked)}/> Solo estadísticas</label>
   <p>Oculta rankings por referencia, notas del cruce y alertas. Tu elección se guarda en este navegador.</p>
   <strong>Tomar una pausa</strong>
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
