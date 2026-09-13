# Hoja de ruta — Maya Lex como plataforma jurídica de Centroamérica

Resolución de arquitectura / CEO. Sustituye el “Sprint 72 horas” de Qwen
como plan de ejecución. Qwen aporta ideas; **no autoriza producción**.

---

## 1. Veredicto sobre el sprint de 72 horas

**No se ejecuta.** Completar Maya Lex “en 3 días” con Inngest, Docling,
expediente, STT, DeepEval, React Flow, ISR y 60.000 documentos en paralelo
no es aceleración: es mezclar siete productos, romper el fail-closed y
vender lo que las flags tienen en OFF.

Eso destruiría la campaña de lanzamiento (PR de conversión) y la
confianza que justifica USD 15.

### Qué se toma de Qwen

- Mapa de vacíos del corpus (Constitución, Civil, Tributario, mercantil).
- Trabajo en paralelo **por carriles**, no todos tocando el mismo `schema`.
- Dataset dorado + evals de citas: sí, **después** de que el alta cobre.
- Hermes en el VPS: orgánico, investigación de fuentes, no migraciones.

### Qué se deja

- Inngest + Docling + Reducto + modo expediente en el mismo sprint.
- AssemblyAI / diarización de audiencias.
- React Flow / Dagre como requisito de lanzamiento.
- DeepEval + Promptfoo como gate de merge ahora.
- Qwen como árbitro de producción.
- “60.000 documentos” como meta de marketing.
- Replicar a países vecinos **antes** de que Honduras cobre y el corpus
  hondureño tenga Constitución + Civil + Tributario como cuerpos propios.

Las reglas R1–R8 del Decision Log siguen vigentes: flag OFF, RLS,
sin PII en logs, Preview → merge → activación gradual.

---

## 2. Estado real (cotejo, no deseo)

Producto que **sí** se puede vender hoy:

- Chat: Sala IA, Análisis, Documento.
- RAG fail-closed (no inventa artículo si no está).
- Adjuntos PDF/DOCX/TXT con sesión.
- PayPal Académico USD 9 / Profesional USD 15.
- Embudo de alta (`intent=signup`), privacidad, términos, OG.

Corpus (fuente: Decision Log, no anunciar cifras frágiles en Ads):

| Cuerpo | Estado |
|---|---|
| Penal | Cobertura más profunda; artículos de referencia públicos |
| Procesal Civil | Profundo; filas vigentes en producción |
| Código del Trabajo | 870 filas marcadas vigentes (B1) |
| Constitución 1982 | **Ausente como cuerpo propio** |
| Código Civil | **Ausente como cuerpo propio**; `02_CIVIL` en cuarentena |
| Código Tributario (D.170-2016) | **0 filas** |
| Código de Familia | Cuarentena / vigencia en disputa |
| `doc_*` | Cuarentena; no entra al RAG público |

La búsqueda web (Tavily) **no sustituye** integrar esos cuerpos. Es
apoyo, no corpus.

---

## 3. Fases (sin calendario de días)

### L0 — Lanzar lo que cobra

Dueño: Cursor. Hermes ejecuta creativos, no el repo.

1. Merge del embudo de alta + privacidad/términos.
2. Superficie visual de alta gama en `/`, `/login`, `/pricing` (este PR).
3. WhatsApp + pixels solo con env.
4. Cinco shorts orgánicos (`docs/campaign/lanzamiento-creativos.md`).
5. Ads pagados **después** de privacidad en producción y signup medido.

Criterio de salida: un extraño crea cuenta en 30 s y ve el chat.

### L1 — Corpus hondureño que un juez reconocería

Dueño: fundador (cotejo jurídico) + Cursor (pipeline de ingesta oficial).
Grok / Perplexity / Gemini: **solo investigación de fuente oficial**
(Gaceta, Poder Judicial, SAR). Nadie escribe `es_norma_vigente=true`
sin autorización en el Decision Log.

Orden de ingesta (un cuerpo por PR):

