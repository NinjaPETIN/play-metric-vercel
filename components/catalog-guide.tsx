'use client';
import {useEffect,useState} from 'react';
const key='statlane:catalog-guide:v1';
const steps=[['Leé el gráfico','Cada barra representa un partido. Verde: cumple la referencia; rojo: no cumple; gris: empate. Tocá una barra para consultar su detalle.'],['Elegí tu muestra','L5, L10 y L20 cambian la cantidad de partidos analizados. La tarjeta siempre indica cuántos registros hay disponibles.'],['Guardá lo que te interesa','La estrella te permite seguir al jugador o guardar una línea concreta. Encontrás ambos en Favoritos.']];
export default function CatalogGuide(){
 const [visible,setVisible]=useState(false),[step,setStep]=useState(0);
 useEffect(()=>{const timer=setTimeout(()=>{try{setVisible(localStorage.getItem(key)!=='done');}catch{setVisible(true);}},0);return()=>clearTimeout(timer);},[]);
 function close(){setVisible(false);try{localStorage.setItem(key,'done');}catch{}}
 return <div className="sl-guide-wrap">{visible?<section className="sl-guide card" aria-label="Guía rápida de estadísticas"><div><small>GUÍA RÁPIDA · {step+1}/3</small><h2>{steps[step][0]}</h2><p>{steps[step][1]}</p></div><div className="sl-guide-actions">{step>0&&<button className="button subtle" onClick={()=>setStep(s=>s-1)}>Anterior</button>}<button className="button" onClick={()=>step===2?close():setStep(s=>s+1)}>{step===2?'Entendido':'Siguiente'}</button><button className="button subtle" onClick={close}>Cerrar guía</button></div></section>:<button className="sl-guide-reopen" onClick={()=>{setStep(0);setVisible(true);}}>Cómo usar las estadísticas</button>}</div>;
}
