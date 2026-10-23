# SOURCE_CARDS_DATA_FLOW — citación servidor → DTO → cliente → Source Card

Base: `main` @ `8b696ad`. Bandera `NEXT_PUBLIC_MAYALEX_SOURCE_CARDS` **OFF por defecto**. Esta revisión no toca `route.ts`.

## 1. Flujo actual (verificado leyendo el código)

| Paso | Archivo | Qué ocurre |
|---|---|---|
| 1 | `lib/legal-retrieval/evidence-engine.ts` `construirCitas` | Solo fragmentos con `es_norma_vigente === true` y fuente no doctrinal; máx. 5; produce `Cita {articulo, texto(≤600), fuente, vigente:true, hash}` |
| 2 | `app/api/chat/route.ts:407` | `const citas = construirCitas(ragData.fragmentos)` |
| 3 | `route.ts` (≈l. 624 y 701) | Evento SSE `done` lleva `citas` (en las rutas de error/abstención va `citas: []`) |
| 4 | `components/ChatInterface.tsx:293` | `citas: event.citas ?? []` guardadas en el mensaje; tipo local `Cita` idéntico a v1 |
| 5 | `components/MessageBubble.tsx` | Con bandera OFF: lista `<details>` antigua. Con bandera ON: `AnswerPanel` ← `construirPanel` |
| 6 | `lib/legal-os/ux/source-cards.ts` | Vista pura |

## 2. Sobreafirmaciones encontradas

1. **`Cita.vigente` es siempre `true` por construcción** (`construirCitas` filtra por `es_norma_vigente === true` y fija `vigente: true`). No es una verificación: es la marca del corpus, que el inventario auditado reporta como `NULL` en ~80 % de las filas y cuya edición no está ligada a verificación humana por instrumento.
2. **Marcado antiguo (bandera OFF) — preexistente:** `MessageBubble` muestra **«Norma vigente HN»** para toda cita. Es una sobreafirmación respecto de lo que el backend sabe (PRESUMED, no VERIFIED). No se cambió: con la bandera OFF el marcado debe seguir idéntico. Queda como decisión de producto/CLO (recomendación: sustituir por «Vigencia presumida» o apagar la etiqueta cuando se active el DTO v2).
3. **Mi modelo de tarjetas (PR #93) heredaba el mismo defecto:** `vigente: true` → «Norma vigente HN». **Corregido aquí:** la forma antigua ahora da «Vigencia no verificada»; «Vigencia verificada» exige `validity_state = VERIFIED` del backend.
4. `Cita` no lleva decreto, Gaceta, fecha, versión, autoridad ni URL: la tarjeta de versión/Gaceta/sentencia mostrará «Versión no indicada» hasta que el servidor las envíe.

## 3. Contrato nuevo (`lib/legal-os/ux/cita-dto.ts`)

`CitaDTOv2` (`v: 2`): `kind`(LAW/ARTICLE/GACETA/JUDGMENT/DOCTRINE), `instrument`, `article`, `text`, `hash`, `decree`, `gaceta`, `gaceta_date`, `source_authority`, `source_tier`, `version`, `validity_state`, `official_url`, `evidence_hash`.

`construirCitaDTO(cita, fragmento?, metadata?)` (puro, servidor):

| Condición | `validity_state` |
|---|---|
| fuente doctrinal | `NOT_VERIFIED` (kind `DOCTRINE`) |
| marca del corpus `false` | `NOT_IN_FORCE` (ninguna verificación lo revierte) |
| marca `true` **y** `verificacionHumana {aprobadoPor, fecha ISO}` válida | `VERIFIED` |
| marca `true` sin verificación humana | `PRESUMED` |
| sin marca | `NOT_VERIFIED` |

`official_url` solo si el host pasa `esFuenteOficial` (registro verificado); si no, `null`.

## 4. Qué muestra la tarjeta

| Entrada | Etiqueta |
|---|---|
| DTO `VERIFIED` | «Vigencia verificada» |
| DTO `PRESUMED` | «Vigencia presumida (marca del corpus, sin verificación humana)» + advertencia |
| DTO `NOT_VERIFIED` / forma antigua `vigente:true` | «Vigencia no verificada» + advertencia |
| DTO `NOT_IN_FORCE` / antigua `vigente:false` | «No vigente» |
| doctrina | «Doctrina — no vinculante» |

## 5. Verificación realizada

- `tests/legal-os-cita-dto.test.ts`: mapeador → JSON del evento SSE → parse → modelo de tarjeta (sin VERIFIED sin evidencia; verificación humana no rescata marca falsa/ausente; URL solo de hosts verificados; doctrina no vinculante) y **render real** de `AnswerPanel` con `react-dom/server` (entorno node): el marcado de entradas no verificadas no contiene «Vigencia verificada» ni «Norma vigente»; el enlace oficial solo aparece con host verificado.
- Confirmado que `route.ts` no referencia el DTO (sin cambio de respuesta).

## 6. Límites (Preview)

No se ejecutó navegador contra Vercel ni la app local: requiere variables de entorno y base de datos, y el entorno no tiene claves. La verificación es de render en servidor + modelo. Pendiente para Preview real: encender la bandera solo en un despliegue Preview (variable de Vercel, decisión de Fredy), enviar el DTO v2 (ver `SOURCE_CARDS_ROUTE_CHANGE.md`) y revisar a mano con axe/teclado. No hay auditoría de accesibilidad automatizada todavía.
