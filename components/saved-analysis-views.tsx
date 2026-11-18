'use client';
import { useEffect, useState } from 'react';
type View = {
    id: string;
    name: string;
    path: string;
};
const key = 'statlane:analysis-views:v1';
export default function SavedAnalysisViews() {
    const [views, setViews] = useState<View[]>([]), [name, setName] = useState(''), [message, setMessage] = useState('');
    useEffect(() => { let active = true; queueMicrotask(() => { if (!active)
        return; try {
        const raw = JSON.parse(localStorage.getItem(key) ?? '[]');
        if (Array.isArray(raw))
            setViews(raw.filter(v => typeof v.name === 'string' && typeof v.id === 'string' && typeof v.path === 'string' && /^\/(?:\?|jugadores\/|partidos\/|equipos\/)/.test(v.path) && !v.path.includes('\\')).slice(0, 10));
    }
    catch { } }); return () => { active = false; }; }, []);
    function persist(next: View[]) { try {
        localStorage.setItem(key, JSON.stringify(next));
        setViews(next);
        setMessage('Vistas guardadas en este navegador.');
    }
    catch {
        setMessage('El navegador no permite guardar vistas.');
    } }
    return <details className="card ux-saved-views"><summary>Mis vistas <small>Filtros y línea</small></summary><p>Guardá hasta 10 accesos con la selección actual.</p><form onSubmit={e => { e.preventDefault(); if (!name.trim())
        return; persist([{ id: crypto.randomUUID(), name: name.trim().slice(0, 40), path: location.pathname + location.search }, ...views].slice(0, 10)); setName(''); }}><label>Nombre de la vista<input value={name} maxLength={40} required onChange={e => setName(e.target.value)} placeholder="Rebotes · L10 · visitante"/></label><button className="button subtle" type="submit">Guardar vista</button></form><ul>{views.map(view => <li key={view.id}><a href={view.path}>{view.name}</a><button className="icon" type="button" aria-label={'Eliminar ' + view.name} onClick={() => persist(views.filter(v => v.id !== view.id))}>×</button></li>)}</ul>{message && <p role="status">{message}</p>}</details>;
}
