/**
 * scripts/olas/ejecutar-sql.ts
 * Ejecutor de terminal segura de un paquete de ola. Lo invocan los envoltorios ejecutar_<destino>.ps1; no se usa el SQL Editor web.
 *
 * Antes de conectar, y abortando sin escribir nada si algo falla:
 *   1. DATABASE_URL viene SOLO del entorno (el .ps1 la pide oculta y la borra al terminar); nunca se imprime;
 *   2. el host o el usuario de la URL contienen el project ref esperado (--ref) y ese ref es el del destino en el manifiesto;
 *   3. cada SQL del rango tiene exactamente los bytes y el sha256 del manifiesto;
 *   4. si algún paso tiene requiereFirma: la línea «**Estado:**» del pliego abre con la fórmula de firma del manifiesto (por omisión
 *      «D1–D8 FIRMADAS»; los dictámenes de corrección usan, p. ej., «C1 FIRMADA») y el pliego cita el sha256 completo de cada uno de esos SQL.
 * Después, ya conectado, comprueba con SQL que la base no es la del otro destino (presencia/ausencia de los lotes V5 de 2026-11-21), y corre
 * cada archivo en orden: cada uno trae su BEGIN/COMMIT y falla cerrado; el primer error detiene la secuencia.
 *
 * Uso: npx tsx scripts/olas/ejecutar-sql.ts --manifiesto <ruta> --destino staging|prod --ref <ref> [--desde N] [--hasta M] [--simular]
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

interface Archivo { ruta: string; bytes: number; sha256: string; destino: 'staging' | 'prod'; orden: number; requiereFirma: boolean }
/** `firma`: fórmula que debe abrir la línea «**Estado:**» del pliego; por omisión «D1–D8 FIRMADAS» (paquetes de ola). */
interface Manifiesto { ola: string; ingest_batch: string; pliego: string; firma?: string; refs: { staging: string; prod: string }; archivos: Archivo[] }

const FIRMA_OLA = 'D1–D8 FIRMADAS';

export function refDeUrl(url: string): string[] {
  const u = new URL(url);
  return [u.hostname, decodeURIComponent(u.username)];
}

/** El pliego está firmado si y solo si su línea de estado empieza por «**Estado:** <fórmula>» (por omisión «D1–D8 FIRMADAS»). */
export function estaFirmado(pliego: string, formula: string = FIRMA_OLA): boolean {
  const f = formula.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\*\\*Estado:\\*\\*\\s*\\**${f}(?![\\p{L}\\p{N}])`, 'mu').test(pliego);
}

export function planificar(p: { manifiesto: Manifiesto; dirManifiesto: string; raiz: string; destino: 'staging' | 'prod'; ref: string; url: string; desde: number; hasta: number }): Array<Archivo & { sql: string }> {
  const { manifiesto: m } = p;
  if (m.refs[p.destino] !== p.ref) throw new Error(`el ref ${p.ref} no es el de ${p.destino} en el manifiesto (${m.refs[p.destino]})`);
  const otro = p.destino === 'prod' ? m.refs.staging : m.refs.prod;
  const partes = refDeUrl(p.url);
  if (!partes.some((x) => x.includes(p.ref))) throw new Error(`DATABASE_URL no apunta a ${p.ref} (host/usuario no lo contienen)`);
  if (partes.some((x) => x.includes(otro))) throw new Error(`DATABASE_URL contiene el ref del otro destino (${otro})`);
  const pasos = m.archivos.filter((a) => a.destino === p.destino && a.orden >= p.desde && a.orden <= p.hasta && a.orden !== 99).sort((a, b) => a.orden - b.orden);
  if (pasos.length === 0) throw new Error('ningún paso en el rango pedido');
  const cargados = pasos.map((a) => {
    const buf = readFileSync(join(p.dirManifiesto, a.ruta));
    if (buf.length !== a.bytes || sha(buf) !== a.sha256) throw new Error(`${a.ruta}: huella distinta del manifiesto (¿editado o convertido a CRLF?)`);
    return { ...a, sql: buf.toString('utf8') };
  });
  const conFirma = cargados.filter((a) => a.requiereFirma);
  if (conFirma.length > 0) {
    let pliego: string;
    try { pliego = readFileSync(resolve(p.raiz, m.pliego), 'utf8'); } catch { throw new Error(`no se encuentra el pliego ${m.pliego}`); }
    // La firma se lee SOLO en la línea «**Estado:**» (no en cualquier parte: las instrucciones del pliego mencionan la frase).
    const formula = m.firma ?? FIRMA_OLA;
    if (!estaFirmado(pliego, formula)) throw new Error(`el pliego ${m.pliego} no está firmado (la línea «**Estado:**» no dice «${formula}»)`);
    const sinCitar = conFirma.filter((a) => !pliego.includes(a.sha256));
    if (sinCitar.length) throw new Error(`el pliego firmado no cita la huella de: ${sinCitar.map((a) => a.ruta).join(', ')}`);
  }
  return cargados;
}

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<void> {
  const rutaManifiesto = arg('manifiesto');
  const destino = arg('destino') as 'staging' | 'prod' | undefined;
  const ref = arg('ref');
  if (!rutaManifiesto || (destino !== 'staging' && destino !== 'prod') || !ref) throw new Error('uso: ver cabecera del archivo');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no está en el entorno (el .ps1 la solicita oculta)');
  const manifiesto: Manifiesto = JSON.parse(readFileSync(rutaManifiesto, 'utf8'));
  const pasos = planificar({
    manifiesto, dirManifiesto: dirname(resolve(rutaManifiesto)), raiz: process.cwd(), destino, ref, url,
    desde: Number(arg('desde') ?? 0), hasta: Number(arg('hasta') ?? 98),
  });
  console.log(`Plan ${manifiesto.ola} · ${manifiesto.ingest_batch} → ${destino} (${ref}):`);
  for (const a of pasos) console.log(`  ${a.orden}. ${a.ruta}  sha256 ${a.sha256}${a.requiereFirma ? '  [firma CLO verificada]' : ''}`);
  if (process.argv.includes('--simular')) { console.log('--simular: no se conecta.'); return; }

  const { Client } = await import('pg');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false }, statement_timeout: 600_000 });
  client.on('notice', (n) => console.log(`  NOTICE: ${n.message}`));
  await client.connect();
  try {
    // Huella de la base: prod tiene los 360 V5 del 2026-11-21; staging los tiene en V4. Distingue destinos aunque la URL fuera un alias.
    const r = await client.query(`SELECT count(*)::int AS n FROM public.biblioteca_vectores WHERE ingest_batch IN ('A03_CODIGO_NINEZ_01','A04_D35_2013_01','PILOTO_D284_2013_01') AND metadata->>'estado_v' = 'V5'`);
    const v5 = r.rows[0].n as number;
    if (destino === 'prod' && v5 !== 360) throw new Error(`la base conectada no parece producción (V5 del 2026-11-21: ${v5} ≠ 360)`);
    if (destino === 'staging' && v5 !== 0) throw new Error(`la base conectada no parece staging (tiene ${v5} filas V5)`);
    for (const a of pasos) {
      console.log(`→ ${a.ruta}`);
      const res = await client.query(a.sql);
      const ultimos = (Array.isArray(res) ? res : [res]).filter((x) => x.rows && x.rows.length > 0);
      for (const x of ultimos) console.table(x.rows);
    }
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* sin transacción abierta */ }
    throw e;
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith('ejecutar-sql.ts')) {
  main().catch((e) => { console.error(`ABORTADO: ${e instanceof Error ? e.message : String(e)}`); process.exit(1); });
}
