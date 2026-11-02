import {notFound} from 'next/navigation';
import {sql} from 'drizzle-orm';
import {getDb} from '../../../db';
import {codeAdmin} from '../../../lib/pro-codes';
import {requireChatGPTUser} from '../../chatgpt-auth';
import '../../launch.css';
export const dynamic='force-dynamic';
export const metadata={title:'Métricas de beta · Statlane',robots:{index:false,follow:false}};
export default async function Metrics(){await requireChatGPTUser('/beta/metricas');if(!await codeAdmin())notFound();const rows=await getDb().all<{key:string;count:number}>(sql`select key,json_extract(payload,'$.count') as count from provider_cache where key like 'pm:beta:counts:%' and expires_at>${new Date().toISOString()} order by key desc limit 240`),days=Array.from(new Set(rows.map(r=>r.key.split(':')[3]))).slice(0,14),events={visit:'Visitantes',return_visit:'Regresaron',profile_open:'Abrieron ficha',signup_click:'Clic en registro',favorite_saved:'Guardaron favorito',share_download:'Descargaron tarjeta',link_copied:'Copiaron enlace'};
 return <main className="info-page"><a href="/cuenta">← Mi cuenta</a><span className="eyebrow">SOLO ADMINISTRADOR</span><h1>Uso de la beta</h1><p>Visitantes que aceptaron la medición opcional. Cada navegador cuenta como máximo una vez por acción y día de Argentina. Son señales orientativas, no el tráfico total ni registros confirmados.</p><div className="table-scroll"><table className="history"><thead><tr><th>Día</th>{Object.values(events).map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{days.map(day=><tr key={day}><td>{day}</td>{Object.keys(events).map(event=><td key={event}>{rows.find(r=>r.key===`pm:beta:counts:${day}:${event}`)?.count??0}</td>)}</tr>)}</tbody></table></div>{!days.length&&<p>Todavía no hay eventos de visitantes que aceptaron la medición.</p>}<p>“Regresaron” indica navegadores medidos en un día anterior. Borrar el almacenamiento, cambiar de navegador o rechazar la medición impide vincular esas visitas.</p></main>;}
