'use client';

import { useState } from 'react';
import PlayerTraitsCard from './player-traits-card';

export default function ProfileAdvanced(props: React.ComponentProps<typeof PlayerTraitsCard>) {
 const [requested, setRequested] = useState(false);
 return <details className="profile-advanced" onToggle={event => {
  if (event.currentTarget.open) setRequested(true);
 }}>
  <summary>Mapa de tiro y comparativa con la liga</summary>
  {requested && <PlayerTraitsCard {...props}/>}
 </details>;
}
