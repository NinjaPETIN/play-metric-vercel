 'use server';
import {authClient} from '../../lib/supabase/server';
import {redirect} from 'next/navigation';
export async function logout(){const client=await authClient();await client.auth.signOut();redirect('/');}
