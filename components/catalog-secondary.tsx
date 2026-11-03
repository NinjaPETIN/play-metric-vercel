'use client';
import {useState,type ReactNode} from 'react';
export default function CatalogSecondary({children}:{children:ReactNode}){const [expanded,setExpanded]=useState(false);return <div className={'catalog-secondary'+(expanded?' is-expanded':'')}><button className="catalog-details-toggle" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'Ocultar detalle':'Frecuencias y referencia'} <span>{expanded?'−':'+'}</span></button><div className="catalog-secondary-content">{children}</div></div>;}
