'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Copy, Download, Link, Share2, X } from 'lucide-react';
import { cardSizes, type CardFormat } from '../lib/performance-card';

const formats = { square: 'Cuadrada', vertical: 'Vertical', wide: 'Horizontal' } as const;

function loadImage(src: string) {
 return new Promise<HTMLImageElement | undefined>(resolve => {
  const image = new Image();
  const timer = window.setTimeout(() => resolve(undefined), 5000);
  function finish(asset?: HTMLImageElement) {
   window.clearTimeout(timer);
   resolve(asset);
  }
  image.crossOrigin = 'anonymous';
  image.onload = () => finish(image);
  image.onerror = () => finish();
  image.src = src;
 });
}

export default function ShareCardDialog({ title, triggerLabel, text, path, filename, assets, draw, onClose }: {
 title: string;
 triggerLabel: string;
 text: string;
 path: string | null;
 filename: string;
 assets: Record<string, string>;
 draw: (canvas: HTMLCanvasElement, format: CardFormat, light: boolean, images: Record<string, HTMLImageElement | undefined>) => void;
 onClose: () => void;
}) {
 const [format, setFormat] = useState<CardFormat>('square');
 const [light, setLight] = useState(false);
 const [message, setMessage] = useState('');
 const [images, setImages] = useState<Record<string, HTMLImageElement | undefined> | null>(null);
 const [sharedFile, setSharedFile] = useState<File | null>(null);
 const dialog = useRef<HTMLDialogElement>(null);
 const canvas = useRef<HTMLCanvasElement>(null);
 const heading = useId();
 const assetsKey = JSON.stringify(assets);
 const [width, height] = cardSizes[format];
 const fileName = filename + '-' + format + '.png';

 useEffect(() => {
  const element = dialog.current;
  const trigger = document.activeElement;
  element?.showModal();
  return () => {
   element?.close();
   if (trigger instanceof HTMLElement) trigger.focus();
  };
 }, []);

 useEffect(() => {
  let active = true;
  const entries = Object.entries(JSON.parse(assetsKey) as Record<string, string>).filter(([, src]) => src);
  const fonts = Promise.allSettled([600, 700, 800].map(weight => document.fonts.load(weight + ' 36px Poppins')));
  Promise.all([fonts, Promise.all(entries.map(async ([key, src]) => [key, await loadImage(src)] as const))]).then(([, loaded]) => {
   if (active) setImages(Object.fromEntries(loaded));
  });
  return () => { active = false; };
 }, [assetsKey]);

 useEffect(() => {
  if (!canvas.current || !images) return;
  let active = true;
  try {
   draw(canvas.current, format, light, images);
   canvas.current.toBlob(blob => {
    if (!active) return;
    if (blob) setSharedFile(new File([blob], fileName, { type: 'image/png' }));
    else setMessage('No pudimos preparar la imagen.');
   }, 'image/png');
  } catch {
   queueMicrotask(() => { if (active) setMessage('No pudimos preparar la imagen.'); });
  }
  return () => { active = false; };
 }, [draw, fileName, format, images, light]);

 function download() {
  if (!sharedFile) return;
  const url = URL.createObjectURL(sharedFile);
  const link = document.createElement('a');
  link.href = url;
  link.download = sharedFile.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  setMessage('Imagen descargada.');
 }

 async function copy(value: string, success: string) {
  try {
   await navigator.clipboard.writeText(value);
   setMessage(success);
  } catch {
   setMessage('No pudimos copiar al portapapeles.');
  }
 }

 async function share() {
  if (!sharedFile) return;
  try {
   await navigator.share({ files: [sharedFile], title, text: post });
  } catch (error) {
   if (!(error instanceof DOMException && error.name === 'AbortError')) setMessage('No pudimos compartir. Podés descargar la imagen.');
  }
 }

 const url = path ? window.location.origin + path : '';
 const post = url ? text + '\n\n' + url : text;
 const canShare = Boolean(sharedFile && navigator.canShare?.({ files: [sharedFile] }) && navigator.share);

 return <dialog ref={dialog} className="sl-share-dialog" aria-labelledby={heading} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
  if (event.target !== event.currentTarget) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
 }}>
  <button type="button" className="icon sl-dialog-close" aria-label="Cerrar tarjeta para compartir" onClick={onClose}><X size={20}/></button>
  <div className="sl-share-preview">
   <canvas ref={canvas} width={width} height={height} aria-label={triggerLabel} hidden={!images}/>
   {!images && <p role="status">Preparando vista previa…</p>}
  </div>
  <div className="sl-share-options">
   <h2 id={heading}>{title}</h2>
   <div className="sl-share-setting">
    <span>Formato · {width} × {height} px</span>
    <div className="segmented" role="group" aria-label="Formato de la imagen">
     {(Object.keys(formats) as CardFormat[]).map(key => <button type="button" key={key} aria-pressed={format === key} className={format === key ? 'selected' : ''} onClick={() => { if (format !== key) { setSharedFile(null); setFormat(key); setMessage(''); } }}>{formats[key]}</button>)}
    </div>
   </div>
   <div className="sl-share-setting">
    <span>Tema</span>
    <div className="segmented" role="group" aria-label="Tema">
     {[false, true].map(value => <button type="button" key={String(value)} aria-pressed={light === value} className={light === value ? 'selected' : ''} onClick={() => { if (light !== value) { setSharedFile(null); setLight(value); setMessage(''); } }}>{value ? 'Claro' : 'Oscuro'}</button>)}
    </div>
   </div>
   <label>Texto del post<textarea readOnly value={post}/></label>
   <div className="sl-share-actions">
    <button type="button" className="button sl-share-download" disabled={!sharedFile} onClick={download}><Download size={17}/> Descargar PNG</button>
    {canShare && <button type="button" className="button subtle" onClick={share}><Share2 size={17}/> Compartir imagen</button>}
    <button type="button" className="button subtle" onClick={() => copy(post, 'Texto copiado.')}><Copy size={17}/> Copiar texto</button>
    {url && <button type="button" className="button subtle" onClick={() => copy(url, 'Enlace copiado.')}><Link size={17}/> Copiar enlace</button>}
   </div>
   <p className="sl-share-message" role="status">{message}</p>
  </div>
 </dialog>;
}
