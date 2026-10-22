# Cambios en Play Metric

1. Crear una rama para el cambio y conservar el `package-lock.json`.
2. Instalar con `npm ci` y configurar `.env.local` desde `.env.example` si hace falta ejecutar el servidor.
3. Ejecutar `npm run check`, `npm run audit:production` y `npm run build`.
4. Si se cambia el recolector Python: `python -m unittest discover -s collector -p 'test_*.py'`.
5. Describir problema, cambio y comprobaciones en el pull request. No incluir secretos ni datos reales de cuentas.

Para importaciones, probar con una base sintética local o una copia privada de pruebas. `scripts/verify-update.mjs` crea su propia base temporal y no usa la base remota. No fabricar partidos, asignaciones de equipo, lesiones ni noticias para hacer pasar una comprobación.

ESLint mantiene una base explícita de errores heredados: ver [deuda técnica](docs/calidad.md). Los errores nuevos fallan en CI. No ampliar esa base ni desactivar reglas para hacer pasar un cambio; eliminar entradas solo después de corregirlas.
