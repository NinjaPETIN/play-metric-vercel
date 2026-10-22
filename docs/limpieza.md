# Limpieza del repositorio · 22/10/2026

Se eliminaron 90 archivos sin referencias desde la aplicación, pruebas o tareas vigentes: componentes de plantilla, integración antigua de Sites, recursos gráficos y fuentes sin uso, snapshots locales de importación, instrucciones de despliegue superadas y el diagnóstico puntual del CDN NBA. Los datos activos se leen de Turso; los JSON eliminados no eran una fuente de respaldo automática. El historial de Git conserva las versiones anteriores.

Se retiraron 17 dependencias directas utilizadas únicamente por los componentes eliminados. Se conservan React DOM y el cliente Supabase por sus integraciones y requisitos de pares.

Se conservan los recolectores, sus descargas públicas, el importador manual y las herramientas de Windows: siguen siendo vías de operación útiles. La configuración vigente está en [operación](operacion.md), [arquitectura](arquitectura.md) y [calidad](calidad.md). La fecha de un archivo por sí sola no determina que sea obsoleto.
