'use client';

import {useState} from 'react';
import {Pause, Play} from 'lucide-react';
import type {Announcement} from './announcements';
import styles from './public-landing.module.css';

export default function AnnouncementBar({items}: {items: readonly Announcement[]}) {
  const [paused, setPaused] = useState(false);
  if (!items.length) return null;

  return (
    <aside className={styles.announcements} aria-label="Anuncios de Statlane">
      <div className={styles.ticker} data-paused={paused}>
        <div className={styles.track}>
          {[false, true].map(copy => (
            <ul key={String(copy)} className={styles.group} aria-hidden={copy || undefined}>
              {items.map(item => (
                <li key={item.id}>
                  <a href={item.href} tabIndex={copy ? -1 : undefined}>
                    {item.message} <span>· {item.action} →</span>
                  </a>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <button type="button" className={styles.pause} onClick={() => setPaused(!paused)}
        aria-label={paused ? 'Reanudar anuncios' : 'Pausar anuncios'}>
        {paused ? <Play size={15} /> : <Pause size={15} />}
      </button>
    </aside>
  );
}
