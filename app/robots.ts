import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{const origin=process.env.APP_URL??'https://play-metric-vercel.vercel.app';return {rules:{userAgent:'*',allow:'/',disallow:['/api/','/cuenta','/beta/','/login','/auth/','/logout']},sitemap:origin+'/sitemap.xml'};}
