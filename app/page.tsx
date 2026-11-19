import {workspaceHome} from '../lib/workspace-store';
import {resolveHomeView} from '../lib/workspace-state';
import {profileFor} from '../lib/account-profile';
import Dashboard from './dashboard';
import {getChatGPTUser} from './chatgpt-auth';
import PublicLanding from '../components/public-landing/public-landing';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{view?:string;[key:string]:string|string[]|undefined}>}){
 const [user,query]=await Promise.all([getChatGPTUser(),searchParams]);
 if (!user && Object.keys(query).length === 0) return <PublicLanding />;
 const [profile,home]=await Promise.all([user?profileFor(user):null,user?workspaceHome(user.userId).catch(()=>'explore' as const):Promise.resolve('explore' as const)]);
 return <Dashboard initialView={resolveHomeView(query,home)} user={user?{name:profile!.displayName}:null}/>;
}
