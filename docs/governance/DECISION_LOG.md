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

## 2026-08-27 — Cierre de Fase 0

Tabla `feature_flags` aplicada y verificada en producción (6 flags, todos `enabled:
false`). `lib/flags.ts` (fail-closed) mergeado a `main`, desplegado, sin código
consumiéndola todavía — cero impacto de comportamiento. Ver commit `752d8d0` /
merge `0bbecef`.

---

## 2026-08-27 — Fase 1, inicio de triage: HUMAN_LEGAL_REVIEW_QUEUE.jsonl

**Corrección de alcance**: el archivo real tiene 958 líneas, no 602 (cifra del
commit original). Los bloques de 50 se numeran sobre las 958 líneas reales.

**Bloque 1/N** (líneas 1–50, `HN_CODIGO_FAMILIA`, artículos 5–72) clasificado con
prueba automática de dos niveles (normalización de texto + detección de ruido de
extracción de PDF). Resultado: 27 técnicos resueltos, 23 jurídicos pendientes.
Hallazgo de prioridad alta para el equipo jurídico: Art. 68/70 muestran una
diferencia sustantiva real (régimen de bienes separados vs. sociedad de gananciales
como régimen por defecto), no un defecto de extracción. Detalle completo en
`docs/governance/fase1-triage/hn-codigo-familia-bloque-01.md` y `.json`.

Ningún hallazgo de fondo jurídico fue resuelto por el asistente — todos los 23
quedan en la cola de revisión humana, consistente con D2.

---

## 2026-08-27 — Bloque 2/N + paquete Art. 68/70 + Nivel 3 del clasificador

Autorización del fundador (misma fecha): "Continúa con bloque 2... El Art 68/70 lo
revisa mi equipo jurídico... márcalas como prioridad ALTA... no detengas el
proceso." Incorpora también instrucciones de gobernanza detalladas: ranking de
fuente (Gaceta > CEDIJ con fecha > PDF TSC/OEA), `tecnico_resuelto ≠ aprobado para
corpus`, métrica de 958 congelada explícitamente como líneas del archivo de
hallazgos (no artículos, no líneas de código), un commit por bloque sin pedir
permiso entre bloques técnicos, y un nuevo Nivel 3 de clasificador (separar notas
de reforma embebidas del cuerpo antes de comparar).

**Auditoría de calidad realizada** (10 hallazgos técnicos re-verificados con texto
completo, 5 antes y 5 después de corregir bugs) — **se encontraron y corrigieron 2
bugs reales** en el normalizador durante el proceso, documentados en
`hn-codigo-familia-bloque-02.md`. Ningún hallazgo jurídico fue forzado a técnico.

**Bloque 2** (líneas 51-100, mezcla de dos tipos de hallazgo): 24 técnicos, 15
reforma-candidata (12 de prioridad ALTA, 3 MEDIA), 11 dato-faltante (7
corroborados por gaps documentados en el manifest de extracción, 4 sin
corroboración).

**Hallazgo de prioridad ALTA**: 12 artículos (119-B, 120-A a 120-D, 122, 123, 123-D
a 123-H) de la sección de adopción muestran la versión local marcada "Derogado",
con una cita completa y verificable: "Artículo 120. Derogado mediante Decreto
102-2018 del 25 de septiembre de 2018. Publicado en el Diario Oficial La Gaceta
No.34,841 de fecha 10 de enero de 2019." La versión TSC (base) no refleja esta
derogación. No se resolvió ni se marcó como vigente -- va a la cola jurídica.

**Paquete Art. 68/70** entregado por separado en `art-68-70-cotejo.md`: cotejo TSC
vs. local, confirmación de que Arts. 70-A a 70-D existen solo en la versión local
(evidencia estructural, no prueba), hipótesis de Decreto 31-2015 marcada
explícitamente como no verificada -- no se intentó descargar Gaceta 33.799 por no
tener una fuente confiable disponible en esta sesión para ese tipo de verificación.

Detalle completo: `hn-codigo-familia-bloque-02.md` / `.jsonl`, `art-68-70-cotejo.md`.

---

*Próxima entrada: bloque 3/N de la cola de triage (líneas 101-150), o cierre de
Fase 1.*
