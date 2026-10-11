import type {Metadata} from 'next';
import './globals.css';
import './auth-ui.css';
export const metadata:Metadata={title:'Play Metric — El juego, en datos',description:'Explorá estadísticas, líneas y tendencias de jugadores con Play Metric.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><head><link rel="preload" href="/fonts/poppins-400.woff" as="font" type="font/woff" crossOrigin="anonymous"/><link rel="preload" href="/fonts/poppins-800.woff" as="font" type="font/woff" crossOrigin="anonymous"/></head><body>{children}</body></html>;}
