import {redirect} from 'next/navigation';
import {cache} from 'react';
import {authClient} from '../lib/supabase/server';
import {safeReturnPath} from '../lib/auth-path';
export type ChatGPTUser={userId:string;displayName:string;email:string;fullName:string|null};
// Kept as an internal compatibility name. No client-supplied identity headers are trusted.
export const getChatGPTUser=cache(async():Promise<ChatGPTUser|null>=>{if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return null;const client=await authClient();const {data,error}=await client.auth.getUser();if(error||!data.user?.email)return null;const u=data.user,fullName=typeof u.user_metadata.full_name==='string'?u.user_metadata.full_name:null;return {userId:u.id,email:u.email!,fullName,displayName:fullName??u.email!};});
export async function requireChatGPTUser(returnTo:string){const user=await getChatGPTUser();if(user)return user;redirect(chatGPTSignInPath(returnTo));}
export function chatGPTSignInPath(returnTo:string){return '/login?return_to='+encodeURIComponent(safeReturnPath(returnTo));}
export function chatGPTSignOutPath(returnTo='/'){return '/logout?return_to='+encodeURIComponent(safeReturnPath(returnTo));}
