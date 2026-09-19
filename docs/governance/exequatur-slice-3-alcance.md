# Exequátur Slice 3 — Alcance y scaffolding

**Rama:** `cursor/exequatur-slice-3-diagnostico-d401`  
**Base:** `origin/main` @ `2da171840ae362e23349c3bd0fbd5a8156efe9c6` (merge PR #42 / Slice 2 HEAD `475ec016`)  
**Flag:** reutiliza `flag_exq_enabled` (Slice 1). Sin flag nuevo. Sin activación (P3 fundador).

## Qué entra en Slice 3

Diagnóstico de colocación + plan de estudio derivado del currículo Slice 2.

- Banco de ítems versionado en el repositorio (sin tabla, sin migración).
- Cada ítem apunta a un `LearningObjective.id` existente. No cita texto legal.
- Evaluación determinística por `opcionId` (sin LLM, sin “closest match”).
- Plan de estudio = lecciones del currículo cuyos objetivos el usuario falló o no contestó.
- Rutas hijas de `app/exequatur/layout.tsx` (misma puerta Slice 1).
- Localizadores legales en el plan son los del objetivo; el texto de ley sigue resolviéndose solo en la lección vía `resolverReferenciaLegal`.

## Qué no entra (ciclo posterior / otros frentes)

| Frente | Estado |
|---|---|
| Formularios de instrumentos notariales | Slice 4+ |
| Validación sustantiva de un acto concreto | Slice 4+ |
| Generación / procesamiento documental | Slice 5+ |
| Persistencia de progreso / intentos | Slice 3B (`feat/exequatur-slice-3b-persistence`) |
| Ingesta masiva de normativa | frente aparte; no este PR |
| Campaña / marketing / flags de lanzamiento | P3 fundador |
| Cambios PayPal, subscriptions, `lib/rag/search.ts`, `access.ts` | prohibido |

## Invariantes (heredados)

```
free / académico     → DENY
pro + flag           → ALLOW
admin + flag         → ALLOW_INTERNAL
flag off/ausente/error → DENY

INGESTED != VERIFIED != VIGENTE
0 / >1 evidencia conflictiva → NO_VERIFICADO (adaptador Slice 2; este slice no lo reimplementa)
```

Ítems desconocidos, `objetivoId` huérfano o slug de lección inválido se descartan. Nunca se resuelve el objetivo de otro módulo por un ID fabricado.

## Superficie

| Ruta | Rol |
|---|---|
| `/exequatur` | Entry: enlaces a módulos + diagnóstico |
| `/exequatur/diagnostico` | Formulario de colocación |
| `/exequatur/plan` | Plan derivado (query `objetivos=` validada contra IDs del currículo) |

## Criterio de cierre de Slice 3

- Tests estructurales del banco + evaluación + plan.
- Regresión Slice 1 (auth) y gate único (`layout.tsx`).
- Typecheck verde.
- Sin SQL, sin secretos, sin write a corpus.
