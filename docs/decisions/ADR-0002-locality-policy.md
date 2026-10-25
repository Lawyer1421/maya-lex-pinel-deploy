# ADR-0002 — Política de localidad default-deny
**Estado:** Aceptado · **Fecha:** 2026-10-25
**Decisión:** Un único punto (`authorize`) decide; la localidad de Ollama se **deriva de la URL**; sensibilidad por defecto `PRIVILEGED`; EXTERNAL exige config + allowlist + aprobación por solicitud + dato no privilegiado.
**Alternativas:** bandera global on/off (demasiado burda); confiar en el nombre del proveedor (frágil).
**Riesgos:** falsos bloqueos (aceptables; se corrige en config).
**Pruebas:** `tests/policy.test.js`, `tests/server.test.js`.
