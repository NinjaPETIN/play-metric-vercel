# Recopilación gratuita NBA

## Operación

- Plantillas: workflow horario existente, separado del equipo de cada partido histórico.
- Partidos terminados: cada dos horas; calendario NBA y eventos ESPN para descubrir encuentros, box score NBA CDN como primera opción y ESPN como respaldo. No se incorporan partidos en juego.
- Tracking: intento diario independiente de zonas de tiro, pases y defensa desde stats.nba.com para la temporada regular seleccionada por el catálogo. Solo se reemplaza la fuente importada, nunca las demás. Las temporadas y competiciones no se mezclan.
- Vercel lee los datos almacenados; no depende de contactar NBA durante una visita.

## Verificación y fallos

El normalizador oficial exige ID, fecha y equipos del calendario, marcador final, identificadores NBA únicos, estadísticas no negativas, consistencia de tiros y suma de puntos de ambas plantillas. Dos intentos oficiales fallidos abren el circuito durante esa ejecución; el respaldo sigue funcionando. Si también falla el respaldo, no se publica ese partido y la sincronización se marca parcial/fallida.

El tracking verifica cada lote mediante una lectura posterior del receptor autenticado. Si una fuente falla, las demás se intentan independientemente y el proceso devuelve error al final. El resumen y el artefacto `nba-advanced-report` de Actions distinguen `verified`, `fresh`, `unavailable` y `failed`, con hora, duración y número de jugadores. Los diagnósticos no contienen credenciales ni cuerpos de respuestas.

## Alcance

Esto habilita una vía gratuita y medible, no una promesa de actualización continua. NBA puede rechazar IP de nube o no publicar tracking para una selección. Los informes fallidos son una limitación real de la fuente, no datos faltantes que deban rellenarse con ceros. No se presentan titulares de noticias como lesiones confirmadas. Rotaciones, tracking de asistencias potenciales y modelos predictivos no se implementan con esta tarea.

Fuentes técnicas: documentación de `nba_api` para [box scores CDN](https://github.com/swar/nba_api/blob/master/docs/nba_api/live/endpoints/boxscore.md), [tracking](https://github.com/swar/nba_api/blob/master/docs/nba_api/stats/endpoints/leaguedashptstats.md) y los colectores de este repositorio.
