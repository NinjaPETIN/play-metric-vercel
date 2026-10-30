# Calidad y deuda técnica

## Controles automáticos

El workflow `Calidad del repositorio` ejecuta instalación reproducible, ESLint con base heredada, TypeScript, pruebas Node/Python, auditoría de producción, build y pruebas HTTP de importación contra una base temporal sintética. No necesita secretos de producción.

`npm run lint:strict` ejecuta ESLint directamente: **todavía falla por deuda heredada**. `npm run lint` identifica cada error heredado por archivo, regla, mensaje y huella de la línea; informa el total y falla ante cualquier error nuevo. No se desactivaron reglas. `node scripts/lint-baseline.mjs --prune` solo puede quitar entradas que ya no aparecen: nunca incorpora errores nuevos.

## Pendientes conocidos (29/10/2026)

- 39 errores ESLint heredados y 35 advertencias después de corregir 15 errores de la revisión inicial. Predominan tipos `any` en límites JSON, sincronización de estado con recursos externos y enlaces con navegación completa. La lista exacta está en `eslint-baseline.json`; el total puede disminuir con correcciones futuras.
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
