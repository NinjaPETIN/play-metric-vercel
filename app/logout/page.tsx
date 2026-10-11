import Link from 'next/link';
import {logout} from './action';
import {AuthLayout,AuthLogo} from '../auth-ui';
export default function Logout(){return <AuthLayout><section className="pm-auth-card"><AuthLogo/><h2>¿Querés cerrar sesión?</h2><p className="pm-auth-description">Tus favoritos y preferencias<br/>quedan guardados.</p><form action={logout}><button className="pm-auth-primary" type="submit">Cerrar sesión</button></form><Link className="pm-auth-secondary" href="/">Seguir explorando</Link></section></AuthLayout>}
