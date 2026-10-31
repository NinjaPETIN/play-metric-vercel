# Recolectores

Los workflows y la configuración vigente se describen en [README](../README.md) y [operación](../docs/operacion.md).

- `sync_rosters.mjs --upload`: 30 plantillas oficiales, separadas del equipo histórico.
- `sync_free.mjs`: intenta box scores oficiales de NBA CDN, con respaldo ESPN y reconciliación exacta del calendario NBA, identidades y puntos de ambos equipos. Dos fallos de NBA suspenden los intentos oficiales durante esa ejecución para no demorar el respaldo. `--probe` comprueba sin importar datos y registra cuántos partidos provienen de cada fuente.
- `sync_news.mjs`: titulares GDELT y envío al receptor protegido. El proveedor puede limitar solicitudes o fallar; no crea noticias alternativas.
- `sync_nba.py`: recolección completa y calendario oficial; uso manual si la fuente rechaza runners de nube.
- `sync_traits.py`: enriquecimiento individual opcional.
- `sync_league_traits.py --upload https://play-metric-vercel.vercel.app --competition regular --report nba-advanced-report.json`: zonas, pases y defensa de todos los jugadores disponibles. El workflow `nba-advanced.yml` lo intenta diariamente desde GitHub Actions, separado del historial básico. Cada fuente se importa y se vuelve a leer para verificarla. Si NBA no responde, conserva el dato previo, escribe el diagnóstico y falla explícitamente; nunca informa una actualización exitosa sin datos.

No se ejecutan estas consultas en cada visita ni dentro de las peticiones de Vercel. No se usan proxies para eludir bloqueos. La frecuencia programada no garantiza disponibilidad ni datos en vivo. El informe de tracking se conserva 14 días en los artefactos de Actions.

`PLAY_METRIC_SERVICE_TOKEN` debe coincidir con `COLLECTOR_SECRET` del servidor. Nunca utilizar el antiguo token de Sites, publicar el secreto ni ejecutar el recolector completo dentro de una petición web.

```sh
python -m unittest discover -s collector -p 'test_*.py'
```
