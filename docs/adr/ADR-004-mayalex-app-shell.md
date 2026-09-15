# ADR-004 — MayaLex App Shell / Vertical Navigation

**Estado: `ACCEPTED`** (2026-09-14, Fase 1 Paso 1A — Human Owner, con revisión de arquitectura/seguridad)

**Nota de convención:** no existe un directorio `docs/adr/` previo en este repositorio (se buscó exhaustivamente — solo existen `docs/governance/DECISION_LOG.md`, `docs/backlog/`, `docs/runbooks/`). Este es el primer ADR formal del repo. Se adopta la ruta sugerida `docs/adr/ADR-NNN-titulo.md` como convención inicial. Las decisiones de gobernanza generales (fuera de arquitectura de producto) siguen registrándose en `docs/governance/DECISION_LOG.md`, sin duplicarse aquí.

**Aceptar este ADR no autoriza su implementación.** `PRODUCT_IMPLEMENTATION: NOT_AUTHORIZED` hasta `HUMAN_GO` explícito y limitado para construcción.

---

## Contexto

Verificado contra `origin/main @ 00b74484a9c933c7e8f0ea995b725509e327f098` (ver `EXEQUATUR_MASTER_ENGINEERING_BLUEPRINT.md`, Secciones 2 y 8): la aplicación autenticada de MayaLex hoy es una estructura plana — `/chat` y `/cuenta`, cada una con su propio guard de sesión a nivel de página, sin navegación compartida ni concepto de "vertical". El resto de `app/` son páginas de marketing/SEO (V2). No existe un App Shell autenticado unificado.

Exequátur de Notario necesita integrarse como una vertical funcional dentro de MayaLex (Inicio/Estudio/Preguntas/Progreso/Tribunal) sin convertirse en una segunda aplicación, un micrositio, o un dashboard pegado — principio ya establecido en el Master Blueprint (Sección 9, CANON de vertical desacoplable).

## Decisión

MayaLex adoptará **progresivamente** un App Shell autenticado común capaz de alojar múltiples verticales (la funcionalidad jurídica existente y Exequátur), sin exigir un rediseño total previo de `/chat` ni de `/cuenta`.

## Principios obligatorios

El App Shell debe:

- preservar la funcionalidad existente;
- preservar las rutas existentes cuando sea razonable;
- evitar un rediseño "big-bang";
- permitir navegación entre funcionalidades de MayaLex;
- integrar Exequátur como vertical, no como aplicación separada;
- soportar responsive/mobile;
- mantener accesibilidad (ver Master Blueprint, Sección 34 — la auditoría de accesibilidad existente no cubre `/chat`/`/cuenta`, brecha a considerar durante el diseño del Shell);
- evitar duplicar autenticación (reutilizar Supabase Auth + guards por página, Sección 2 del Blueprint);
- evitar duplicar billing (reutilizar PayPal/`subscriptions` existente);
- evitar un segundo frontend independiente.

## Arquitectura de información conceptual (NO rutas definitivas)

```text
MayaLex
├── Chat / funcionalidad jurídica existente
├── Exequátur
│   ├── Inicio
│   ├── Estudio
│   ├── Preguntas
│   ├── Progreso
│   └── Tribunal [future / gated]
└── Cuenta
```

Estos nombres son conceptuales. La arquitectura de información definitiva de frontend podrá ser refinada por Cursor durante la fase de diseño — este diagrama no debe leerse como especificación de rutas, componentes, ni URLs finales.

## Ownership

- **Implementación:** `OWNER: CURSOR` · `REVIEWER: CLAUDE`
- El Human Owner conserva la autorización final. Ningún agente implementa todavía.

## Consecuencias / dependencias

- El primer incremento de Exequátur (Master Blueprint, Sección 35) incluye "MayaLex App Shell" + "Exequátur Shell" con el flag correspondiente en OFF (ver ADR-005) — este ADR desbloquea ese diseño, no su construcción.
- No se crean rutas, layouts, ni componentes en el marco de este ADR.

## Referencias

- `EXEQUATUR_MASTER_ENGINEERING_BLUEPRINT.md`, Secciones 2, 8, 9, 27, 28, 35.
- `EXEQUATUR_RECONCILIATION_REPORT.md` (evidencia de baseline `origin/main @ 00b7448`).
