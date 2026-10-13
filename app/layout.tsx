import type {Metadata} from 'next';
import {headers} from 'next/headers';
import './globals.css';
import './auth-ui.css';
import './launch.css';
import './workspace.css';
import './catalog.css';
import {WorkspaceTheme} from '../components/workspace-theme';
export const dynamic='force-dynamic';
export const metadata:Metadata={metadataBase:new URL(process.env.APP_URL??'https://play-metric-vercel.vercel.app'),openGraph:{title:'Play Metric — Estadísticas NBA con contexto',description:'Tendencias, minutos e históricos de jugadores NBA en español.',locale:'es_AR',type:'website'},title:'Play Metric — El juego, en datos',description:'Entendé las estadísticas NBA: tendencias, minutos, históricos y seguimiento de jugadores en español.',icons:{icon:'/favicon.svg'}};
export default async function RootLayout({children}:{children:React.ReactNode}){const nonce=(await headers()).get('x-nonce')??undefined;return <html lang="es" suppressHydrationWarning><head><link nonce={nonce} rel="preload" href="/fonts/poppins-400.woff" as="font" type="font/woff" crossOrigin="anonymous"/><link nonce={nonce} rel="preload" href="/fonts/poppins-800.woff" as="font" type="font/woff" crossOrigin="anonymous"/></head><body><WorkspaceTheme nonce={nonce}>{children}</WorkspaceTheme></body></html>;}
