type Zone = { key: string; label: string; attempts: number; made: number };

const locations = [
 { key: 'rim', label: 'Aro', x: 250, y: 119 },
 { key: 'paint', label: 'Pintura', x: 250, y: 193 },
 { key: 'mid', label: 'Media distancia', x: 140, y: 257 },
 { key: 'corner', label: 'Esquinas', x: 55, y: 115 },
 { key: 'arc', label: 'Triple frontal', x: 250, y: 358 },
];

const formatRate = new Intl.NumberFormat('es-AR', { style: 'percent', maximumFractionDigits: 1 });

export default function PlayerShotCourt({ zones, scope }: { zones: Zone[]; scope: string }) {
 const hasData = zones.some(zone => zone.attempts > 0);
 return <section className="card profile-shot-map" aria-label="Mapa de tiro">
  <header><div><h3>Mapa de tiro</h3><p>{scope} · Temporada completa</p></div>{hasData && <span>Acierto por zona</span>}</header>
  <svg viewBox="0 0 500 430" role="img" aria-label={hasData ? 'Media cancha con porcentajes de acierto por zona' : 'Media cancha de referencia'}>
   <rect className="shot-floor" x="12" y="22" width="476" height="386" rx="11"/>
   <path className="shot-lane" d="M178 23h144v165H178Z"/>
   <path className="shot-lines" d="M12 22h476v386H12Z M178 22v166h144V22 M50 22v115a209 209 0 0 0 400 0V22 M193 188a57 57 0 0 0 114 0 M193 188a57 57 0 0 1 114 0 M217 408a33 33 0 0 1 66 0 M212 54h76 M250 54v13 M211 72a39 39 0 0 0 78 0"/>
   <circle className="shot-lines" cx="250" cy="75" r="8"/>
   {hasData && locations.map(({ key, label, x, y }) => {
    const zone = zones.find(item => item.key === key);
    if (!zone?.attempts) return null;
    return <g key={key}>
     <title>{label}: {zone.made}/{zone.attempts}</title>
     <rect className="shot-zone-chip" x={x - 36} y={y - 20} width="72" height="29" rx="8"/>
     <text className="shot-zone-value" x={x} y={y}>{formatRate.format(zone.made / zone.attempts)}</text>
    </g>;
   })}
  </svg>
  {hasData ? <ul className="shot-zone-summary">{locations.map(({ key, label }) => {
   const zone = zones.find(item => item.key === key);
   return zone?.attempts ? <li key={key}><span>{label}</span><strong>{formatRate.format(zone.made / zone.attempts)}</strong><small>{zone.made}/{zone.attempts} convertidos</small></li> : null;
  })}</ul> : <p className="shot-map-empty">Sin registros de tiro por zona para esta temporada.</p>}
 </section>;
}
