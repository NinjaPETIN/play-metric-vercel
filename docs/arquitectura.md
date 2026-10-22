# Arquitectura

- `app/`: páginas y rutas HTTP. Supabase autentica y el servidor determina permisos.
- `components/`: interfaz existente de escritorio/móvil y temas claro/oscuro.
- `lib/`: cálculos, validaciones, cuotas, cachés y acceso a datos.
- `db/`: esquema Drizzle y adaptación de consultas a libSQL.
- `collector/`: importación y conciliación de fuentes; secretos solo en el entorno.
- `tests/`: cálculos, acceso, concurrencia, integridad y recuperación.
- `.github/workflows/`: controles de calidad y tareas de datos independientes.

## Flujo de datos

Fuente externa → validación y conciliación → escritura protegida → generación activa en Turso → control de acceso por petición → respuesta acotada → interfaz.

Las colecciones gratuitas contienen agregados y hasta 30 valores de una estadística seleccionada, sin registros completos por partido, perfiles, comparativas de liga ni fuentes Pro. El ejemplo público es fijo. Los demás historiales requieren acceso autorizado y la cuota se reserva de forma atómica por usuario y día de Argentina.

La caché compartida guarda datos brutos, nunca autorizaciones. Las comprobaciones de plan y cuota se hacen después de la lectura y antes de responder. Una recarga forzada no comparte una lectura anterior en vuelo ni utiliza una copia obsoleta para verificar una importación.

El contexto compara dos muestras consecutivas, completas y sin superposición, con iguales filtros. Las diferencias de minutos o promedios no identifican sus causas ni predicen el próximo partido.
