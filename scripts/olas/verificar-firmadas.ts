/**
 * scripts/olas/verificar-firmadas.ts
 * Control de no regresión: comprueba, SIN escribir nada, que el constructor común `cedij.ts` sigue produciendo byte a byte las filas
 * de los paquetes ya firmados (OLAS 3, 6, 7, 9, 10, 11, 12 y 13). Correr después de cualquier cambio en `cedij.ts`; si algo difiere, el cambio
 * no se puede conservar sin regenerar y volver a firmar.
 * Uso: npx tsx scripts/olas/verificar-firmadas.ts
 */
import { readFileSync } from 'node:fs';
import { construirCedij, type ParamsCedij } from './cedij';
import { PARAMS as P3 } from './ola3-con';
import { PARAMS as P6 } from './ola6-cpc';
import { PARAMS as P7 } from './ola7-ct';
import { PARAMS as P9 } from './ola9-ctrib';
import { PARAMS as P10 } from './ola10-not';
import { PARAMS as P11 } from './ola11-adop';
import { INSTRUMENTOS as L12 } from './ola12-leyes';
import { PARAMS as P12LA } from './ola12-lavado';
import { PARAMS as P13LPA } from './ola13-lpa';
import { PARAMS as P13LMUN } from './ola13-lmun';

const FIRMADAS: Array<[string, ParamsCedij, string]> = [['OLA3', P3, 'out/ola3-con'], ['OLA6', P6, 'out/ola6-cpc'], ['OLA7', P7, 'out/ola7-ct'], ['OLA9', P9, 'out/ola9-ctrib'], ['OLA10', P10, 'out/ola10-not'], ['OLA11', P11, 'out/ola11-adop'],
  ['OLA12 LJC', L12.ljc, 'out/ola12-ljc'], ['OLA12 LOAT', L12.loat, 'out/ola12-loat'], ['OLA12 LP', L12.lp, 'out/ola12-lp'], ['OLA12 LA', P12LA, 'out/ola12-la'],
  ['OLA13 LPA', P13LPA, 'out/ola13-lpa'], ['OLA13 LMUN', P13LMUN, 'out/ola13-lmun']];
let fallos = 0;
for (const [nombre, p, dir] of FIRMADAS) {
  const nuevas = new Map(construirCedij(p).articulos.map((a) => [a.fila.num_articulo, JSON.stringify(a.fila)]));
  const firmadas = new Map(readFileSync(`${dir}/rows.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => [JSON.parse(l).num_articulo as string, l]));
  const distintas = [...new Set([...nuevas.keys(), ...firmadas.keys()])].filter((n) => nuevas.get(n) !== firmadas.get(n));
  if (distintas.length) fallos++;
  console.log(`${nombre}: ${distintas.length ? `DIFIERE en ${distintas.join(', ')}` : 'idéntica al paquete firmado'}`);
}
process.exit(fallos ? 1 : 0);
