# SOURCE_CARDS_ROUTE_CHANGE — cambio mínimo y aditivo propuesto para `route.ts` (NO aplicado)

## Objetivo
Que el evento SSE `done` pueda llevar, además de la cita v1, los campos de `CitaDTOv2`, sin alterar los bytes que hoy recibe un cliente que no los pide.

## Preocupación de estabilidad de la respuesta de producción
Agregar campos a cada `citas[i]` es aditivo (el cliente actual ignora campos desconocidos: `ChatInterface` guarda el arreglo tal cual y `MessageBubble` lee solo `articulo/texto/fuente/hash`). Aun así cambia el **cuerpo** del evento, y el mandato exige que cualquier trabajo de Legal OS no altere el cuerpo de producción. Por eso **no se envía siempre**: se activa con una bandera de servidor y, opcionalmente, un encabezado de la solicitud.

## Cambio propuesto (3 puntos en `app/api/chat/route.ts`)

1. Importar:
```ts
import { construirCitaDTO } from '@/lib/legal-os/ux/cita-dto';
```
2. Tras `const citas = construirCitas(ragData.fragmentos);` (l. ≈407):
```ts
// Tarjetas de fuente (Legal OS UX): campos adicionales solo si el servidor lo habilita Y el cliente lo pide. Por defecto, bytes idénticos.
const citasV2 =
  process.env.MAYALEX_CITA_DTO_V2 === '1' && req.headers.get('x-mayalex-cita-dto') === '2'
    ? citas.map((c) => construirCitaDTO(c, ragData.fragmentos.find((f) => f.hash === c.hash)))
    : null;
```
(`construirCitaDTO` sin `metadata`: produce `PRESUMED`/`NOT_VERIFIED`, nunca `VERIFIED`. `VERIFIED` solo llegará cuando exista una fuente de verificación humana por texto — hoy no existe en el corpus — y se pase como `metadata.verificacionHumana`.)

3. En los dos eventos `done` (l. ≈624 y ≈701), sustituir `citas,` por:
```ts
citas: citasV2 ?? citas,
```
Con la variable apagada o sin el encabezado, `citasV2` es `null` y el JSON es **byte a byte el actual**. Con ambos presentes, el elemento v2 conserva además los campos v1 solo si se añaden: para compatibilidad hacia atrás, mapear `{ ...c, ...dto }` en lugar de `dto` (así `articulo/texto/fuente/vigente/hash` siguen presentes).

## Cliente
`ChatInterface` envía `x-mayalex-cita-dto: 2` solo cuando `NEXT_PUBLIC_MAYALEX_SOURCE_CARDS === '1'`. El tipo `Cita` del cliente pasa a `Cita & Partial<CitaDTOv2>`.

## Pruebas necesarias al aplicar
- Con `MAYALEX_CITA_DTO_V2` sin definir: snapshot del evento `done` idéntico al actual (la suite de independencia de producción ya cubre la respuesta HTTP).
- Con ambas condiciones: ningún `validity_state === 'VERIFIED'` sin `metadata.verificacionHumana`.

## Quién decide
Aplicar el cambio toca la ruta de producción (aunque sea inactivo por defecto) y activar la bandera es una variable de Vercel: **decisión de Fredy**. Esta rama solo entrega el contrato, el mapeador y las pruebas.
