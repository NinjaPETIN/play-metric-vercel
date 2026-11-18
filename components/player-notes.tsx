'use client';
import { useEffect, useState } from 'react';
export default function PlayerNotes({ id, name }: {
    id: string;
    name: string;
}) {
    const [open, setOpen] = useState(false), [note, setNote] = useState(''), [saved, setSaved] = useState(''), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [login, setLogin] = useState(false);
    useEffect(() => { if (!open || ready)
        return; const c = new AbortController(); fetch('/api/account/player-notes?player=' + id, { cache: 'no-store', signal: c.signal }).then(async (r) => { if (r.status === 401) {
        setLogin(true);
        return;
    } if (!r.ok)
        throw Error(); const data = await r.json() as {
        note: string;
        updatedAt: string | null;
    }; setNote(data.note); setSaved(data.note); setReady(true); setMessage(''); }).catch(() => { if (!c.signal.aborted)
        setMessage('No pudimos leer tu nota. Cerrá y volvé a abrir para reintentar.'); }); return () => c.abort(); }, [open, id, ready]);
    async function save() { setBusy(true); try {
        const r = await fetch('/api/account/player-notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: id, note }) });
        if (!r.ok)
            throw Error();
        const data = await r.json() as {
            note: string;
            updatedAt: string | null;
        };
        setNote(data.note);
        setSaved(data.note);
        setMessage(data.note ? 'Nota guardada en tu cuenta.' : 'Nota eliminada.');
    }
    catch {
        setMessage('No pudimos guardar. Tu texto sigue disponible para reintentar.');
    }
    finally {
        setBusy(false);
    } }
    return <details className="card ux-notes" onToggle={e => setOpen(e.currentTarget.open)}><summary>Mis notas <small>Privadas</small></summary>{open && <div>{login ? <a href={'/login?return_to=' + encodeURIComponent(window.location.pathname + window.location.search)}>Ingresá para guardar notas en tu cuenta →</a> : <><label htmlFor={'note-' + id}>Tu análisis de {name}</label><textarea id={'note-' + id} maxLength={2000} rows={5} value={note} disabled={!ready || busy} onChange={e => setNote(e.target.value)} placeholder="Minutos, rol, dudas para revisar…"/><div className="ux-note-actions"><small>{note.length}/2000 · {note !== saved ? 'Cambios sin guardar' : 'Solo vos podés verla'}</small><button type="button" className="button subtle" disabled={!ready || busy || note === saved} onClick={() => void save()}>{busy ? 'Guardando…' : 'Guardar nota'}</button></div></>}{message && <p role="status">{message}</p>}</div>}</details>;
}