1. Constitución de la República (cuerpo propio, no menciones sueltas).
2. Código Civil (sacar de cuarentena solo lo cotejado).
3. Código Tributario.
4. Familia: resolver vigencia, no “marcar todo true”.
5. Mercantil / Comercio: después de Civil.

Criterio de salida: `/cobertura-juridica` lista esos cuerpos sin
mentir; el chat cita Constitución y Civil por número sin abstenerse
por ausencia de cuerpo.

### L2 — Producto que justifica Bufete

Detrás de `flag_expediente` / `flag_voz`, default OFF.

1. Biblioteca **privada** de plantillas (`lib/self-learning/`, ya diseñado).
2. Expediente de un caso: cronología simple **antes** de React Flow.
3. Evals de citas (dataset dorado 30 consultas) cuando haya presupuesto
   de CI, no como teatro de 72 h.
4. Inngest/Docling solo si el adjunto actual se queda corto. Hoy
   PDF/DOCX/TXT ya entra al chat.

Criterio de salida: un despacho paga convenio porque **su** biblioteca
no se mezcla con la de otro.

### L3 — Centroamérica (PROYECTO FUTURO — no se mezcla con Maya Lex)

**Maya Lex hoy es solo Honduras.** L3 no comparte repo de producto, no
comparte `biblioteca_vectores`, no comparte campaña ni Ads. No se pega
corpus HN en otro país. No se implementa en esta ronda.

Cuando el fundador abra ese proyecto (otro alcance, otra jurisdicción):

- se replica el *sistema* (Gaceta propia + fail-closed + flags);
- no se reutiliza el corpus hondureño.

Hasta entonces, L3 es archivo de intención. Cero tickets en este repo.

---

## 4. Quién hace qué (herramientas que ya paga)

| Recurso | Carril | Prohibido |
|---|---|---|
| **Cursor** | Código, UI, RAG, PRs, dueño de `main` | Ejecutar el sprint Qwen tal cual |
| **Hermes (VPS)** | Shorts, Ads copy, WhatsApp, specs de campaña | Migraciones SQL, Inngest, merge |
| **Claude** | Redacción jurídica, dataset dorado, revisión de prompts | Autorizar vigencia de artículos |
| **Grok bots** | Fuentes oficiales, documentar fases, alertas | Escribir a producción |
| **Perplexity / Gemini** | Cotejo de Gaceta y doctrina | Pegar texto no verificado al RAG |
| **ElevenLabs** | Voz de los shorts | “Abogado virtual” que da asesoría |
| **Gamma** | Presentaciones internas | UI del producto |
| **Figma** | Moodboard opcional (3 direcciones) | Bloquear el lanzamiento |
| **Qwen** | Specs de fases futuras, segunda opinión | Árbitro de merge |

Figma es útil si un diseñador humano itera. **No es mejor que Cursor**
para llevar a producción el sistema que ya existe (obsidian / ivory /
jade / Merriweather). Un archivo Figma sin implementación no cobra.

Prompt corto si más adelante quiere Figma (no bloquea L0):

> Maya Lex. Biblioteca jurídica premium hondureña. Fondo #08070B,
> texto #F6F2E9, acento jade #2D9B8A, oro #C9A84C solo en 1 px.
> Serif editorial + sans UI. Cero balanzas repetidas. Hero con
> producto real (cita V4), no stock. Mobile 375 primero. No
> prometa expediente ni cobertura total.

---

## 5. Autoentrenamiento (se mantiene)

El corpus oficial **nunca** se entrena con chats ni expedientes.
La vía de cobro es biblioteca privada. Ver FAQ de portada y `/cuenta`.

---

## 6. Gobernanza

- Un PR, un cuerpo normativo o una superficie de UI — no siete fases.
- Grokbot `auditor-green` sigue siendo el sello de merge, no Qwen.
- Claims de marketing = producto con flag ON o copy honesto de convenio.
- Esta hoja se actualiza en el Decision Log cuando el fundador autorice
  el siguiente cuerpo (Constitución primero).
