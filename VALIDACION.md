> Registro histórico del 11/10/2026. No describe el estado actual. Consultar README.md y docs/calidad.md para los controles y pendientes vigentes.

# Validación · 11 de octubre de 2026

- `npm run build`: producción Next.js 16.4.0 con webpack, 27 rutas compiladas; sin ignorar errores TypeScript.
- `npm run typecheck`: correcto.
- `npm test`: 4 pruebas/suites correctas, incluyendo cálculos estadísticos, destinos OAuth, secreto de servicio, Drizzle, rollback, concurrencia de canjes y cuotas.
- Python en entorno virtual con requirements: 12 pruebas correctas del recolector.
- `npm audit --omit=dev`: cero vulnerabilidades reportadas. Es una comprobación de dependencias conocidas, no una garantía de ausencia de vulnerabilidades.
- HTTP sobre servidor Next de producción local: inicio/login 200; perfil/favoritos/jugador sin sesión 401; administración sin rol 403; importaciones y lectura privada sin token 401. Se enviaron cabeceras falsificadas de identidad de Sites y no autorizaron acceso.
- HTTP con secreto de servicio válido: lectura de trabajos 200; snapshots vacíos rechazados 400 antes de publicar datos.
- Inicialización de esquema y backup consistente vacío: correctos, sin insertar estadísticas falsas.

Pendiente por requerir proyectos/credenciales externas: Google OAuth real, sesión de dos cuentas, Supabase remoto, base Turso remota, carga NBA en el nuevo destino, transferencia verificada de cuentas antiguas, runner horario, prueba visual y latencias fría/caliente en Vercel. No se publicó ni se modificó la web original. No se habilitaron pagos.
