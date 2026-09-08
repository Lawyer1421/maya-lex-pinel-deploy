# Runbook: `flag_rerank` — gate del rerank Cohere (Stack Maestro P2)

Estado (2026-09-08): **Decisión C elegida y cableada (PR3, sin merge). Migración
`flag_rerank` aplicada a `thgr` con `enabled=false`.** El flag NO está activado
para nadie. Historial abajo.

## Decisión C — cableada en PR3

Con `flag_rerank` **OFF** (default): `buscarEnSupabase` corta por similitud
pgvector (`candidatos.slice(0, k)` vía `seleccionarFinal()` en `lib/rag/search.ts`),
sin llamar a Cohere. Con el flag **ON**: Cohere `rerank-v3.5` como Etapa 2, con
degradación elegante. El flag se resuelve una vez por request en `/api/chat`
(`isFlagEnabledForUser('flag_rerank', getVerifiedEmail(req))`). `/api/rag`
(debug, sin auth) hereda OFF.

**Confirmado por el fundador (2026-09-08):** `COHERE_API_KEY` está en Vercel
Production → hoy el rerank corre para todos. Al mergear PR3 el rerank queda
**apagado en prod** hasta activar el flag (`enabled=true` o `allowed_emails`) —
esa es la intención de C (despliegue granular, sin sorpresas ni costos).

`RETRIEVAL_WIDE_K` no se tocó (sigue `Math.max(k, 25)`).

---

## Contexto histórico (por qué C, no A ni B)

## Lo que el work order asumía vs. lo que hay en `main`

El work order (Punto 2) dice: *"En `lib/rag/search.ts`: tras `buscarEnSupabase`
(top 50), si flag ON → Cohere rerank → top 8. Si flag OFF → comportamiento
actual idéntico."*

Pero el rerank **ya está integrado y activo** en `main`:

| Aspecto | Estado real en `main` @ `9c8a3d8` |
|---|---|
| Módulo | `lib/rag/rerank.ts` — `rerankearFragmentos()`, Cohere `rerank-v3.5`, con degradación elegante. Commit `c6da65a` (2026-09-01). |
| Cableado | `lib/rag/search.ts:717-718` — `buscarEnSupabase` llama `rerankearFragmentos(consulta, candidatos, k)` **siempre, sin flag**. |
| Embudo (Etapa 1) | `RETRIEVAL_WIDE_K = Math.max(k, 25)` → **25**, no 50. |
| Corte final | trunca a `k` (default **5**), no 8. |
| Sin `COHERE_API_KEY` | degrada a `candidatos.slice(0, k)` = orden pgvector. |
| Con `COHERE_API_KEY` | rerank real, para todo usuario. |
| Tests | `tests/rag-rerank.test.ts` — suite completa con `fetch` mockeado. |
| Consumidores del flag hoy | ninguno. `isFlagEnabledForUser` no se llama en ningún lado todavía. |

Es decir: el Punto 2 no es "agregar rerank", es **"ponerle un interruptor a un
rerank que hoy está siempre encendido"** — y quizás ajustar 25→50 y 5→8.

## La decisión (bloqueante)

**¿Qué significa "flag OFF"?**

- **Opción A — OFF = orden pgvector puro.** El flag envuelve la llamada actual;
  OFF ⇒ `candidatos.slice(0, k)`, sin Cohere.
  → Es el comportamiento **anterior a `c6da65a`**. NO es "el comportamiento
  actual": desactiva en prod la 2ª etapa que ya está mergeada. Cambio de
  comportamiento deliberado en producción — necesita tu sí explícito.

- **Opción B — OFF = comportamiento actual (rerank siempre que haya key).**
  El flag ON *además* ensancha el embudo (25→50) y sube el corte (5→8).
  → "flag OFF idéntico" se cumple literal. El flag pasa a significar "modo
  rerank agresivo", no "rerank on/off".

- **Opción C — el work order no sabía de `c6da65a`.** Intención real: el rerank
  nunca debió ir sin flag; agregar el flag, default OFF, y aceptar que eso
  **apaga el rerank en prod** hasta activación gradual (R3/R8). Igual que A
  pero asumido como objetivo, no como efecto colateral.

Recomendación: **C**, explícito. Encaja con R1 (capacidad detrás de flag,
default OFF) y R8 (activación gradual). Implica: un PR chico que (1) envuelve
la llamada de `search.ts` en `isFlagEnabledForUser('flag_rerank', userEmail)`,
(2) cuando el flag esté OFF, `slice(0, k)` — documentado como regresión
intencional de `c6da65a` mientras dure la fase de activación, (3) plumbing de
`userEmail` desde `app/api/chat/route.ts` y `app/api/rag/route.ts` →
`buscarRAG` → `buscarEnSupabase` (hoy ninguna de esas firmas lo lleva).

## `COHERE_API_KEY`

- Vive solo en Vercel (Production/Preview) y en `.env.local` de cada máquina.
- **Nunca** en el repo, en un commit, ni en el chat. `.env.example` solo trae
  la clave vacía + este puntero.
- Sin la key, cualquiera de las 3 opciones degrada a orden pgvector — así que
  se puede cablear y testear el flag sin la key real.

## Deuda marcada — dataset dorado

El work order pide "recall@8 vs baseline + p95 latencia (objetivo +<150ms)".
Eso **no se puede medir sin**: (a) `COHERE_API_KEY` real, (b) un set de ≥30
consultas jurídicas con relevancia anotada. Ninguno existe en el repo hoy.

Pendiente para cuando se cablee el flag:
- Crear `tests/fixtures/rerank-golden.json` (≥30 consultas HN + doc_ids esperados).
- Script `scripts/eval-rerank.ts` (dry-run, sin escrituras) que corra baseline
  vs rerank y reporte recall@8 + latencias. Necesita la key real → lo corre
  Fredy o CI con secret, no esta sesión.
