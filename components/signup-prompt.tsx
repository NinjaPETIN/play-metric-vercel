'use client';
import {useEffect,useRef} from 'react';
import {X,LockKeyhole} from 'lucide-react';
export default function SignupPrompt({reason,returnTo,onClose}:{reason:string;returnTo:string;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current,prior=document.activeElement as HTMLElement|null;dialog?.showModal();return()=>{dialog?.close();prior?.focus();};},[]);
 return <dialog ref={ref} className="signup-prompt" aria-labelledby="signup-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><button className="icon signup-close" aria-label="Cerrar aviso" onClick={onClose}><X size={20}/></button><LockKeyhole size={26}/><h2 id="signup-title">Tu cuenta gratuita, más contexto</h2><p>{reason}</p><p className="muted">Consultá 5 jugadores por día y guardá tus favoritos. Sin tarjeta.</p><a className="button" href={'/login?return_to='+encodeURIComponent(returnTo)}>Crear cuenta o ingresar</a><button className="button subtle" onClick={onClose}>Seguir explorando</button></dialog>;
}
