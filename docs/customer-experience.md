# Experiencia del cliente

## Inicio por cuenta

En Personalizar mi inicio se puede elegir Jugadores, Partidos o Mi jornada. Se aplica al entrar a `/` con una cuenta; un enlace explícito a otra sección o con filtros conserva su destino. Se guarda por identidad verificada en el servidor y funciona tanto para cuentas gratuitas como Pro/administrador.

## Consultas recientes

Al permanecer 1,5 segundos en una ficha con datos se guarda su selección. Conserva jugador, estadística, línea, dirección, temporada, localía, rival, mínimos de minutos, compañero, exclusiones y muestra fijada cuando cabe en 200 encuentros. Para selecciones mayores se conservan filtros y período. El usuario puede retomar hasta 12 consultas y borrar la lista; no modifica favoritos ni vistas guardadas. La persistencia no usa almacenamiento compartido del navegador. Caducidad: 30 días, limpieza al registrar nuevas consultas, límite de 12 aplicado en una transacción. No guarda búsquedas libres ni parámetros desconocidos de la URL.

## Muestra y recuperación

El resumen visible indica estadística, línea, dirección y cantidad de registros. Las condiciones opcionales se quitan individualmente. Cambiar período, rival, localía o mínimo de minutos libera una muestra fijada anteriormente; las exclusiones se mantienen hasta que el usuario las quite. Sin datos se distingue entre carga pendiente, error, ausencia de partidos, filtros sin coincidencias y estadística faltante; ofrece reintentar, ampliar, limpiar, restaurar exclusiones o pasar a puntos.

## Comparación

Hasta tres jugadores, un mercado y línea común y un máximo compartido para los gráficos. El gráfico muestra hasta 30 encuentros por jugador para mantener legibilidad; la tabla analiza toda la muestra filtrada. Las fechas y cantidades disponibles de cada jugador pueden diferir. Los datos ausentes no se grafican como cero.

## Verificación

Pruebas automatizadas: aislamiento entre cuentas, preferencias gratuitas/administrador, enlaces sin redirección externa, retención, límite concurrente y deduplicación de recientes, favoritos intactos y escala común con datos faltantes. Se conserva la suite de autorización y límites de jugadores existente.

La verificación visual de una cuenta autenticada requiere sesión válida del usuario; no se crean bypasses de autenticación ni se usan datos simulados en producción para habilitarla. Registrar por separado los recorridos comprobados en el navegador y cualquier limitación.
