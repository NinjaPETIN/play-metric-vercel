import type {Metadata} from 'next';
import './globals.css';
import './auth-ui.css';
import './launch.css';
export const metadata:Metadata={metadataBase:new URL(process.env.APP_URL??'https://play-metric-vercel.vercel.app'),openGraph:{title:'Play Metric — Estadísticas NBA con contexto',description:'Tendencias, minutos e históricos de jugadores NBA en español.',locale:'es_AR',type:'website'},title:'Play Metric — El juego, en datos',description:'Entendé las estadísticas NBA: tendencias, minutos, históricos y seguimiento de jugadores en español.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><head><link rel="preload" href="/fonts/poppins-400.woff" as="font" type="font/woff" crossOrigin="anonymous"/><link rel="preload" href="/fonts/poppins-800.woff" as="font" type="font/woff" crossOrigin="anonymous"/></head><body>{children}</body></html>;}
