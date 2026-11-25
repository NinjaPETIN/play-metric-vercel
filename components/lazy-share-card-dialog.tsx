'use client';
import dynamic from 'next/dynamic';
const ShareCardDialog=dynamic(()=>import('./share-card-dialog'),{loading:()=> <p role="status">Preparando imagen…</p>});
export default ShareCardDialog;
