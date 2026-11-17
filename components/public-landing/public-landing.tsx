import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight, BarChart3, CalendarDays, Newspaper, Users} from 'lucide-react';
import LandingExample from './landing-example';
import {UpcomingFixtures} from '../design-schedule';
import AnnouncementBar from './announcement-bar';
import {activeAnnouncements} from './announcements';
import styles from './public-landing.module.css';

const explore = '/?view=explore';
const calendar = '/?view=calendar';
const news = explore + '#news-context';

const features = [
  {title: 'Jugadores y tendencias', text: 'Explorá el rendimiento reciente y el historial de cada jugador.', href: explore, icon: BarChart3},
  {title: 'Partidos en vivo', text: 'Seguí el marcador, las jugadas y las estadísticas del partido.', href: calendar, icon: CalendarDays},
  {title: 'Comparar jugadores', text: 'Poné dos jugadores lado a lado con Statlane Pro.', href: '/planes', icon: Users},
  {title: 'Noticias y contexto', text: 'Encontrá titulares de la NBA y leé las notas originales.', href: news, icon: Newspaper},
];

export default function PublicLanding({authenticated=false}:{authenticated?:boolean}) {
  return (
    <div className={styles.page}>
      <AnnouncementBar items={activeAnnouncements()} />
      <header className={styles.header}>
        <div className={styles.nav}>
          <Link href="/" className={styles.brand}>
            <Image src="/statlane-mark.svg" width={25} height={27} alt="" /> STATLANE
          </Link>
          <nav aria-label="Navegación de la portada">
            <Link href={explore} prefetch={false}>Jugadores</Link><Link href="/?view=markets" prefetch={false}>Estadísticas</Link><Link href="/?view=favorites" prefetch={false}>Favoritos</Link>
            <a href={calendar}>Partidos</a>
            <a href={news}>Noticias</a>
          </nav>
          <Link className={styles.secondary} href={authenticated?'/cuenta':'/login?return_to=%2F%3Fview%3Dexplore'} prefetch={false}>{authenticated?'Mi cuenta':'Ingresar'}</Link>
        </div>
      </header>
      <main>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div>
              
              <h1>La NBA, en números y en <em>contexto</em></h1>
              <p>Consultá estadísticas de jugadores, compará tendencias y seguí partidos en vivo.</p>
              <div className={styles.actions}>
                <a className={styles.primary} href={explore}>Explorar jugadores →</a>
                <a className={styles.secondary} href={calendar}>Ver partidos</a>
              </div>
            </div>
            <LandingExample />
          </div>
        </section>
        <UpcomingFixtures />
        <section className={styles.features}>
          <h2>Qué podés hacer en Statlane</h2>
          <div className={styles.cards}>
            {features.map(({title, text, href, icon: Icon}) => (
              <a key={title} href={href}>
                <Icon size={27} aria-hidden="true" />
                <h3>{title} <ArrowUpRight size={15} aria-hidden="true" /></h3>
                <p>{text}</p>
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
