/**
 * tools/corpus/receive-pdf.ts — procedimiento único de recepción de un PDF de fuente oficial (Corpus Supply HN).
 *
 *   npx tsx tools/corpus/receive-pdf.ts <archivo.pdf> --paquete HN-001-A01 --url <URL exacta de descarga> \
 *       --retriever "<quién lo descargó>" --fecha 2026-11-05T14:00:00Z [--metodo MANUAL_BROWSER|CURL|OTHER] \
 *       [--lote 2026-11-05-hn-001-tranche-a]
 *
 * Qué hace, en este orden, y se detiene en el primer fallo bloqueante:
 *   1. INTEGRIDAD: el archivo existe, empieza por `%PDF-`, no está vacío, no está cifrado, `pdfinfo` lo abre.
 *   2. HASH: SHA-256 de los bytes originales (`bytes_sha256`). Nunca se estima.
 *   3. PÁGINAS: cuenta con `pdfinfo` y la compara con las esperadas del paquete (si se declararon). Una diferencia detiene el proceso.
 *   4. TEXTO: `pdftotext` íntegro, sin editar. Si el texto es casi vacío (PDF escaneado) se detiene: NO se inventa texto ni se hace OCR aquí.
 *   5. IDENTIDAD: el texto debe contener las frases de identidad del paquete (sin distinguir mayúsculas ni tildes). Si no, se detiene.
 *   6. HASH DEL TEXTO: `text_sha256` del texto exactamente como se entrega en el paquete.
 *   7. PAQUETE: escribe `OfficialSourcePackage` en docs/corpus/inbox/<lote>/ y un recibo en docs/corpus/staging/<lote>/receipts/.
 *   8. RECEPTOR OFFLINE: corre process-batch sobre ESE paquete (segmentación, QA, candidato y hoja del CLO).
 *
 * Offline: NO hace red, NO toca Supabase ni el corpus. Requiere `pdfinfo` y `pdftotext` (poppler-utils). Un paquete nunca queda verificado ni
 * autoritativo; V4/V5 solo los da el CLO. Decreto y Gaceta se registran SOLO si el propio texto del PDF los contiene; si no, `UNKNOWN`.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { main as procesarLote } from './process-batch';

export type TipoDocumento = 'LAW' | 'DECREE' | 'CODE' | 'REGULATION' | 'REFORM';

export interface PerfilPaquete {
  nombre: string;
  tipo: TipoDocumento;
  /** Frases que el texto debe contener para aceptar la identidad (todas). */
  identidad: readonly string[];
  /** Páginas esperadas según quien lo vio; null = no declaradas. Una diferencia detiene el proceso. */
  paginasEsperadas: number | null;
  /** Valores que se copian al paquete SOLO si aparecen en el texto del PDF. */
  decreto: string | null;
  gaceta: string | null;
}

/** Los cuatro paquetes del Tramo A. Las páginas esperadas son observaciones de terceros, no acreditaciones. */
export const PERFILES: Readonly<Record<string, PerfilPaquete>> = Object.freeze({
  'HN-001-A01': { nombre: 'Código de Comercio', tipo: 'CODE', identidad: ['comercio'], paginasEsperadas: 419, decreto: '73-50', gaceta: null },
  'HN-001-A02': { nombre: 'Decreto 284-2013 (reforma al Código de Comercio)', tipo: 'REFORM', identidad: ['284-2013'], paginasEsperadas: 17, decreto: '284-2013', gaceta: '33,445' },
  'HN-001-A03': { nombre: 'Código de la Niñez y de la Adolescencia', tipo: 'CODE', identidad: ['ninez', 'adolescencia'], paginasEsperadas: null, decreto: '73-96', gaceta: null },
  'HN-001-A04': { nombre: 'Decreto 35-2013 (reforma al Código de la Niñez)', tipo: 'REFORM', identidad: ['35-2013'], paginasEsperadas: null, decreto: '35-2013', gaceta: '33,222' },
});

/** Mínimo de caracteres por página para considerar que el PDF tiene texto extraíble (por debajo: probable escaneo). */
export const MIN_CARACTERES_POR_PAGINA = 300;

export const sha256 = (datos: Buffer | string): string => createHash('sha256').update(datos).digest('hex');

/** Minúsculas, sin tildes y con espacios simples, para comparar identidad. */
export const normalizar = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Frases de identidad que NO aparecen en el texto. Vacío = identidad aceptada. */
export function identidadFaltante(texto: string, frases: readonly string[]): string[] {
  const t = normalizar(texto);
  return frases.filter((f) => !t.includes(normalizar(f)));
}

/** ¿El valor (decreto/Gaceta) consta en el texto? Compara sin separadores de miles para tolerar «33,445» y «33445». */
export function constaEnTexto(texto: string, valor: string): boolean {
  const t = normalizar(texto);
  const v = normalizar(valor);
  return t.includes(v) || t.replace(/[.,]/g, '').includes(v.replace(/[.,]/g, ''));
}

