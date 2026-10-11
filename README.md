# Play Metric · preparación para Vercel

Esta copia separada adapta el proyecto de Sites a Next.js 16.4, Supabase Auth y Turso/libSQL. La publicación original no se modifica. No incluye claves, cuentas, códigos ni estadísticas inventadas. Pagos y exportaciones de usuario siguen sin habilitar.

## Inicio local

Node 22.13 o posterior; Python 3.11 o posterior para el recolector.

```sh
npm ci
cp .env.example .env.local
# Completar las variables indicadas abajo.
node --env-file=.env.local --import tsx scripts/init-db.ts
npm test
npm run typecheck
npm run build
npm start
```

Next carga .env.local; los scripts Node requieren --env-file. Para probar sólo SQL se puede usar TURSO_DATABASE_URL=file:local.db. Nunca usar archivos SQLite locales para persistencia en Vercel: sus funciones requieren una base remota Turso.

## Configuración externa pendiente

1. Crear Supabase, habilitar Google en Auth y configurar su Client ID y Client Secret obtenidos en Google Cloud. El secreto de Google va en Supabase, nunca en NEXT_PUBLIC ni en Git. Usar la URL de callback que muestra Supabase como redirect autorizado en Google.
2. En Supabase configurar Site URL con la URL estable de pruebas de Vercel y autorizar exactamente `https://TU-DOMINIO/auth/callback`. Mantener localhost como redirect de desarrollo sólo si se necesita. Evitar comodines amplios para producción. APP_URL debe coincidir con la URL donde se inicia el login.
3. Crear Turso y completar TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en el servidor. Ejecutar init-db contra esa base antes de abrir el sitio.
4. Copiar las variables de .env.example a Vercel. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY es pública por diseño; TURSO_AUTH_TOKEN y COLLECTOR_SECRET son privados. Generar COLLECTOR_SECRET con `openssl rand -hex 32`.
5. Ingresar con Google y colocar el UUID de esa cuenta Supabase en ADMIN_USER_ID. Nadie es administrador mientras esté vacío. No se aceptan correos ni IDs enviados desde el navegador para otorgar ese rol.
6. Importar este directorio en un repositorio privado y conectar Vercel como proyecto Next.js. No ejecutar el recolector Python dentro de una petición web. Dejar pagos deshabilitados hasta implementar y probar webhooks de cobro.

Google sirve tanto para login como para registro: la primera autenticación crea la cuenta. El cierre de sesión usa un formulario POST mediante Server Action para evitar que un enlace externo cierre sesiones por GET. Los datos personales se leen desde el usuario verificado por Supabase; no se confía en las cabeceras de identidad de Sites.

## Estadísticas y actualización

El recolector completo está en collector/ y se publica también en public/collector/. Instalar `python -m pip install -r collector/requirements.txt`. En el runner privado, definir PLAY_METRIC_SERVICE_TOKEN con el mismo valor que COLLECTOR_SECRET del servidor, y ejecutar:

```sh
python collector/sync_nba.py --season auto --competition all --upload https://TU-DOMINIO --output /tmp/pm-snapshot.json
```

Programa ese comando cada hora en un runner Python externo. La automatización anterior de Sites no apunta a Vercel y NO fue modificada. Antes del cambio definitivo hay que configurar y probar el nuevo runner. El recolector verifica la lectura posterior; conserva cada historial si NBA falla y mantiene separadas las competiciones. `/api/props` es lectura privada de servicio para esa verificación, no un atajo anónimo para acceder a perfiles Pro. Las importaciones requieren Authorization: Bearer y fallan sin un secreto válido de al menos 32 caracteres.

La base nueva comienza vacía. Cargar y verificar regular, pretemporada, playoffs y calendario antes de cambiar el dominio. Si NBA falla, la aplicación anterior se mantiene como origen operativo. No ejecutar importaciones de demostración sobre datos reales.

## Respaldo y cuentas previas

```sh
node --env-file=.env.local --import tsx scripts/backup-db.ts /RUTA-PRIVADA/backup.json
```

El respaldo es consistente y contiene información privada. Guardarlo fuera de Git y del ZIP público; adicionalmente activar los respaldos de la base remota. Las importaciones conservan una generación anterior, pero eso no reemplaza un backup externo.

Los UUID de Sites y Supabase son distintos. Los favoritos, cuotas, membresías y canjes anteriores NO se vinculan automáticamente por correo. Para transferirlos se necesita un respaldo privado y un mapa verificado de IDs; probarlo en una base clonada y verificar que no haya duplicación de canjes antes de modificar la base definitiva. Esta copia no realiza esa transferencia ni contiene los datos de tus cuentas.

## Pruebas antes de habilitar acceso público

Pruebas locales disponibles: cálculos estadísticos; adapter SQL y orden de columnas con Drizzle; rollback de batches; 8 canjes concurrentes con capacidad 2; vencimiento exacto de 30 días; 12 aperturas concurrentes con máximo 5 y reapertura sin consumir usos; secretos de servicio; destinos seguros de OAuth; pruebas Python del recolector.

Con credenciales reales, validar en el entorno de pruebas: primera alta Google y reingreso; sesión vencida y revocada; callback inválido; logout; usuario A no puede leer favoritos/perfil de B; usuario común recibe 403 en administración; cuota 5, renovación a medianoche Argentina, Pro y vencimiento; código repetido, agotado, desactivado y vencido; importaciones sin token 401; lecturas/importaciones con token válido y rollback ante fallos; filtros por equipo/partido/temporada; navegación atrás; medición de latencia fría/caliente de búsquedas y perfiles. No se promete 3 segundos sin medir en el hosting destino.

Fuentes: https://supabase.com/docs/guides/auth/server-side/creating-a-client · https://supabase.com/docs/guides/auth/social-login/auth-google · https://supabase.com/docs/guides/auth/redirect-urls · https://tursodatabase.github.io/libsql-client-ts/interfaces/Client.html · https://vercel.com/docs/frameworks/full-stack/nextjs
