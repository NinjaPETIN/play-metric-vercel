# Actualización de Play Metric sobre la versión A

## Aplicar

Copiá las carpetas y archivos de este paquete sobre tu proyecto, SIN borrar archivos existentes y SIN modificar `.env.local` ni las variables de Vercel. Incluí la carpeta `.github` (contiene la tarea programada). No hay cambios de dependencias.

Ejecutá `npm test` y `npm run build`. Revisá los cambios en GitHub Desktop y subí Commit + Push. Esperá Ready en Vercel. `vercel.json` ahora ubica las funciones en São Paulo, cerca de tu Turso; no cambia la región de Supabase.

## Activar las actualizaciones

En GitHub, abrí el repositorio `NinjaPETIN/play-metric-vercel`:

1. Settings → Secrets and variables → Actions → New repository secret.
2. Name: `COLLECTOR_SECRET`.
3. Secret: el mismo COLLECTOR_SECRET vigente del servidor en Vercel. No compartirlo por chat ni guardarlo en código.
4. Add secret.
5. Actions → Actualizar NBA de Play Metric → Run workflow. Seleccioná la rama principal y ejecutalo después de que el despliegue esté Ready.
6. Comprobá una ejecución exitosa y verificá temporada regular, pretemporada, playoffs y calendario en la web.

El workflow programado debe estar en la rama predeterminada (habitualmente main) y Actions debe estar habilitado. La tarea corre a los minutos 7, 22, 37 y 52: un intervalo de 15 minutos sin depender de tu PC. GitHub puede retrasar las ejecuciones; no es una garantía de puntualidad exacta. Los minutos de ejecución de tu plan de GitHub se aplican, especialmente en repositorios privados; revisá Usage si se agota la cuota.

## Qué mejora

- Caché de NBA de hasta 24 MB, con entradas de hasta 8 MB: los catálogos grandes ya no quedan descartados por superar 1 MB.
- Varias solicitudes simultáneas comparten la misma lectura.
- Las lecturas son frescas durante 60 segundos. Ante falla temporal, se permite el último dato guardado durante un máximo de 15 minutos; conserva su fetchedAt y se identifica con dataStale=true.
- Las credenciales, límites de uso, favoritos y permisos se validan fuera de la caché. Los errores 4xx nunca se convierten en datos guardados.
- La API de jugador elimina una consulta redundante de cuenta y verifica permisos antes de consultar estadísticas.
- Los lotes siguen midiendo 500 KB y mantienen validación SHA-256, activación completa y lectura posterior exacta.
- Se eliminan los lotes confirmados y se guarda un recibo pequeño para que los reintentos sigan siendo seguros sin acumular copias del historial.
- Las importaciones exitosas invalidan la caché del proceso; otras instancias refrescan como máximo al vencer sus 60 segundos.
- La tarea rápida actualiza por separado las tres competiciones y calendario. No hace consultas lentas de biografías, tiros, pases o defensa en cada ejecución. Esos perfiles mantienen el último dato disponible y se pueden refrescar con el comando completo sin --skip-enrichment.
- No se publica código ni se modifican accesos durante cada sincronización. Si una fuente falla, se conserva su historial anterior y se marca fallida la ejecución para poder diagnosticarla.
- Hay un máximo de 12 minutos por tarea y no se solapan ejecuciones del mismo grupo. GitHub puede omitir tareas pendientes si una sincronización tarda demasiado.

## Validación y límites

Pruebas de TypeScript, caché grande, concurrencia, integridad, autenticación y preservación de carga incompleta. Compilación de producción de Next.js. Prueba HTTP local de una carga sintética de 9,7 MB en 20 lotes: no se envían estadísticas inventadas a tu proyecto.

Las pruebas locales no demuestran tiempos de tu Vercel/Turso/Supabase en producción. El objetivo es cargar en menos de 5 segundos, pero hay que medirlo allí después del despliegue; no hay garantía del 100% ante fallas de terceros o redes lentas. Las mejoras todavía no están activas hasta que publiques el paquete y configures el secreto en Actions.
