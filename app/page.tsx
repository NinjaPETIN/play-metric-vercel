import {profileFor} from '../lib/account-profile';
import Dashboard from './dashboard';
import HomeLanding from '../components/home-landing';
import {getChatGPTUser} from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{view?:string;[key:string]:string|string[]|undefined}>}){
 const [user,query]=await Promise.all([getChatGPTUser(),searchParams]);
 if(!user&&!['view','competition','filters','q','season','history','market','line'].some(key=>query[key]))return <HomeLanding/>;
 const profile=user?await profileFor(user):null;
 return <Dashboard initialView={query?.view==='calendar'?'calendar':query?.view==='favorites'?'favorites':query?.view==='markets'?'markets':'explore'} user={user?{name:profile!.displayName}:null}/>;
}
