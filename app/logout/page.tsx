import {logout} from './action';
export default function Logout(){return <main className="billing-content"><h2>Cerrar sesión</h2><form action={logout}><button className="button" type="submit">Cerrar mi sesión</button></form><a href="/">Volver</a></main>;}
