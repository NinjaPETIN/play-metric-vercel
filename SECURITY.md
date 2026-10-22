# Seguridad

No publicar contraseñas, enlaces de acceso, tokens, archivos `.env.local`, copias de la base ni datos personales en issues o pull requests. Para informar un problema, describir el comportamiento, la ruta y los pasos mínimos sin incluir credenciales.

## Límites de confianza

- Supabase verifica la identidad. El navegador no decide el UUID ni el rol.
- `ADMIN_USER_ID` es un UUID configurado en el servidor. Vacío no otorga administración.
- `COLLECTOR_SECRET` autoriza escrituras de datos y debe tener al menos 32 caracteres. No es una variable pública ni se envía al navegador.
- Turso y los secretos de Google OAuth permanecen en el servidor y en Supabase, respectivamente.
- Las cuotas y los beneficios se verifican por petición. Las colecciones gratuitas no contienen historiales completos ni fuentes Pro.
- Las fuentes externas se validan antes de activar una generación. Las noticias son enlaces atribuidos; un titular no confirma disponibilidad médica.

## Comprobaciones

`npm test` cubre controles de acceso, cuotas simultáneas, CSP, redirecciones e importaciones. `npm run audit:production` comprueba los avisos conocidos de las dependencias de producción. Esto no equivale a una auditoría de penetración ni garantiza ausencia de vulnerabilidades.

El 22/10/2026 se actualizó Next.js de 16.4.0 a 16.4.2. Referencias: [imagen SVG](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Server Actions](https://github.com/advisories/GHSA-p3m5-59mp-jv5r), [use cache](https://github.com/advisories/GHSA-673q-mjm6-r5xr).

La auditoría completa de herramientas de desarrollo se documenta en [calidad](docs/calidad.md). No utilizar `npm audit fix --force` para ocultar avisos a costa de degradar versiones.
