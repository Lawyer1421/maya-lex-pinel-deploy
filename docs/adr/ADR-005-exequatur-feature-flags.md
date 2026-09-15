# ADR-005 — Feature Flag Architecture (Exequátur)

**Estado: `ACCEPTED`** (2026-09-14, Fase 1 Paso 1A — Human Owner, con revisión de arquitectura/seguridad)

**Nota de convención:** primer ADR formal de este repositorio (ver nota equivalente en `ADR-004-mayalex-app-shell.md`). Este ADR complementa, sin reemplazar, el registro de gobernanza existente en `docs/governance/DECISION_LOG.md` — en particular la entrada "Operación Facultades Completas" (2026-08-27) que ya estableció las **Reglas de Riesgo Controlado R1–R8**, directamente aplicables aquí (R1: toda capacidad nueva sale detrás de flag, default OFF; R2: kill switch editable sin redeploy; R3: activación inicial por allowlist de correos).

**Aceptar este ADR no autoriza crear flags, ni modificar `lib/flags.ts`, ni implementar Exequátur.** `PRODUCT_IMPLEMENTATION: NOT_AUTHORIZED` hasta `HUMAN_GO` explícito y limitado para construcción.

---

## Contexto

Verificado contra `origin/main @ 00b74484a9c933c7e8f0ea995b725509e327f098` (Master Blueprint, Secciones 2 y 29): `lib/flags.ts` es infraestructura real y productiva — `KNOWN_FLAGS`, tabla `feature_flags`, `isFlagEnabledForUser(flagName, userEmail)` con allowlist por email, **fail-closed por diseño explícito** (cualquier error de lectura, tabla ausente, fila ausente, o flag desconocido se trata como DESACTIVADO). Ya gatea una capacidad real en producción (`flag_rerank`, reranking Cohere, cableado en `app/api/chat/route.ts:320`). El propio `docs/governance/DECISION_LOG.md` registra que esta infraestructura fue aplicada y verificada en producción el 2026-08-27, con 6 flags sembrados en `enabled: false`.

No existe hoy ningún flag específico de Exequátur.

## Decisión

Exequátur **debe extender** la infraestructura de feature flags existente en MayaLex (`lib/flags.ts` / tabla `feature_flags`). **No se creará un segundo sistema de flags**, salvo que una ADR futura demuestre necesidad explícita y sea aceptada por el Human Owner.

## Principios obligatorios

Los flags de Exequátur deben:

- evaluarse **server-side** (nunca confiar en un flag leído/decidido en el cliente);
- ser **fail-closed** (cualquier fallo de lectura → tratado como OFF, mismo criterio que `lib/flags.ts` hoy);
- permanecer **OFF por defecto**;
- soportar **activación progresiva** (allowlist por email, mismo patrón que `allowed_emails` en `feature_flags`, antes de activación amplia);
- **reutilizar las convenciones existentes** de nomenclatura y almacenamiento, no inventar un formato paralelo;
- ser **testeables** (extender el patrón ya usado en `tests/rag-rerank-flag.test.ts`);
- ser **observables** (registrar activación/desactivación de forma consistente con lo que ya existe para otros flags);
- **no exponer secretos** — `lib/flags.ts` ya advierte explícitamente contra exponer la fila completa de `feature_flags` al cliente (incluye la allowlist de admin, información operativa interna); cualquier flag de Exequátur hereda esa misma restricción.

## Nombres conceptuales (NO creados en este ADR)

```text
EXQ_ENABLED
EXQ_COPILOT
EXQ_TRIBUNAL
```

Estos son nombres **conceptuales**, no físicos. La convención real de `KNOWN_FLAGS` usa `snake_case` en minúsculas con prefijo `flag_` (`flag_corpus_p0`, `flag_rerank`, etc.) — los nombres físicos definitivos (p. ej. `flag_exq_enabled`, `flag_exq_copilot`, `flag_exq_tribunal`) deben adaptarse a esa convención en el momento del diseño físico, no en este documento. **Ningún flag se crea en el marco de este ADR.**

## Distinción crítica — `FEATURE_FLAG != AUTHORIZATION`

Registrado explícitamente, sin excepción:

```text
FEATURE_FLAG != AUTHORIZATION
FEATURE_FLAG != ENTITLEMENT
HIDDEN_UI != ACCESS_CONTROL
```

Un usuario **no adquiere acceso** a una capacidad de Exequátur simplemente porque el flag correspondiente esté activo. Un flag controla *visibilidad/disponibilidad* de una capacidad en el sistema; la *autorización* de un usuario concreto para usarla (tier, entitlement, rol) es una verificación **server-side separada**, igual que hoy `subscriptions.tier` se verifica independientemente de cualquier flag. Ocultar una UI tras un flag no sustituye ni implica control de acceso — cualquier endpoint que exponga una capacidad gateada por flag debe verificar autorización por su cuenta, con o sin el flag activo.

## Ownership

- **Implementación:** preferencia `OWNER: CLAUDE` · `REVIEWER: CURSOR`.
- El Human Owner conserva la autorización final. Ningún agente implementa todavía.

## Consecuencias / dependencias

- El primer incremento de Exequátur (Master Blueprint, Sección 35) requiere estos flags en OFF durante todo el incremento — este ADR desbloquea su diseño físico, no su creación.
- La migración que añadiría filas nuevas a `feature_flags` no se diseña ni se ejecuta en el marco de este ADR.

## Referencias

- `EXEQUATUR_MASTER_ENGINEERING_BLUEPRINT.md`, Secciones 2, 29, 35, 40 (`DO_NOT_TOUCH`: `lib/flags.ts` no se modifica sin revisión de arquitectura/seguridad completa).
- `docs/governance/DECISION_LOG.md` — Reglas de Riesgo Controlado R1–R8, cierre de Fase 0 de flags (2026-08-27).
