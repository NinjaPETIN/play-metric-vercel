import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
export async function authClient(){const store=await cookies();const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new Error('Falta configurar Supabase Auth');return createServerClient(url,key,{cookies:{getAll:()=>store.getAll(),setAll(values){try{values.forEach(({name,value,options})=>store.set(name,value,options));}catch{/* Server components cannot write; proxy refreshes cookies. */}}}});}
