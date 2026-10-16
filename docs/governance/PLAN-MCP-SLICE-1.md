# PLAN-MCP-SLICE-1.md
## «MAYA LEX — Derecho Hondureño» · Servidor MCP v1 (solo lectura)
### Nivel: P1 (PROPONER) — documento sin código ni ramas · Hermes Sentinel · 2026-10-14
### Destinatario: Auditor DevOps (dictamen previo) → Control Plane → Claude Code

---

## 0. POSICIÓN EN LA COLA (mandato del fundador)
Este plan NO se implementa hasta que:
1. **PR #62** (gate instrumental de retrieval: `lib/legal-retrieval/instrument-gate.ts`,
   verificado OPEN al redactar) esté mergeado — condición 3 depende de él.
2. **Misión P0-1 de versionado de normas por fecha** (tabla `norma_version`) esté
   completada — las herramientas 2 y 4 dependen de ella (condición 1).

## 1. OBJETIVO
Exponer el corpus jurídico hondureño de Maya Lex como servidor MCP remoto en
`https://mayalexhn.com/api/mcp`, consumible desde Claude/ChatGPT/Cursor por
suscriptores Premium. Modelo de referencia: Trifolia (Chile) / Jusratio (Brasil).
Solo lectura absoluta. Sin tablas nuevas salvo las ya planificadas (norma_version).

## 2. HERRAMIENTAS (4, read-only)

### 2.1 `buscar_legislacion`
- Entrada: `{ consulta: string, limite?: number (máx 10, default 5) }`
- Pipeline: **`buscarRAG` (`lib/rag/search.ts:261` por dictamen del Auditor)** —
  el mismo motor del chat post-PR #62 (exacto-primero con constancia de
  ambigüedad, semántica como respaldo, gate instrumental). Sin generación LLM:
  devuelve chunks con id canónico, instrumento, provenance y score.
- **REQUISITO PREVIO (dictamen, bloqueante):** extraer de
  `app/api/chat/route.ts` la pasada procedimental (**L333–357**) y la lógica de
  abstención `CORPUS_EVIDENCE_NOT_FOUND` (**~L449–467**; declaración en L49) a
  una función de librería compartida (p. ej.
  `lib/legal-retrieval/retrieval-session.ts`), de modo que **chat y MCP usen el
  mismo código. PROHIBIDO duplicarlo.** Este refactor es un pre-slice propio
  (afecta /api/chat en producción → review y tests completos antes del slice MCP).
