import Image from 'next/image';
import Link from 'next/link';
import {ArrowRight, BarChart3, Radio, Users} from 'lucide-react';
import AnnouncementBar from './announcement-bar';
import {activeAnnouncements} from './announcements';
import LandingGames from './landing-games';
import styles from './public-landing.module.css';

const explore = '/?view=explore';
const calendar = '/?view=calendar';
const news = explore + '#news-context';

const features = [
  {title: 'Jugadores y tendencias', text: 'Explorá el rendimiento reciente y el historial de cada jugador.', href: explore, icon: BarChart3},
  {title: 'Partidos en vivo', text: 'Seguí el marcador, las jugadas y las estadísticas del partido.', href: calendar, icon: Radio},
  {title: 'Comparar jugadores', text: 'Poné dos jugadores lado a lado con Statlane Pro.', href: '/planes', icon: Users},
];

const exampleGames = [28, 22, 31, 27, 20, 26, 23, 21, 29, 32];
const exampleLine = 24.5;
const chartY = (points: number) => 196 - (points - 12) * 7.5;

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
            <a href={explore}>Jugadores</a>
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
              <h1>La NBA, en números y en contexto</h1>
              <p>Explorá estadísticas, compará jugadores y seguí cada partido.</p>
              <div className={styles.actions}>
                <a className={styles.primary} href={explore}>Explorar jugadores</a>
                <a className={styles.secondary} href={calendar}>Ver partidos</a>
              </div>
            </div>
            <figure className={styles.example}>
              <figcaption><strong>Puntos por partido</strong><small>Ejemplo ilustrativo</small></figcaption>
              <p>Últimos 10 · Línea 24,5 PTS</p>
              <svg className={styles.chart} viewBox="0 0 560 220" role="img"
                aria-label={`Puntos en los últimos diez partidos: ${exampleGames.join(', ')}. Línea 24,5 puntos.`}>
                {[12, 16, 20, 24, 28, 32, 36].map(value => <g key={value} className={styles.chartGrid}>
                  <line x1="34" x2="547" y1={chartY(value)} y2={chartY(value)}/>
                  <text x="27" y={chartY(value) + 4} textAnchor="end">{value}</text>
                </g>)}
                {exampleGames.map((points, index) => {
                  const x = 44 + index * 46;
                  return <g key={index}>
                    <rect x={x} y={chartY(points)} width="36" height={196 - chartY(points)} rx="2" fill={points > exampleLine ? '#2ed2ae' : '#f47a83'}/>
                    <text x={x + 18} y={chartY(points) - 6} textAnchor="middle">{points},0</text>
                    <text x={x + 18} y="215" textAnchor="middle">{index + 1}</text>
                  </g>;
                })}
                <line x1="34" x2="547" y1={chartY(exampleLine)} y2={chartY(exampleLine)} stroke="#e3ddff" strokeDasharray="6 5"/>
                <g className={styles.chartThreshold}>
                  <rect x="466" y={chartY(exampleLine) - 12} width="88" height="24" rx="5"/>
                  <text x="510" y={chartY(exampleLine) + 4} textAnchor="middle">Línea 24,5</text>
                </g>
              </svg>
            </figure>
          </div>
        </section>
        <LandingGames />
        <section className={styles.features} aria-label="Herramientas de Statlane">
          <div className={styles.cards}>
            {features.map(({title, text, href, icon: Icon}) => (
              <a key={title} href={href}>
                <Icon size={27} aria-hidden="true" />
                <div><h3>{title}</h3><p>{text}</p></div>
                <ArrowRight size={20} aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
