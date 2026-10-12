'use client';
import '../app/experience.css';
import {useActionState} from 'react';
import {emailAccess} from '../app/login/email-actions';
export default function EmailLogin({returnTo}:{returnTo:string}){
 const [state,action,pending]=useActionState(emailAccess,{sent:false,email:'',error:''});
 return <div className="email-login"><div className="email-divider"><span>o con tu correo</span></div><form action={action}><input type="hidden" name="return_to" value={returnTo}/><label>Correo electrónico<input name="email" type="email" autoComplete="email" placeholder="nombre@ejemplo.com" maxLength={254} required defaultValue={state.email}/></label>{state.sent&&<><p className="pm-auth-note" role="status">Revisá tu bandeja de entrada y spam. Abrí el enlace de acceso en este navegador. Si recibiste un código, podés ingresarlo acá.</p><label>Código del correo (opcional)<input name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} placeholder="Código de acceso"/></label><button className="pm-auth-primary" type="submit" name="operation" value="verify" disabled={pending}>{pending?'Verificando…':'Ingresar con código'}</button></>}{state.error&&<p className="pm-auth-alert" role="alert">{state.error}</p>}<button className={state.sent?'button subtle':'pm-auth-primary'} type="submit" name="operation" value="send" disabled={pending}>{pending?'Un momento…':state.sent?'Enviar otro enlace':'Continuar con correo'}</button><p className="pm-auth-note">Sin contraseña. Te enviamos un acceso seguro.</p></form></div>;
}
