import type {NextConfig} from 'next';
const deploymentId=(process.env.NEXT_DEPLOYMENT_ID||process.env.VERCEL_GIT_COMMIT_SHA)?.slice(0,32);
const config:NextConfig={deploymentId,poweredByHeader:false,images:{remotePatterns:[{protocol:'https',hostname:'cdn.nba.com',pathname:'/headshots/nba/latest/**',search:''},{protocol:'https',hostname:'cdn.nba.com',pathname:'/logos/nba/**',search:''}]},async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},{key:'X-Frame-Options',value:'DENY'}]},{source:'/api/:path*',headers:[{key:'Cache-Control',value:'private, no-store'}]}];}};
export default config;
