'use client';
import {useState,type ReactNode} from 'react';

export default function ProfileDetailTabs({shots,teammate}:{shots:ReactNode;teammate:ReactNode}){
 const [panel,setPanel]=useState<'shots'|'teammate'>('shots');
 return <div className="profile-detail-tabs">
  {teammate&&<div className="profile-detail-switch segmented" role="group" aria-label="Detalles del jugador">
   <button type="button" aria-pressed={panel==='shots'} onClick={()=>setPanel('shots')}>Mapa de tiro</button>
   <button type="button" aria-pressed={panel==='teammate'} onClick={()=>setPanel('teammate')}>Con y sin un compañero</button>
  </div>}
  <div className={'profile-detail-content'+(teammate?' has-teammate':'')} data-panel={panel}>
   <div className="profile-shots-pane">{shots}</div>{teammate&&<div className="profile-teammate-pane">{teammate}</div>}
  </div>
 </div>;
}