export interface Recibo {
  paquete: string;
  estado: 'ACEPTADO' | 'DETENIDO';
  motivo: string | null;
  archivo: string;
  bytes: number;
  bytes_sha256: string | null;
  paginas: number | null;
  paginas_esperadas: number | null;
  caracteres: number | null;
  text_sha256: string | null;
  identidad_faltante: string[];
  decreto_consta: boolean | null;
  gaceta_consta: boolean | null;
  resultado_receptor: string | null;
}

function ejecutar(bin: string, args: string[]): string {
  return execFileSync(bin, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

export function paginasDe(ruta: string): { paginas: number; cifrado: boolean } {
  const info = ejecutar('pdfinfo', [ruta]);
  const p = /^Pages:\s+(\d+)/m.exec(info);
  const e = /^Encrypted:\s+(\w+)/m.exec(info);
  if (!p) throw new Error('pdfinfo no devolvió el número de páginas');
  return { paginas: Number(p[1]), cifrado: e?.[1]?.toLowerCase() === 'yes' };
}

export function extraerTexto(ruta: string): string {
  return ejecutar('pdftotext', ['-enc', 'UTF-8', ruta, '-']);
}

export interface OpcionesRecepcion {
  archivo: string;
  paquete: string;
  url: string;
  retriever: string;
  fecha: string;
  metodo: 'MANUAL_BROWSER' | 'CURL' | 'API' | 'OTHER';
  lote: string;
  raiz: string;
}

export function recibir(o: OpcionesRecepcion): { recibo: Recibo; codigo: number } {
  const perfil = PERFILES[o.paquete];
  const recibo: Recibo = {
    paquete: o.paquete, estado: 'DETENIDO', motivo: null, archivo: o.archivo, bytes: 0, bytes_sha256: null, paginas: null,
    paginas_esperadas: perfil?.paginasEsperadas ?? null, caracteres: null, text_sha256: null, identidad_faltante: [],
    decreto_consta: null, gaceta_consta: null, resultado_receptor: null,
  };
  const parar = (motivo: string): { recibo: Recibo; codigo: number } => {
    recibo.motivo = motivo;
    escribirRecibo(o, recibo);
    return { recibo, codigo: 1 };
  };

  if (!perfil) return parar(`paquete desconocido: ${o.paquete} (válidos: ${Object.keys(PERFILES).join(', ')})`);
  if (!/^https:\/\//.test(o.url)) return parar('la URL de origen debe ser https y exacta (la del documento, no la portada)');
  if (Number.isNaN(Date.parse(o.fecha)) || Date.parse(o.fecha) > Date.now()) return parar('--fecha debe ser una fecha ISO real y no futura');
  if (!existsSync(o.archivo)) return parar('el archivo no existe');

  const bytes = readFileSync(o.archivo);
  recibo.bytes = bytes.length;
  if (bytes.length === 0) return parar('archivo vacío');
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return parar('no es un PDF (no empieza por %PDF-); puede ser una página HTML guardada');
  recibo.bytes_sha256 = sha256(bytes);

  let info: { paginas: number; cifrado: boolean };
  try { info = paginasDe(o.archivo); } catch (e) { return parar(`pdfinfo no pudo abrir el archivo: ${e instanceof Error ? e.message : String(e)}`); }
  recibo.paginas = info.paginas;
  if (info.cifrado) return parar('PDF cifrado: se necesita la versión sin cifrar de la fuente');
  if (perfil.paginasEsperadas !== null && info.paginas !== perfil.paginasEsperadas) {
    return parar(`páginas ${info.paginas} ≠ esperadas ${perfil.paginasEsperadas}: puede ser otra edición o un archivo distinto; el CLO decide`);
  }

  let texto: string;
  try { texto = extraerTexto(o.archivo); } catch (e) { return parar(`pdftotext falló: ${e instanceof Error ? e.message : String(e)}`); }
  recibo.caracteres = texto.length;
  if (texto.length / info.paginas < MIN_CARACTERES_POR_PAGINA) {
    return parar(`texto casi vacío (${texto.length} caracteres en ${info.paginas} páginas): probable PDF escaneado; hace falta una versión con texto. No se inventa texto`);
  }

  recibo.identidad_faltante = identidadFaltante(texto, perfil.identidad);
  if (recibo.identidad_faltante.length > 0) return parar(`identidad no confirmada por el texto; faltan: ${recibo.identidad_faltante.join(', ')}`);

  recibo.text_sha256 = sha256(texto);
  recibo.decreto_consta = perfil.decreto ? constaEnTexto(texto, perfil.decreto) : null;
  recibo.gaceta_consta = perfil.gaceta ? constaEnTexto(texto, perfil.gaceta) : null;

  const dominio = new URL(o.url).host;
  const paquete = {
    source_url: o.url,
    source_domain: dominio,
    retrieved_at: new Date(o.fecha).toISOString(),
    document_name: perfil.nombre,
    document_type: perfil.tipo,
    decree: perfil.decreto && recibo.decreto_consta ? perfil.decreto : 'UNKNOWN',
    gaceta: perfil.gaceta && recibo.gaceta_consta ? perfil.gaceta : 'UNKNOWN',
    gaceta_date: 'UNKNOWN',
    bytes_sha256: recibo.bytes_sha256,
    text_sha256: recibo.text_sha256,
    extracted_text: texto,
    retrieval_method: o.metodo,
    source_tier: null,
    retriever: o.retriever,
    verification_state: 'UNVERIFIED',
  };

  const inbox = join(o.raiz, 'docs/corpus/inbox', o.lote);
  mkdirSync(inbox, { recursive: true });
  const rutaPaquete = join(inbox, `${o.paquete}.json`);
  writeFileSync(rutaPaquete, `${JSON.stringify(paquete, null, 2)}\n`);

  const salida = join(o.raiz, 'docs/corpus/staging', o.lote);
  const r = procesarLote([rutaPaquete, '--out', salida]);
  recibo.resultado_receptor = r.mensaje;
  recibo.estado = r.codigo === 0 ? 'ACEPTADO' : 'DETENIDO';
  if (r.codigo !== 0) recibo.motivo = `el receptor offline rechazó el paquete: ${r.mensaje}`;
  escribirRecibo(o, recibo);
  return { recibo, codigo: r.codigo };
}

function escribirRecibo(o: OpcionesRecepcion, r: Recibo): void {
  const dir = join(o.raiz, 'docs/corpus/staging', o.lote, 'receipts');
  mkdirSync(dir, { recursive: true });
  const md = [
    `# Recibo de recepción · ${r.paquete}`,
    '',
    `**Estado:** ${r.estado}${r.motivo ? ` — ${r.motivo}` : ''}`,
    '',
    '| Comprobación | Resultado |',
    '|---|---|',
    `| Archivo | ${r.archivo} (${r.bytes} bytes) |`,
    `| bytes_sha256 | ${r.bytes_sha256 ?? 'NO CALCULADO'} |`,
    `| Páginas (pdfinfo) | ${r.paginas ?? '—'} (esperadas: ${r.paginas_esperadas ?? 'no declaradas'}) |`,
    `| Caracteres de texto | ${r.caracteres ?? '—'} |`,
    `| text_sha256 | ${r.text_sha256 ?? 'NO CALCULADO'} |`,
    `| Identidad (frases faltantes) | ${r.identidad_faltante.length ? r.identidad_faltante.join(', ') : 'ninguna'} |`,
    `| Decreto consta en el texto | ${r.decreto_consta ?? 'n/a'} |`,
    `| Gaceta consta en el texto | ${r.gaceta_consta ?? 'n/a'} |`,
    `| Receptor offline | ${r.resultado_receptor ?? 'no ejecutado'} |`,
    '',
    'Nada aquí es verificado, autoritativo ni vigente. V4/V5 solo los da el CLO con cotejo documental.',
    '',
  ].join('\n');
  writeFileSync(join(dir, `${r.paquete}.md`), md);
}

function valor(argv: readonly string[], nombre: string): string | undefined {
  const i = argv.indexOf(nombre);
  return i >= 0 ? argv[i + 1] : undefined;
}

export function cli(argv: readonly string[]): number {
  const archivo = argv.find((a, k) => !a.startsWith('--') && !(k > 0 && argv[k - 1].startsWith('--')));
  const paquete = valor(argv, '--paquete');
  const url = valor(argv, '--url');
  const retriever = valor(argv, '--retriever');
  const fecha = valor(argv, '--fecha');
  if (!archivo || !paquete || !url || !retriever || !fecha) {
    console.error('uso: receive-pdf <archivo.pdf> --paquete HN-001-A0N --url <URL exacta> --retriever "<quién>" --fecha <ISO> [--metodo MANUAL_BROWSER|CURL|API|OTHER] [--lote nombre]');
    return 2;
  }
  const metodo = (valor(argv, '--metodo') ?? 'MANUAL_BROWSER') as OpcionesRecepcion['metodo'];
  const lote = valor(argv, '--lote') ?? '2026-11-hn-001-tranche-a';
  const { recibo, codigo } = recibir({ archivo: resolve(archivo), paquete, url, retriever, fecha, metodo, lote, raiz: process.cwd() });
  console.log(`${recibo.paquete}: ${recibo.estado}${recibo.motivo ? ` — ${recibo.motivo}` : ''}`);
  if (recibo.bytes_sha256) console.log(`bytes_sha256 ${recibo.bytes_sha256}  páginas ${recibo.paginas}`);
  return codigo;
}

if (process.argv[1] && /receive-pdf\.ts$/.test(process.argv[1])) process.exitCode = cli(process.argv.slice(2));
