# ADR-0001 — Núcleo en Node 22 sin dependencias
**Estado:** Aceptado (revocable, D-01) · **Fecha:** 2026-10-25
**Contexto:** Proyecto con datos de secreto profesional; una sola persona debe poder auditar el código.
**Decisión:** Núcleo con módulos nativos de Node (`http`, `crypto`, `node:test`).
**Alternativas:** Express/Fastify (más rápido de escribir, +cientos de paquetes transitivos); Python/FastAPI.
**Consecuencias:** Superficie de cadena de suministro ≈ 0; más código propio; migrar a un framework sigue siendo posible detrás de `apps/`.
**Riesgos:** servidor HTTP artesanal → cubierto con pruebas de Host/Origin/tamaño/traversal.
