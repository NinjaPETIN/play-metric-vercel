# Arena · 29/10/2026

Versión aplicada del prototipo Arena: apertura deportiva, calendario horizontal, tarjetas amplias y columna de noticias/contexto. El inicio mantiene búsqueda, mercados, filtros, seguimiento, cuenta y cuotas. Oscuro por defecto para visitantes nuevos; la elección guardada claro/oscuro conserva prioridad.

La franja usa `/api/nba/calendar`, valida su respuesta y calcula el día en Argentina. Si no hay partidos hoy, identifica la próxima jornada real. Los horarios y resultados corresponden a la última importación; no se ofrece seguimiento en vivo. Cuando falta la fuente se muestra un mensaje con acceso al calendario. Las noticias mantienen sus fuentes y su estado de disponibilidad; no se utilizan titulares ni estadísticas de la imagen de ejemplo.

Las tarjetas muestran el promedio de la selección, referencia, gráfico y frecuencias L5/L10/L20 con sus muestras reales. El mínimo inicial de un partido evita ocultar el comienzo de temporada. La lectura de perfiles y permisos no se modifica.

## Imagen de apertura

`public/images/arena-court.webp` es una imagen decorativa generada con la herramienta integrada de imágenes, convertida a WebP de 1600 × 600 (aproximadamente 100 KB). No representa un partido real ni lleva marcas.

Prompt: “Photorealistic sports editorial website banner background, ultra-wide horizontal composition. Interior professional basketball arena at night viewed from courtside low angle, dramatic deep navy atmosphere, blue light beams, crowded grandstands softly out of focus, wooden court at bottom, a basketball hoop toward right. No players in foreground, no text, no letters, no logos or brands, no watermarks. Left half deliberately darker with abundant empty dark navy negative space for website headline overlay. Realistic premium sports photography, restrained contrast, electric blue highlights, crisp atmospheric stadium architecture. Image intended as background behind interface text, not a screenshot.”

## Verificación

Se agregan pruebas para el cambio de fecha UTC/Argentina, preservación de resultados y selección honesta de la próxima jornada. La revisión visual cubre escritorio, móvil y los dos temas.
