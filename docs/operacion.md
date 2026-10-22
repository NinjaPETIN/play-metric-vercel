# Operación

## Verificación de una actualización

1. Consultar `/api/status` y distinguir fecha del último partido, fecha de importación y comprobación de la fuente. Una temporada archivada no equivale a datos de hoy.
2. Revisar el último workflow pertinente. Un fallo externo y un error de publicación deben quedar visibles en los logs.
3. Comprobar temporada, competición y equipo del historial, además de la plantilla actual.

El calendario se activa de forma atómica con una copia anterior. La API devuelve un recibo verificado contra la base. Reintentar el mismo calendario es idempotente; un calendario antiguo o distinto con la misma fecha se rechaza. Una lectura de caché anterior no prueba que haya fallado la escritura.

## Ante un fallo de datos

No reemplazar el historial por datos vacíos ni desactivar verificaciones de identidad o marcadores. Corregir la causa y ejecutar manualmente el workflow correspondiente desde Actions. El respaldo ESPN solo incorpora partidos que coinciden de forma inequívoca con el calendario NBA existente. Si cambia la temporada y falta el calendario oficial, hay que importar uno válido; no asignar IDs inventados.

El recolector completo de Python puede ejecutarse manualmente desde una conexión donde NBA.com responda. No requiere contratar un proveedor, pero la conexión de nube puede ser rechazada.

```sh
python collector/sync_nba.py --season auto --competition all --upload https://TU-DOMINIO --output /RUTA-PRIVADA/snapshot.json
```

Definir `PLAY_METRIC_SERVICE_TOKEN` en el entorno, sin escribirlo en el comando ni en Git. El calendario y cada competición se conservan si la fuente correspondiente falla.

## Noticias

`GET /api/news` devuelve titulares enlazados del índice compartido. La categoría es temática, no confirmación médica. La fecha es detección en GDELT, no publicación. El índice no se consulta por cada jugador; se filtra por nombre completo. Coincidencias ambiguas no vinculan identidades.

`POST /api/news` es privado de servicio. El runner consulta GDELT con reintentos acotados y el servidor valida dominios, fechas y contenido. Las consultas desde Vercel comparten un bloqueo persistente de 15 minutos. Ante fallo, se conserva lo anterior y se indica desactualización; los titulares de más de 7 días vencen. El proveedor puede seguir indisponible aunque el código y el despliegue estén correctos.

## Backups

```sh
node --env-file=.env.local --import tsx scripts/backup-db.ts /RUTA-PRIVADA/backup.json
```

Usar una ruta fuera del repositorio y almacenamiento privado. El script no sobrescribe backups existentes. La generación anterior de una importación no sustituye un respaldo externo. No restaurar sobre producción sin verificar una copia de pruebas.

## Cambio de dominio

Configurar el dominio en Vercel y actualizar `APP_URL`, Site URL y redirect permitido en Supabase. Verificar Google/correo y el retorno a la ficha. No agregar comodines amplios a las redirecciones. Esta revisión no compra ni cambia dominios.
