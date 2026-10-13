import type {MetadataRoute} from 'next';
import {teamNames} from '../lib/team-overview';
export default function sitemap():MetadataRoute.Sitemap{const origin=process.env.APP_URL??'https://play-metric-vercel.vercel.app';return [{url:origin,changeFrequency:'weekly',priority:1},{url:origin+'/jugadores/2544',changeFrequency:'daily',priority:.8},{url:origin+'/privacidad',changeFrequency:'monthly',priority:.2},...Object.keys(teamNames).map(id=>({url:origin+'/equipos/'+id,changeFrequency:'daily' as const,priority:.6}))];}
