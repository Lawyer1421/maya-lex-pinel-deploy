---
name: mayalex-preview
description: Generar y validar un Preview protegido de Vercel para una rama de Maya Lex — push, espera de READY, token de acceso, QA de 16+ páginas, diagnóstico runtime de entorno.
---
# Preview de Maya Lex
1. Preflight (skill mayalex-preflight).
2. Push SOLO de la rama de trabajo (`git push origin <rama>`); jamás main.
3. Espera READY: `npx vercel inspect <url> --wait` — si ERROR, leer logs (`--logs`), diagnosticar por el error sanitizado de [articulos-vigentes] y NO desactivar el fallo-duro para "hacer pasar" el build.
4. Token: MCP get_access_to_vercel_url (expira 23h).
5. Diagnóstico runtime: GET /api/diagnostico-preview → debe responder entornoVercel=preview, esStagingEsperado=true, PayPal ausente. Si esProduccionConocida=true → DETENTE (NO-GO).
6. QA integral: qa-16-paginas.ts contra el Preview (enlaces, consola, axe, overflow, red externa) + capturas.
7. Actualiza STATE.json → PREVIEW_READY con deployment id, commit y URL; registra en el ledger.
