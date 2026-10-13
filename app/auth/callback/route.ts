import {NextResponse} from 'next/server';
import {authClient} from '../../../lib/supabase/server';
import {safeReturnPath} from '../../../lib/auth-path';
export async function GET(req:Request){const url=new URL(req.url),origin=process.env.APP_URL;if(!origin)return Response.json({error:'Falta APP_URL'},{status:503});const code=url.searchParams.get('code');if(code){const client=await authClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(safeReturnPath(url.searchParams.get('return_to')),origin));}const failed=new URL('/login',origin);failed.searchParams.set('error','callback');failed.searchParams.set('return_to',safeReturnPath(url.searchParams.get('return_to')));return NextResponse.redirect(failed);}
