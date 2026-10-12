'use server';
import {redirect} from 'next/navigation';
import {authClient} from '../../lib/supabase/server';
import {safeReturnPath} from '../../lib/auth-path';
export type EmailState={sent:boolean;email:string;error:string};
export async function emailAccess(_previous:EmailState,form:FormData):Promise<EmailState>{
 const email=String(form.get('email')??'').trim().toLowerCase(),returnTo=safeReturnPath(String(form.get('return_to')??'/')),token=String(form.get('token')??'').trim();
 const fail=(error:string,sent=false)=>({sent,email,error});
 if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return fail('Ingresá un correo válido.');
 const origin=process.env.APP_URL;if(!origin)return fail('El acceso por correo no está disponible.');
 const client=await authClient();
 if(form.get('operation')==='verify'){
  if(!/^\d{6,8}$/.test(token))return fail('Ingresá el código que recibiste.',true);
  const {error}=await client.auth.verifyOtp({email,token,type:'email'});
  if(error)return fail('El código venció o no es válido. Revisá el correo o pedí otro enlace.',true);
  redirect(returnTo);
 }
 const callback=new URL('/auth/callback',origin);callback.searchParams.set('return_to',returnTo);
 const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:callback.toString()}});
 if(error)return fail(error.status===429?'Esperá un momento antes de solicitar otro correo.':'No pudimos enviar el acceso. Intentá más tarde o continuá con Google.');
 return {sent:true,email,error:''};
}
