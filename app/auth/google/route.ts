import {NextResponse} from 'next/server';
import {authClient} from '../../../lib/supabase/server';
import {safeReturnPath} from '../../../lib/auth-path';
export async function GET(req:Request){const url=new URL(req.url);if(!process.env.APP_URL)return Response.json({error:'Falta APP_URL'},{status:503});const callback=new URL('/auth/callback',process.env.APP_URL);callback.searchParams.set('return_to',safeReturnPath(url.searchParams.get('return_to')));const client=await authClient();const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback.toString()}});if(error||!data.url)return NextResponse.redirect(new URL('/login?error=oauth',process.env.APP_URL));return NextResponse.redirect(data.url);}
