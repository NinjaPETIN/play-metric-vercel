# Optimización de Statlane · 25 de noviembre de 2026

Se revisó la estructura de aplicación, componentes, bibliotecas de datos, API, estilos, recolectores y comprobaciones del repositorio. El análisis estático recorrió 266 archivos TypeScript/TSX y 1.106 importaciones; también se inspeccionaron los 27 archivos CSS. Esto no equivale a una auditoría manual exhaustiva ni permite afirmar que no existan otros cuellos de botella.

## Cambios

- Eliminación de importaciones y cálculos sin uso en API, proveedor, ficha, seguimiento y dashboard. TypeScript ahora rechaza variables e importaciones locales sin uso mediante `noUnusedLocals`.
- Extracción del minigráfico de historial. Conserva barras, colores, ceros, títulos y modo de lectura; elimina la rama de gráfico grande que ya no tenía consumidores y su observador de tamaño.
- Carga separada de módulos exclusivos de la ficha. El diálogo común de exportación se carga al abrirlo. Las funciones que dibujan las tarjetas diarias se importan al descargar, separadas del formato de números y fechas utilizado por la pantalla.
- Distribuciones: una sola lectura y ordenación por muestra, conteo de intervalos en una pasada y reutilización de ambos resultados con escala común. La comparación se memoriza según sus entradas.
- Sensibilidad: conteo sobre valores ordenados mediante límites binarios, conservando referencia exacta, dirección, ceros, empates y datos faltantes.
- Los estilos y el orden de su cascada se conservan para evitar regresiones visuales. No se compacta el código fuente para reducir artificialmente sus líneas.

## Validación local

`npm run check`: 149 pruebas aprobadas; comprobación de tipos aprobada. ESLint pasa de 47 a 30 advertencias existentes, sin errores nuevos. Las pruebas agregadas contrastan el conteo optimizado con un conteo directo y comprueban muestras vacías, parciales y completas con escalas compartidas.

Comparación local con la implementación anterior, Node 24.19.0: historial sintético de 5.000 partidos, 100 ejecuciones por tanda, mediana de cinco tandas tras calentamiento. Se comprobó igualdad exacta de los resultados antes de medir.

| Cálculo | Antes | Después |
| --- | ---: | ---: |
| Comparación de distribuciones | 1.013,85 ms | 270,99 ms |
| Sensibilidad a la línea | 170,20 ms | 154,65 ms |

Son mediciones del cálculo con un historial grande, no tiempos de carga ni mejoras porcentuales de la web completa. La red, la base de datos, el dispositivo y la muestra real pueden dominar el tiempo percibido. La compilación de producción y la revisión de los flujos en navegador se verifican durante el despliegue.
