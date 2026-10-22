# Recolectores

Los workflows y la configuración vigente se describen en [README](../README.md) y [operación](../docs/operacion.md).

- `sync_rosters.mjs --upload`: 30 plantillas oficiales, separadas del equipo histórico.
- `sync_free.mjs`: partidos terminados de ESPN, solo con reconciliación exacta del calendario NBA, identidades y puntos de ambos equipos. `--probe` comprueba sin importar datos.
- `sync_news.mjs`: titulares GDELT y envío al receptor protegido. El proveedor puede limitar solicitudes o fallar; no crea noticias alternativas.
- `sync_nba.py`: recolección completa y calendario oficial; uso manual si la fuente rechaza runners de nube.
- `sync_traits.py` y `sync_league_traits.py`: enriquecimiento opcional.

`PLAY_METRIC_SERVICE_TOKEN` debe coincidir con `COLLECTOR_SECRET` del servidor. Nunca utilizar el antiguo token de Sites, publicar el secreto ni ejecutar el recolector completo dentro de una petición web.

```sh
python -m unittest discover -s collector -p 'test_*.py'
```