- **Condición 3**: toda respuesta pasa por el gate instrumental del PR #62. Si el
  corpus no contiene la fuente pedida, la respuesta declara explícitamente
  `fuente_no_disponible: true` con el instrumento solicitado — nunca se rellena
  con material de otro instrumento (exactamente lo que #62 cierra).

### 2.2 `obtener_articulo`
- Entrada: `{ id_canonico: string, fecha?: string (ISO, default HOY) }`
- Resolución VÍA `norma_version`: devuelve el texto del artículo **tal como regía
  en `fecha`**. Default hoy = texto vigente actual.
- **Regla dura (condición 1):** si el artículo tiene reformas posteriores a la
  versión servida (p. ej. arts. del Código de Comercio reformados por el
  D.127-2026), la respuesta DEBE incluir `version: {vigente_desde, vigente_hasta,
  reformado_por}`. Prohibido servir texto reformado etiquetado como vigente.
  Si `norma_version` no tiene fila para (artículo, fecha) → `version_no_disponible`,
  fail-closed, nunca fallback silencioso al texto plano de biblioteca_vectores.

### 2.3 `verificar_cita`
- Entrada: `{ cita: string, id_canonico: string, fecha?: string }`
- **Determinista (condición 2):** comparación programática (normalización
  Unicode/espacios + match de substring exacto) contra el texto resuelto por 2.2.
  SIN ningún paso de IA. Tres estados de salida, exhaustivos:
  - `verificada` — la cita existe byte-a-byte (tras normalización declarada).
  - `no_encontrada` — el id canónico no existe o no hay versión para la fecha.
  - `texto_distinto` — el artículo existe pero la cita no coincide; se devuelve
    el pasaje real más cercano (diff acotado) para revisión humana.
- Patrón de referencia: DingDuff `citecheck_review` (verificación no-IA).

### 2.4 `estado_vigencia`
- Entrada: `{ instrumento: string, fecha?: string (default HOY) }`
- Devuelve: `es_norma_vigente` + metadatos de provenance (SHA-256 del source
  artifact, fecha de ingesta, decreto) + reformas registradas en `norma_version`
  a la fecha consultada. Misma regla fail-closed de 2.2.

## 3. AUTENTICACIÓN Y RATE LIMITING (condición 4 — evidencia archivo:línea)

### 3.1 Lo que YA existe y sirve (verificado en main, 2026-10-14)
- **Resolver de acceso**: `lib/exequatur/access.ts` —
  `resolveExequaturAccess()` (L73), matriz pro→ALLOW / admin→ALLOW_INTERNAL /
  free·academico→DENY (L10–14), flag como última compuerta (L69–70), fail-closed
  ante cualquier excepción (L63–64, L84). **Sirve como patrón** pero está ligado
  al flag `flag_exq_enabled`; para MCP se instancia un flag propio
  `flag_mcp_enabled` en el MISMO contrato de flags
  (`lib/flags.ts` + `supabase/migrations/20260827000000_feature_flags.sql`),
  reutilizando `isFlagEnabledForUser` (access.ts L90) sin tocar su lógica.
- **Rate limiting**: `lib/rate-limit.ts` — límites por tier free 3 / academico 20 /
  pro 1000 / admin 9999 (L5–7, L13–15, L45–49), identidad verificada
  `getVerifiedEmail()` (L114) y `getUserIdentifierVerificado()` (L133),
  contador transaccional `checkAndIncrementRateLimit()` (L144). Opera sobre
  `Request` estándar → **compatible con un route handler MCP sin cambios de firma**.

### 3.2 Autenticación de clientes MCP — RESUELTO (dictamen del Auditor, verificado)
**VERIFICADO contra main (2026-10-14):** `getVerifiedEmail()` en
`lib/rate-limit.ts` **L114–131** YA acepta `Authorization: Bearer *** y lo
valida con `supabase.auth.getUser(token)` (L115–124), con fail-closed ante token
corrupto o Supabase caído (L125–127). **No se necesita fase nueva de auth para
la v1: cero código de identidad nuevo.** El usuario Premium usa su JWT de
Supabase como Bearer (UI mínima en /cuenta: botón "Conectar con Claude" que
muestra el token + instrucciones).
- **v1.1 (post-lanzamiento):** OAuth dinámico conforme a la spec MCP, como
  Trifolia/Jusratio. Fuera del alcance de v1 por dictamen.
- Corrección de cita del plan original: el fail-closed del resolver de acceso
  abarca `lib/exequatur/access.ts` **L58–99** (no solo L63–84).

### 3.2-bis Bolsa de rate limit propia — APROBADA (dictamen del Auditor)
Identificador con prefijo: `mcp:<identificador-de-email>` sobre
`buildUserIdentifierFromEmail` (rate-limit.ts L70), **sin migración** — bolsa
separada del chat en queries_log por construcción del identificador. Límite
propio `MCP_TIER_DAILY_LIMIT` (default 200/día pro).
**CONDICIÓN DURA del dictamen:** `resolveTodayTier` (rate-limit.ts L201) debe
resolver la suscripción usando el correo SIN el prefijo `mcp:` (de lo contrario
el lookup en subscriptions fallaría y degradaría a free). Entregable
obligatorio: **test que lo demuestre** (caso: usuario pro con identificador
`mcp:...` conserva límite de pro, no cae a free).

### 3.3 Matriz de autorización MCP (espejo de Exequátur)
```
pro      + flag_mcp_enabled ON  -> ALLOW
admin    + flag_mcp_enabled ON  -> ALLOW_INTERNAL
free/academico                  -> DENY
flag OFF/ausente/error          -> DENY   (lanzamiento con flag OFF)
token inválido/ausente          -> 401 sin cuerpo informativo
```

## 4. SOLO LECTURA Y SECRETOS (condición 5)
- El handler usa EXCLUSIVAMENTE el cliente anon/SSR existente con las policies
  RLS de lectura del corpus; **prohibido** importar service-role en el módulo MCP.
- Proyecto de producción SOLO por variables de entorno ya existentes
  (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — mismas que
  valida `tieneCredencialesSupabase()` en el layout de Exequátur). Cero refs
  hardcodeadas, cero secretos en repo. `.env.example` documenta
  `MCP_TIER_DAILY_LIMIT` y `FLAG_MCP_ENABLED` si aplica.
- Prueba de aceptación: grep del diff → 0 ocurrencias de service_role, 0 refs
  de proyecto, 0 claves.

## 5. ARQUITECTURA
- `app/api/mcp/[transport]/route.ts` con `mcp-handler` (Vercel). Transporte:
  Streamable HTTP (default moderno; SSE solo si un cliente lo exige).
- Verificado: no existe ningún archivo `mcp` en main hoy (árbol de 377 archivos).
- Zod para schemas de entrada (dependencia ya presente en el stack Next).
- Nombre público del conector: **«MAYA LEX — Derecho Hondureño»** (condición 7).
- Pricing: incluido en Premium USD 15 (condición 6) — sin cambios en PayPal ni
  en subscriptions; el gate es tier+flag, idéntico al patrón Exequátur.

## 6. PLAN DE PRUEBAS (condición 8a)
1. **Unitarias** (siguen patrón tests/rate-limit-tier.test.ts y tests/flags.test.ts):
   - matriz de autorización completa (6 casos de 3.3);
   - verificar_cita: los 3 estados + normalización (tildes, espacios, guiones);
   - obtener_articulo: fecha pasada sirve versión histórica; fecha hoy sirve
     vigente; artículo reformado NUNCA sale como vigente (fixture D.127-2026
     sintética); ausencia en norma_version → fail-closed.
2. **Integración** (handler completo, supabase mockeado):
   - request sin token → 401; token válido tier free → DENY; pro+flag ON → 200;
   - agotamiento de límite → respuesta MCP de error con resetAt;
   - buscar_legislacion sobre instrumento inexistente → fuente_no_disponible.
3. **E2E manual pre-lanzamiento:** conectar Claude Desktop real contra Preview
   de Vercel con cuenta pro de prueba (datos sintéticos, nunca cuentas de
   clientes) y correr las 4 herramientas.
4. **Sonda externa post-deploy (Hermes):** curl anónimo a /api/mcp → 401;
   verificación de que ninguna herramienta responde sin Bearer.

## 7. REGISTRO DE RIESGOS (condición 8b)
| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Exfiltración masiva del corpus vía consultas repetidas (scraping del activo central) | Media | Alto | límite 10 resultados/llamada + rate limit diario propio + límite de caracteres por chunk + ToS que prohíbe reconstrucción + watermark de provenance en cada respuesta |
| R2 | Servir texto reformado como vigente (riesgo reputacional/legal máximo para un producto jurídico) | Baja si norma_version existe | Crítico | dependencia dura de P0-1; fail-closed version_no_disponible; test obligatorio con fixture de reforma |
| R3 | ~~getVerifiedEmail no soporta Bearer~~ RESUELTO: soporte verificado (rate-limit.ts L114–131) | — | — | cerrado por dictamen del Auditor + verificación independiente |
| R3b | Prefijo `mcp:` rompe lookup de suscripción en resolveTodayTier y degrada pros a free | Media | Alto | condición dura del dictamen: resolver tier con el correo sin prefijo + test obligatorio que lo demuestre |
| R3c | Refactor del retrieval compartido (chat L333–357 + L449–467) introduce regresión en /api/chat de producción | Media | Alto | pre-slice propio con review independiente y suite completa de retrieval (8 suites del #62) en verde antes del slice MCP |
| R4 | Costo variable por embeddings de consultas | Baja | Bajo | ver §8; cache de embeddings de consultas frecuentes si supera umbral |
| R5 | Cliente MCP malicioso con token robado | Baja | Medio | tokens revocables (sesión Supabase), rate limit por identidad, logging de origen en queries_log |
| R6 | Deriva de scope: presión por añadir herramientas de escritura | Media | Alto | este plan fija v1 READ-ONLY como invariante; cualquier herramienta de escritura exige nuevo plan P1 + dictamen |

## 8. COSTO ESTIMADO POR CONSULTA (condición 8c)
Supuestos: embedding de consulta con el modelo ya usado por el RAG actual
(text-embedding/Cohere según pipeline vigente), SIN generación LLM en el
servidor MCP (los chunks los consume el modelo del CLIENTE, que paga su propia
inferencia — esta es la gracia económica del modelo MCP).
- `buscar_legislacion`: 1 embedding (~500 tokens ≈ $0.00005–0.0001) + 1 query
  pgvector (≈2–8 ms de cómputo DB, coste marginal ~$0) ≈ **$0.0001/consulta**.
- `obtener_articulo` / `estado_vigencia` / `verificar_cita`: SELECT puntual sin
  embedding ≈ **~$0.00001/consulta** (solo DB/egress).
- Escenario 100 usuarios pro × 50 consultas/día × 30 días = 150k consultas/mes
  ≈ **$10–15/mes** de costo variable total. Margen sobre Premium $15: el MCP se
  paga con UN suscriptor. Riesgo de costo: despreciable frente a R1.

## 9. CRITERIOS DE ACEPTACIÓN DEL SLICE (gate de cierre)
- [ ] Las 4 herramientas responden conforme a §2 en Preview.
- [ ] Matriz 3.3 verificada por tests + sonda externa.
- [ ] 0 secretos/refs en diff; solo lectura demostrada (grep + review).
- [ ] flag_mcp_enabled OFF en producción al merge (lanzamiento = decisión P3
      del fundador, separada del deploy, igual que Exequátur).
- [ ] Documento de onboarding para suscriptores (cómo conectar desde Claude).

## 10. FUERA DE ALCANCE (v1)
OAuth dinámico (Fase B) · herramientas de doctrina/jurisprudencia (el corpus
actual es legislación) · búsqueda por concepto multi-instrumento con ranking
de autoridad · listado en el directorio de Anthropic (post-estabilización) ·
cualquier escritura.

---
## 11. ESTADO DEL DICTAMEN
**READY_WITH_CHANGES emitido por el Auditor DevOps (2026-10-14) — cambios
incorporados en esta revisión y verificados independientemente por Hermes:**
1. ✅ Cita corregida: Bearer JWT ya soportado (rate-limit.ts L114–131, verificado
   línea a línea); fail-closed de access.ts abarca L58–99. Sin fase de auth nueva.
2. ✅ Bolsa `mcp:` aprobada, con condición dura de test sobre resolveTodayTier (§3.2-bis).
3. ✅ Retrieval vía buscarRAG (search.ts:261) + requisito previo de extracción a
   librería compartida (§2.1), prohibida la duplicación.
4. ⏳ Subida del plan al repo en rama de docs: pendiente — Hermes no tiene
   credenciales de escritura en GitHub (por diseño del Mesh). Encargar a Claude
   Code: rama `docs/plan-mcp-slice-1`, archivo
   `docs/governance/PLAN-MCP-SLICE-1.md`, PR de docs sin código.

Secuencia vigente: merge #62 → P0-1 norma_version → pre-slice refactor
retrieval compartido → slice MCP v1.

*Dictamen original solicitado: validar §3.2 (✅), bolsa de rate limit (✅ propia),
invocabilidad server-side del retrieval (✅ vía buscarRAG + refactor previo).*
