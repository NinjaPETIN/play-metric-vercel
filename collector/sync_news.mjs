// Scheduled traffic uses the server's persistent lease, provider key and backoff.
// It never spends a second independent news-provider quota from GitHub's shared IP.
const origin=new URL(process.env.PLAY_METRIC_URL??'https://play-metric-vercel.vercel.app');
if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.username||origin.password||origin.search||origin.hash)throw Error('Origen de noticias no válido');
for(let attempt=0;attempt<8;attempt++){
 try{const response=await fetch(origin.origin+'/api/news',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('Servidor HTTP '+response.status);const feed=await response.json();if(!Array.isArray(feed.articles)||!feed.articles.length)throw Error('Todavía no hay titulares validados');console.log(JSON.stringify({ok:true,provider:feed.provider,articles:feed.articles.length,status:feed.status,fetchedAt:feed.fetchedAt}));process.exit(0);}
 catch(error){console.log('Actualización pendiente: '+error.message);if(attempt<7)await new Promise(resolve=>setTimeout(resolve,20000));}
}
throw Error('Noticias sin recuperar; se conserva la caché y el backoff del servidor.');
