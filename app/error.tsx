'use client';
import Link from 'next/link';

export default function RouteError({retry}:{error:unknown;retry:()=>void}) {
 return <main className="route-recovery" role="alert">
  <span className="eyebrow">STATLANE</span>
  <h1>No pudimos abrir esta vista</h1>
  <p>Volvé a intentarlo. Si el problema continúa, recargá la página para abrir la versión más reciente.</p>
  <div>
   <button className="button" onClick={retry}>Volver a intentar</button>
   <button className="button subtle" onClick={()=>window.location.reload()}>Recargar página</button>
   <Link href="/" prefetch={false}>Ir al inicio</Link>
  </div>
 </main>;
}
