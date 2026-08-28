# Decision Log — Maya Lex IA

Registro de resoluciones del fundador (Fredy Pinel) sobre cambios de gobernanza y
operaciones de alto impacto en `mayalexhn.com`. Cada entrada queda fechada y
referenciada — este archivo es la fuente de verdad de qué fue autorizado, por quién,
y bajo qué condiciones, independiente de la memoria de cualquier sesión de trabajo.

---

## 2026-08-XX — Bloqueo de producción original

**Resolución**: Maya Lex V2 (`mayalexhn.com`) declarado PRODUCTION — PROTECTED / LOCKED.
Prohibido modificar código, mergear, migrar, cambiar configuración de Supabase/Vercel,
sincronizar clones, refactorizar o actualizar dependencias sin autorización explícita
del fundador para esa acción puntual. Ver contexto histórico completo en la memoria de
sesión `feedback_mayalex_production_lock`.

---

## 2026-08-27 — Operación "Facultades Completas": autorización y reglas de riesgo controlado

**Resolución**: el fundador autoriza formalmente la integración de capacidades V1
(corpus normativo P0, corpus profesional anonimizado, OSINT) y nuevas capacidades
(Expediente Privado, Voz, QuotaPaywall, ingeniería comercial completa, activación de
jurisprudencia piloto), sustituyendo el bloqueo de producción anterior por las
**Reglas de Riesgo Controlado (R1–R8)**:

- **R1**: toda capacidad nueva o fusionada sale detrás de feature flag, default OFF.
- **R2**: kill switch global por flag, editable sin redeploy.
- **R3**: activación inicial solo para rol admin y grupo controlado (lista de correos).
- **R4**: RLS estricto en toda tabla nueva; backup de Supabase antes de cada migración.
- **R5**: cero PII en logs; nunca imprimir contenido de documentos, solo metadatos.
- **R6**: hallazgos del corpus P0 sin prueba automática posible quedan excluidos hasta
  revisión humana del equipo jurídico — nunca resueltos por el asistente.
- **R7**: el corpus profesional anonimizado nunca reproduce fragmentos con datos de
  terceros — solo aporta estructura/criterio/lenguaje/patrones.
- **R8**: Preview deploy por fase → verificación → merge a `main` con flag OFF →
  activación gradual.

Plan completo entregado en `plan-integracion-facultades-completas.md` (6 fases + Fase 0
de prerrequisito de infraestructura, no solicitada originalmente pero identificada como
bloqueante para R1/R2).

**Decisiones específicas del fundador sobre el plan (mismo día)**:

- **D1 — Fase 0 (infraestructura de flags)**: APROBADA. Ejecutar primero.
- **D2 — Fase 1 (corpus normativo P0)**: APROBADA según la propuesta. Hallazgos
  técnicos de `HUMAN_LEGAL_REVIEW_QUEUE` se resuelven con prueba automática; los de
  fondo jurídico quedan EXCLUIDOS de producción hasta revisión del equipo jurídico del
  fundador — el asistente nunca decide fondo jurídico. La cola se entrega en bloques de
  50 para revisión.
- **D3 — Fase 2 (corpus profesional anonimizado)**: **Opción B** — ningún texto
  profesional crudo se indexa para retrieval. Se construye una capa de extracción de
  patrones/estructura previa a la indexación. Los documentos originales permanecen
  únicamente en un bucket privado accesible por rol admin (curaduría), fuera del RAG.
  Escaneo automático anti-reidentificación sobre el 100% del corpus; auditoría semántica
  de reidentificación sobre muestra estadística; cualquier documento marcado por
  cualquiera de los dos métodos queda excluido. Los fragmentos ejemplares candidatos
  solo entran a la biblioteca de modelos con aprobación humana documentada.
- **D4 — Fases 3–6**: APROBADAS según el desglose del plan. Ejecución fase por fase,
  con reporte intermedio antes de continuar a la siguiente.
- **D5 — Gobernanza**: este archivo. Cada resolución del fundador queda registrada aquí
  con fecha y referencia.

**Alcance explícito de esta autorización**: entorno con únicamente usuarios controlados
del entorno personal del fundador; no hay lanzamiento público de estas capacidades hasta
activación explícita posterior fase por fase.

---

*Próxima entrada: cierre de Fase 0 (infraestructura de feature flags).*
