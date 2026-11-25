# Calidad y deuda técnica

## Controles automáticos

El workflow `Calidad del repositorio` ejecuta instalación reproducible, ESLint sin errores ni advertencias, TypeScript, pruebas Node/Python, auditoría de producción, build y pruebas HTTP de importación contra una base temporal sintética. No necesita secretos de producción.

`npm run lint` y `npm run lint:strict` ejecutan `eslint . --max-warnings=0`: cualquier error o advertencia hace fallar el control. El antiguo punto de entrada `scripts/lint-baseline.mjs` también es estricto y ya no utiliza excepciones heredadas.

## Estado actual · 25/11/2026

Las advertencias de imágenes, dependencias de efectos y parámetros sin uso fueron corregidas. Las imágenes NBA usan Next Image con dimensiones y orígenes permitidos; las capturas privadas y noticias conservan su carga directa. Los efectos usan dependencias explícitas y la carga de datos lee la última respuesta mediante una referencia para no generar recargas cíclicas.

## Pendientes conocidos (29/10/2026)

- La deuda ESLint registrada en octubre fue resuelta. El archivo histórico `eslint-baseline.json` está vacío y no participa en los controles actuales.
- Noticias GDELT: conectividad y límites externos. No se ha demostrado disponibilidad sostenida y no se publican titulares de muestra como reales.
- Falta validación con participantes reales y una revisión de penetración independiente. Las pruebas automatizadas no sustituyen esas actividades.

## Corregido en esta revisión

- Next.js 16.4.0 → 16.4.2, junto con su configuración ESLint. Auditoría de producción sin vulnerabilidades conocidas al comprobarla.
- Eliminado `drizzle-kit`, herramienta no utilizada que incorporaba dependencias de desarrollo vulnerables. Drizzle ORM y la inicialización SQL se conservan.
- Verificación de calendario con recibo de base de datos, transacción y rechazo de escrituras antiguas. Reintentos idempotentes.
- Caché del servidor y del navegador: una recarga forzada no devuelve una lectura vieja en curso ni la vuelve a guardar. El cliente usa un indicador explícito de recarga y no guarda respuestas privadas. Los errores de una lectura forzada no se disimulan con una copia anterior.
- Orden de declaración de estado, mutación durante render y reloj del calendario; validación acotada de perfiles oficiales y tipado de importaciones de rasgos.
- Punto de entrada de pruebas Python al final del archivo: ejecutar el archivo directamente ya no omite las clases definidas después.
- README, variables de ejemplo, guías, Dependabot y CI.

## Actualización Arena · 29/10/2026

Zod actualizado a 4.6.6 por GHSA-mrhx-c7xc-m3w5. Se comprobaron tipos, esquemas, importaciones y controles de acceso con la nueva versión. Auditoría npm completa y de producción: sin vulnerabilidades conocidas al comprobarlas. Los avisos de desarrollo registrados el 22/10 ya no aparecen con el lockfile actualizado.
