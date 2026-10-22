# Play Metric

Estadísticas NBA en español: históricos por competición, gráficos por jugador, filtros de muestra, comparación y seguimiento. Incluye autenticación con Google/correo, cuotas gratuitas y beneficios Pro mediante códigos. Los cobros no están habilitados.

**Web:** https://play-metric-vercel.vercel.app/ · **Estado de datos:** https://play-metric-vercel.vercel.app/api/status

## Stack

Next.js 16.4.2 / React 19 · TypeScript · Supabase Auth · Turso/libSQL con Drizzle · Vercel · recolectores Node y Python en GitHub Actions.

## Desarrollo local

Requiere Node 22 y npm. Python 3.11+ se utiliza para el recolector completo y sus pruebas.

```sh
npm ci
```

Copiar `.env.example` a `.env.local` y completar las variables necesarias. En PowerShell: `Copy-Item .env.example .env.local`.

```sh
node --env-file=.env.local --import tsx scripts/init-db.ts
npm run dev
```

Para desarrollo se puede usar `TURSO_DATABASE_URL=file:local.db`. Inicializar la base no crea cuentas ni estadísticas. Para ingresar hace falta configurar Supabase; sus claves públicas pueden exponerse, sus secretos de servidor no.

## Comprobaciones

```sh
npm run check
npm run audit:production
npm run build
```

```sh
python -m pip install -r collector/requirements.txt
python -m unittest discover -s collector -p 'test_*.py'
python -m unittest discover -s tests -p 'test_*.py'
```

CI ejecuta controles de tipos, pruebas, auditoría de producción, compilación e importaciones sintéticas locales. No utiliza la base remota ni secretos de producción. ESLint tiene una [base explícita de deuda heredada](docs/calidad.md): no es una declaración de código libre de errores.

## Datos: qué está automatizado

| Datos | Proceso | Frecuencia solicitada |
|---|---|---|
| Plantillas actuales | `roster-sync.yml` / NBA.com | Cada hora |
| Partidos terminados | `game-sync.yml` / respaldo ESPN reconciliado con calendario NBA | Cada 6 horas |
| Titulares enlazados | `news-sync.yml` / GDELT | Cada 30 minutos |
| Recolección NBA completa | `nba-sync.yml` / Python | Manual |

GitHub puede retrasar ejecuciones y las fuentes pueden fallar. **No es un servicio de datos en vivo ni se garantiza cobertura completa.** Se mantienen separados equipo actual, equipo histórico, competición y temporada. No se inventan identidades, marcadores ni lesiones para completar datos faltantes.

Los titulares conservan fuente, enlace y hora de detección. GDELT presenta errores de conexión y límites de solicitudes; cuando no hay un índice válido la web informa que la fuente no está disponible. No hay parte médico estructurado integrado.

## Producción y secretos

- Usar Turso remoto en Vercel: un SQLite local no persiste entre funciones.
- Configurar `APP_URL`, las dos variables públicas de Supabase y las credenciales privadas de Turso.
- Habilitar Google y correo en Supabase; autorizar exactamente la URL `/auth/callback` del dominio publicado.
- Configurar el mismo secreto de al menos 32 caracteres como `COLLECTOR_SECRET` en Vercel y en GitHub Actions. Los workflows lo transmiten como `PLAY_METRIC_SERVICE_TOKEN`.
- `ADMIN_USER_ID` es el UUID de Supabase del administrador. Vacío no concede permisos.
- No guardar `.env.local`, tokens, backups ni datos de cuentas en el repositorio.

## Documentación

- [Operación, fuentes y recuperación](docs/operacion.md)
- [Arquitectura y límites de acceso](docs/arquitectura.md)
- [Calidad y deuda técnica pendiente](docs/calidad.md)
- [Seguridad](SECURITY.md)
- [Cómo contribuir](CONTRIBUTING.md)
- [Recolectores](collector/README.md)

El diseño mantiene temas claro/oscuro, uso de cuenta y vistas móviles. La frecuencia histórica no representa una probabilidad futura ni una cuota de una casa de apuestas.
