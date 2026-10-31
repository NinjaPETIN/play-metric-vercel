# Recopilación gratuita NBA

## Operación

- Plantillas: workflow horario existente, separado del equipo de cada partido histórico.
- Partidos terminados: cada dos horas; calendario NBA y eventos ESPN para descubrir encuentros, box score NBA CDN como primera opción y ESPN como respaldo. No se incorporan partidos en juego.
- Tracking: intento diario independiente de zonas de tiro, pases y defensa desde stats.nba.com para la temporada regular seleccionada por el catálogo. Solo se reemplaza la fuente importada, nunca las demás. Las temporadas y competiciones no se mezclan.
- Vercel lee los datos almacenados; no depende de contactar NBA durante una visita.

## Marcadores en vivo

`GET /api/nba/live` consulta el scoreboard ESPN con un plazo de 8 segundos y valida liga, equipos, marcadores, fechas y estados. Todos los visitantes comparten un presupuesto persistente de una consulta cada 25 segundos. La barra del inicio consulta nuestra API cada 30 segundos solo con la pestaña visible; no consulta ESPN desde el navegador. El reloj muestra la lectura del proveedor, sin simular un cronómetro ni prometer latencia cero.

Los puntos en curso no se guardan como estadísticas históricas. Los enlaces a fichas de partido solo se crean si existe una coincidencia única con fecha y equipos del calendario NBA. Un fallo conserva la lectura anterior como atrasada; después de cinco minutos sus marcadores se ocultan. El calendario histórico queda como alternativa, identificado como tal. Una lectura correcta sin partidos es un resultado válido, no una invitación a inventar encuentros.

### Estadísticas individuales del partido

`GET /api/nba/live/[id]` recibe únicamente un ID NBA de diez dígitos, exige un partido del calendario dentro de 48 horas y lo reconcilia con la jornada ESPN. No acepta IDs ESPN arbitrarios, URLs ni filtros. El presupuesto compartido es una consulta de box score por partido cada 25 segundos, con tamaño y tiempo acotados. Se comprueban ID, fecha, equipos, jugadores únicos, tiros válidos y suma de puntos contra el marcador del mismo resumen; no contra una lectura anterior del scoreboard.

La ficha abre una pestaña de estadísticas en vivo, con titulares, suplentes, líderes en puntos y tablas desplazables. La primera lectura se prepara en el servidor para que aparezca sin esperar el historial privado; después consulta cada 30 segundos mientras la pestaña está visible. Los jugadores que no participaron conservan valores nulos y se muestran con guiones. No se deduce quién está en cancha a partir del campo de titular. Las fotos NBA solo se usan cuando el nombre completo coincide de forma única con el directorio; el resto tiene iniciales. Ante un fallo se conserva la lectura anterior como atrasada y caduca después de cinco minutos.

## Verificación y fallos

El normalizador oficial exige ID, fecha y equipos del calendario, marcador final, identificadores NBA únicos, estadísticas no negativas, consistencia de tiros y suma de puntos de ambas plantillas. Dos intentos oficiales fallidos abren el circuito durante esa ejecución; el respaldo sigue funcionando. Si también falla el respaldo, no se publica ese partido y la sincronización se marca parcial/fallida.

El tracking verifica cada lote mediante una lectura posterior del receptor autenticado. Si una fuente falla, las demás se intentan independientemente y el proceso devuelve error al final. El resumen y el artefacto `nba-advanced-report` de Actions distinguen `verified`, `fresh`, `unavailable` y `failed`, con hora, duración y número de jugadores. Los diagnósticos no contienen credenciales ni cuerpos de respuestas.

## Alcance

Esto habilita una vía gratuita y medible, no una promesa de actualización continua. NBA puede rechazar IP de nube o no publicar tracking para una selección. Los informes fallidos son una limitación real de la fuente, no datos faltantes que deban rellenarse con ceros. No se presentan titulares de noticias como lesiones confirmadas. Rotaciones, tracking de asistencias potenciales y modelos predictivos no se implementan con esta tarea.

Fuentes técnicas: documentación de `nba_api` para [box scores CDN](https://github.com/swar/nba_api/blob/master/docs/nba_api/live/endpoints/boxscore.md), [tracking](https://github.com/swar/nba_api/blob/master/docs/nba_api/stats/endpoints/leaguedashptstats.md) y los colectores de este repositorio.
