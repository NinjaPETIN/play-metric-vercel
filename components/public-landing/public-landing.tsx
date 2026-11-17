import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight, BarChart3, CalendarDays, Newspaper, Users} from 'lucide-react';
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

const exampleGames = [28, 23, 52, 41, 37, 45, 42];
const average = (exampleGames.reduce((sum, points) => sum + points, 0) / exampleGames.length)
  .toLocaleString('es-AR', {maximumFractionDigits: 1});

export default function PublicLanding() {
  return (
    <div className={styles.page}>
      <AnnouncementBar items={activeAnnouncements()} />
      <header className={styles.header}>
        <div className={styles.nav}>
          <Link href="/" className={styles.brand}>
            <Image src="/statlane-mark.svg" width={25} height={27} alt="" /> STATLANE
          </Link>
          <nav aria-label="Navegación de la portada">
            <a href={explore}>Estadísticas</a>
            <a href={calendar}>Partidos</a>
            <a href={news}>Noticias</a>
          </nav>
          <a className={styles.secondary} href="/login?return_to=%2F%3Fview%3Dexplore">Ingresar</a>
        </div>
      </header>
      <main>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div>
              <span className={styles.kicker}>ESTADÍSTICAS NBA</span>
              <h1>La NBA, en números <em>y en contexto</em></h1>
              <p>Consultá estadísticas de jugadores, compará tendencias y seguí partidos en vivo.</p>
              <div className={styles.actions}>
                <a className={styles.primary} href={explore}>Explorar estadísticas</a>
                <a className={styles.secondary} href={calendar}>Ver partidos</a>
              </div>
            </div>
            <figure className={styles.example}>
              <figcaption>Vista de ejemplo</figcaption>
              <div className={styles.player}>
                <Image src="https://cdn.nba.com/headshots/nba/latest/260x190/1629029.png"
                  width={130} height={95} alt="" unoptimized />
                <div><strong>Luka Dončić</strong><span>Puntos por partido</span><b>{average}</b></div>
              </div>
              <div className={styles.chart} role="img" aria-label={`Puntos por partido en esta muestra: ${exampleGames.join(', ')}`}>
                {exampleGames.map((points, index) => (
                  <span key={index} style={{height: `${points / 60 * 100}%`}}>
                    <b aria-hidden="true">{points}</b>
                  </span>
                ))}
              </div>
              <small>Muestra histórica · 7 partidos</small>
            </figure>
          </div>
        </section>
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
