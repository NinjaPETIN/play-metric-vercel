'use client';

import { useEffect, useState } from 'react';
import { markets, type Market } from '../lib/analytics';
import { useReadingPreferences } from './reading-preferences';
import type {FrozenSample,freezeSample} from '../lib/research-context';

type Reference = { matchId: string; playerId: string; name: string; team: string; opponent: string; market: Market;
 line: number; side: 'over' | 'under'; savedAt: string; startsAt: string; snapshot?:ReturnType<typeof freezeSample>;note?:string };
type Row = Reference & { result: number | null; state: 'upcoming' | 'pending' | 'final' };
const date = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' });
const amount = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
const referenceLabel = (row: Reference) => (row.side === 'over' ? 'Más de ' : 'Menos de ') + amount(row.line);

export function SaveGameReference({ playerId, team, market, line, side, matchId, snapshot }: {
 playerId: string; team: string; market: Market; line: number; side: 'over' | 'under'; matchId?: string;snapshot?:FrozenSample;
}) {
 const { reduced } = useReadingPreferences();
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState('');
 if (reduced) return null;
 async function save() {
  setBusy(true);
  setMessage('');
  try {
   const response = await fetch('/api/account/game-references', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId, team, market, line, side, matchId, snapshot }),
   });
   const payload: { error?: string; reference?: Reference; alreadySaved?: boolean } = await response.json();
   const row = payload.reference;
   if (!response.ok || !row) throw Error(payload.error ?? 'No pudimos guardar la referencia.');
   setMessage((payload.alreadySaved ? 'Ya guardada: se conserva el análisis original' : row.snapshot?'Análisis congelado':'Guardada') + ' vs. ' + row.opponent + ' · ' + referenceLabel(row));
  } catch (error) { setMessage(error instanceof Error ? error.message : 'No pudimos guardar la referencia.'); }
  finally { setBusy(false); }
 }
 return <div className="game-reference-save">
  <button type="button" className="button subtle" disabled={busy||Boolean(snapshot&&!snapshot.keys.length)} onClick={() => void save()}>{busy ? 'Guardando…' : snapshot?'Congelar análisis para el próximo partido':matchId ? 'Guardar referencia' : 'Guardar referencia para el próximo partido'}</button>
  {message && <small role="status">{message}</small>}
 </div>;
}

export function GameReferenceHistory() {
 const { reduced } = useReadingPreferences();
 const [rows, setRows] = useState<Row[] | null>(null);
 const [message, setMessage] = useState('');
 const [busy, setBusy] = useState(false);
 const [open,setOpen]=useState(false);
 useEffect(()=>{if(!open)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')void load();},60_000);return()=>clearInterval(timer);},[open]);
 if (reduced) return null;
 async function load() {
  setBusy(true);
  setMessage('');
  try {
   const response = await fetch('/api/account/game-references', { cache: 'no-store' });
   if (!response.ok) throw Error();
   const payload: { rows: Row[] } = await response.json();
   setRows(payload.rows);
  } catch { setMessage('No pudimos cargar tus referencias.'); }
  finally { setBusy(false); }
 }
 async function remove(row: Row) {
  setBusy(true);
  try {
   const response = await fetch('/api/account/game-references', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId: row.matchId, playerId: row.playerId, market: row.market }),
   });
   if (!response.ok) throw Error();
   setRows(current => current?.filter(entry => entry !== row) ?? null);
   setMessage('Referencia eliminada.');
  } catch { setMessage('No pudimos eliminar la referencia.'); }
  finally { setBusy(false); }
 }
 return <details className="card teammate-comparison" onToggle={event => { setOpen(event.currentTarget.open); if (event.currentTarget.open && !busy) void load(); }}>
  <summary>Resultados de mis líneas guardadas</summary>
  <div><button type="button" className="button subtle" disabled={busy} onClick={() => void load()}>Consultar resultados</button>
  {busy && <p role="status">Consultando…</p>}
  {message && <p role="status">{message}</p>}
  {rows?.length === 0 && <p>Guardá una referencia desde la ficha de un jugador antes de su próximo partido.</p>}
  {Boolean(rows?.length) && <div className="table-scroll"><table className="history"><thead><tr>
   {['Jugador', 'Referencia', 'Guardada', 'Resultado', 'Acción'].map(label => <th key={label} scope="col">{label}</th>)}
  </tr></thead><tbody>{rows?.map(row => <tr key={[row.matchId, row.playerId, row.market].join(':')}>
   <th scope="row"><a href={'/partidos/' + row.matchId + '?matchTab=live'}>{row.name} vs. {row.opponent}</a></th>
   <td>{referenceLabel(row)} · {markets[row.market]}</td>
   <td><time dateTime={row.savedAt}>{date.format(new Date(row.savedAt))} ARG</time></td>
   <td>{row.state==='final'&&row.result!==null ? <span className={row.result===row.line?'muted':(row.side==='over'?row.result>row.line:row.result<row.line)?'positive':'negative'}>{amount(row.result)} · {row.result===row.line?'= Empate':(row.side==='over'?row.result>row.line:row.result<row.line)?'✓ Cumplió':'× No cumplió'}</span> : row.state === 'upcoming' ? 'Pendiente' : row.state === 'final' ? 'Sin estadística verificada' : 'Esperando resultado oficial'}</td>
   <td>{row.snapshot&&<FrozenDetails row={row}/>} {row.state !== 'upcoming' && <button type="button" className="button subtle" disabled={busy} onClick={() => void remove(row)}>Eliminar</button>}</td>
  </tr>)}</tbody></table></div>}
  </div>
 </details>;
}

function FrozenDetails({row}:{row:Row}){
 const [note,setNote]=useState(row.note??''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function save(){setBusy(true);try{const response=await fetch('/api/account/game-references',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({matchId:row.matchId,playerId:row.playerId,market:row.market,note})});if(!response.ok)throw Error();setMessage('Nota guardada.');}catch{setMessage('No pudimos guardar la nota. Intentá nuevamente.');}finally{setBusy(false);}}
 return <details className="frozen-analysis"><summary>Ver análisis congelado</summary><p>Promedio original: {row.snapshot?.average==null?'—':amount(row.snapshot.average)} · {row.snapshot?.hits}/{row.snapshot?.n} cumplieron la línea {amount(row.line)}.</p><p>La línea y los resultados de esta muestra se conservan desde el momento de guardado.</p><details><summary>Filtros y partidos originales</summary><pre>{row.snapshot?.filters}</pre>{row.snapshot?.results.map(g=><p key={g.key}>{g.date} · {g.opponent} · {g.minutes} min · {g.result===null?'—':amount(g.result)}</p>)}</details><label>Nota personal<textarea value={note} maxLength={1500} onChange={e=>setNote(e.target.value)}/></label><button className="button subtle" disabled={busy} onClick={()=>void save()}>{busy?'Guardando…':'Guardar nota'}</button>{message&&<p role="status">{message}</p>}</details>;
}
