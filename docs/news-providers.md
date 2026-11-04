# Noticias de Statlane

Currents Free es el proveedor principal cuando está configurada la variable privada `CURRENTS_API_KEY` en Vercel. La clave nunca se envía al cliente, no usa el prefijo NEXT_PUBLIC_ y no se guarda en GitHub.

La documentación oficial permite uso comercial del plan gratuito con atribución y enlace al artículo original: https://currentsapi.services/en/docs/ . Incluye 250 consultas por día, sin tarjeta. Se muestran exclusivamente titulares y metadatos con enlaces a los medios originales; no se republican textos ni resúmenes generados. El panel lateral utiliza la URL de imagen suministrada por Currents únicamente para dominios de medios/CDN permitidos. No descarga ni almacena fotografías ni obtiene imágenes desde el HTML de artículos. Cada tarjeta conserva el enlace y atribución original; una imagen ausente, no permitida o rota se omite por completo y el titular ocupa el ancho disponible. Los títulos se muestran completos.

Se busca primero en español y, si hay menos de cinco titulares aceptados, en inglés. Una concesión persistente compartida limita el trabajo a dos consultas cada 15 minutos (hasta 192 por día con actividad continua), independientemente de visitantes o procesos serverless. El recolector programado llama al mismo servidor para no duplicar la cuota desde GitHub. No existe un parámetro público para forzar consultas.

Si Currents falla o no tiene titulares válidos, se intenta GDELT una sola vez. Se respeta Retry-After y se aumenta la espera frente a fallos sucesivos. El último índice útil se conserva sin fingir que se actualizó; los titulares vencen a los siete días y se eliminan del índice al leer/escribir. No se mantiene un archivo histórico.

La atribución Powered by Currents News API se muestra al utilizar ese proveedor, además del medio y enlace original de cada noticia. Las fechas publicadas por Currents se distinguen de las fechas de detección de GDELT.

Configuración: crear cuenta Free, añadir CURRENTS_API_KEY en Vercel como variable de servidor y volver a desplegar. Verificar GET /api/news: provider Currents, status ready, artículos y fetchedAt no vacío. La ausencia de clave conserva GDELT como respaldo; no se considera activado Currents hasta verificar una consulta real de producción.
