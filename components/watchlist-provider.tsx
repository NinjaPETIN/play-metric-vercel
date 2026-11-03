'use client';
import {createContext,useContext,useEffect,useState,useRef,type ReactNode} from 'react';
import type {Watchlist} from '../lib/watchlist-store';
import {useRouter} from 'next/navigation';
import {Star} from 'lucide-react';
const empty:Watchlist={players:[],teams:[]};
const Context=createContext<{watch:Watchlist;authenticated:boolean;loading:boolean;busy:boolean;error:string;toggle:(kind:'players'|'teams',item:string)=>Promise<void>}>({watch:empty,authenticated:false,loading:true,busy:false,error:'',toggle:async()=>{}});
export function WatchlistProvider({children}:{children:ReactNode}){
 const sending=useRef(false);
 const [watch,setWatch]=useState<Watchlist>(empty),[authenticated,setAuthenticated]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();fetch('/api/account/watchlist',{cache:'no-store',signal:controller.signal}).then(async r=>{if(r.status===401)return;if(!r.ok)throw Error('No pudimos cargar tu seguimiento.');setWatch(await r.json());setAuthenticated(true);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[]);
 async function toggle(kind:'players'|'teams',item:string){if(sending.current)return;sending.current=true;setBusy(true);setError('');try{const r=await fetch('/api/account/watchlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,item,saved:!watch[kind].includes(item)})}),next=await r.json() as Watchlist&{error?:string};if(!r.ok)throw Error(next.error??'No pudimos guardar tu seguimiento.');setWatch(next);}catch(e){setError(e instanceof Error?e.message:'No pudimos guardar tu seguimiento.');}finally{sending.current=false;setBusy(false);}}
 return <Context.Provider value={{watch,authenticated,loading,busy,error,toggle}}>{children}</Context.Provider>;
}
export const useWatchlist=()=>useContext(Context);
export function FollowButton({item,kind='players',name}:{item:string;kind?:'players'|'teams';name:string}){
 const state=useWatchlist(),router=useRouter(),saved=state.watch[kind].includes(item);
 return <button className={'icon sl-follow-button'+(saved?' saved':'')} disabled={state.loading||state.busy} aria-label={(saved?'Dejar de seguir a ':'Seguir a ')+name} aria-pressed={saved} title={saved?'Dejar de seguir':'Seguir'} onClick={()=>{if(!state.authenticated){router.push('/login?return_to='+encodeURIComponent(window.location.pathname+window.location.search));return;}void state.toggle(kind,item);}}><Star size={20} fill={saved?'currentColor':'none'}/></button>;
}
