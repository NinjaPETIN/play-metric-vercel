"""Windows collector launcher. Secrets never appear in arguments or logs."""
import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime

def main():
    if os.name != 'nt':
        raise SystemExit('Este lanzador requiere Windows.')
    import msvcrt
    root = Path(__file__).resolve().parents[1]
    state = Path(os.environ['LOCALAPPDATA']) / 'PlayMetric' / 'collector'
    state.mkdir(parents=True, exist_ok=True)
    lock = (state / 'sync.lock').open('a+b')
    lock.seek(0)
    lock.write(b'0')
    lock.flush()
    lock.seek(0)
    try:
        msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
    except OSError:
        lock.close()
        return 0
    try:
        token = os.environ.get('PLAY_METRIC_SERVICE_TOKEN')
        if not token:
            path = root / '.env.local'
            if path.exists():
                for line in path.read_text(encoding='utf-8-sig').splitlines():
                    key, sep, val = line.strip().partition('=')
                    if sep and key == 'COLLECTOR_SECRET':
                        token = val.strip()
                        if len(token) >= 2 and token[0] == token[-1] and token[0] in ('"', "'"):
                            token = token[1:-1]
                        break
        log = state / (datetime.now().strftime('%Y-%m-%d') + '.log')
        with log.open('a', encoding='utf-8') as out:
            out.write('\nInicio: ' + datetime.now().isoformat() + '\n')
            out.flush()
            if not token or len(token) < 32:
                out.write('Falta COLLECTOR_SECRET vigente en .env.local. No se ejecutó la importación.\n')
                return 1
            env = dict(os.environ, PLAY_METRIC_SERVICE_TOKEN=token, PYTHONIOENCODING='utf-8')
            try:
                result = subprocess.run([sys.executable, '-u', str(root / 'collector' / 'sync_nba.py'), '--season', 'auto', '--competition', 'all', '--skip-enrichment', '--upload', 'https://play-metric-vercel.vercel.app', '--output', str(state / 'snapshot.json')], cwd=root, env=env, stdout=out, stderr=out, timeout=720)
                code = result.returncode
            except subprocess.TimeoutExpired:
                out.write('La sincronización superó 12 minutos. Revisar las importaciones confirmadas en este registro.\n')
                code = 1
            out.write('Fin: ' + datetime.now().isoformat() + ' código=' + str(code) + '\n')
            return code
    finally:
        lock.seek(0)
        msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
        lock.close()

if __name__ == '__main__':
    raise SystemExit(main())
