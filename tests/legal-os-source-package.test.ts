import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FUENTES_OFICIALES_VERIFICADAS, HOSTS_EXCLUIDOS, esFuenteOficial } from '@/lib/legal-os/retrieval/official-sources';
import { REGISTRO_FUENTES, buscarPorDominio, dominiosVerificados, institucionesSinDominio } from '@/lib/legal-os/retrieval/official-source-registry';
import { sha256Bytes, sha256Texto, validarPaquete } from '@/lib/legal-os/corpus-factory/official-source-package';
import { importarPaquetes } from '@/lib/legal-os/corpus-factory/import-package';
import { puedeIndexarPublicamente } from '@/lib/legal-os/jurisprudence';
import { main } from '../tools/corpus/import-official-source-package';

const RAIZ = join(__dirname, '..');
const AHORA = new Date('2026-10-23T12:00:00Z');
const TEXTO = 'ARTÍCULO 1.- Texto sintético de prueba, suficientemente largo para superar el mínimo exigido por el validador. ARTÍCULO 2.- Otro.';
const BYTES = new TextEncoder().encode('bytes-sinteticos');

function paquete(extra: Record<string, unknown> = {}) {
  return {
    source_url: 'https://example.invalid/doc.pdf', source_domain: 'example.invalid', retrieved_at: '2026-10-01T12:00:00Z', document_name: 'Ley Sintética',
    document_type: 'LAW', decree: 'UNKNOWN', gaceta: 'UNKNOWN', gaceta_date: 'UNKNOWN', bytes_sha256: sha256Bytes(BYTES), text_sha256: sha256Texto(TEXTO),
    extracted_text: TEXTO, retrieval_method: 'MANUAL_BROWSER', source_tier: null, retriever: 'human', verification_state: 'UNVERIFIED', ...extra,
  };
}
const validar = (p: unknown, o = {}) => validarPaquete(p, { now: AHORA, ...o });

describe('registro de fuentes oficiales', () => {
  it('es consistente con official-sources.ts (hosts verificados, tier, autoridad, automatización)', () => {
    for (const f of FUENTES_OFICIALES_VERIFICADAS) {
      const e = buscarPorDominio(f.host);
      expect(e, f.host).not.toBeNull();
      expect(e).toMatchObject({ verification_status: 'VERIFIED', source_tier: f.tier, autoritativa: f.autoritativa, automatizable: f.automatizable });
    }
    // Todo dominio VERIFIED con tier y autoridad aparece en la lista de official-sources.ts (o es solo descubrimiento).
    for (const e of dominiosVerificados().filter((x) => x.source_tier !== null)) {
      expect(FUENTES_OFICIALES_VERIFICADAS.some((f) => f.host === e.domain), e.domain!).toBe(true);
    }
  });
  it('los hosts excluidos están REJECTED_PRIVATE y esFuenteOficial coincide con el registro', () => {
    for (const h of HOSTS_EXCLUIDOS) {
      expect(buscarPorDominio(h)?.verification_status).toBe('REJECTED_PRIVATE');
      expect(esFuenteOficial(`https://${h}/x`).oficial).toBe(false);
    }
    for (const e of dominiosVerificados()) {
      const c = esFuenteOficial(`https://${e.domain}/x`);
      expect(c.oficial, e.domain!).toBe(FUENTES_OFICIALES_VERIFICADAS.some((f) => f.host === e.domain));
    }
  });
  it('no inventa dominios: La Gaceta oficial y el resto de instituciones quedan con domain null y PENDING_VERIFICATION', () => {
    const gaceta = REGISTRO_FUENTES.find((e) => e.id === 'GACETA_OFICIAL')!;
    expect(gaceta).toMatchObject({ domain: null, verification_status: 'PENDING_VERIFICATION', last_checked: null });
    for (const id of ['CONGRESO_NACIONAL', 'SAR', 'CNBS', 'BCH', 'IP', 'RNP', 'ADUANAS']) {
      expect(REGISTRO_FUENTES.find((e) => e.id === id), id).toMatchObject({ domain: null, verification_status: 'PENDING_VERIFICATION' });
    }
    expect(institucionesSinDominio().length).toBeGreaterThanOrEqual(8);
    // Ningún dominio con «gaceta» salvo los dos privados rechazados.
    expect(REGISTRO_FUENTES.filter((e) => e.domain && /gaceta/i.test(e.domain)).every((e) => e.verification_status === 'REJECTED_PRIVATE')).toBe(true);
  });
  it('los dominios verificados llevan fecha de comprobación; las instituciones sin dominio no son autoritativas de hecho', () => {
    for (const e of dominiosVerificados()) expect(e.last_checked, e.domain!).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('validarPaquete', () => {
  it('paquete sintético con dominio desconocido → DISCOVERED_UNVERIFIED, nunca autoritativo', () => {
    const r = validar(paquete(), { bytes: BYTES });
    expect(r).toMatchObject({ estado: 'DISCOVERED_UNVERIFIED', tierConcedido: null, autoritativo: false });
  });
  it('hash de texto que no coincide → HASH_MISMATCH', () => {
    expect(validar(paquete({ extracted_text: `${TEXTO} alterado` }))).toMatchObject({ estado: 'REJECTED', razones: expect.arrayContaining(['HASH_MISMATCH']) });
  });
  it('hash de bytes que no coincide → BYTES_HASH_MISMATCH (solo si se aportan los bytes)', () => {
    expect(validar(paquete(), { bytes: new TextEncoder().encode('otros') })).toMatchObject({ estado: 'REJECTED', razones: expect.arrayContaining(['BYTES_HASH_MISMATCH']) });
    expect(validar(paquete()).estado).toBe('DISCOVERED_UNVERIFIED');
  });
  it('hex mal formado → esquema inválido', () => {
    expect(validar(paquete({ text_sha256: 'ABC' }))).toMatchObject({ estado: 'REJECTED', razones: ['ESQUEMA_INVALIDO'] });
  });
  it('fuente privada (lagaceta.hn) → rechazada', () => {
    const r = validar(paquete({ source_url: 'https://lagaceta.hn/noticia', source_domain: 'lagaceta.hn' }));
    expect(r).toMatchObject({ estado: 'REJECTED', razones: expect.arrayContaining(['FUENTE_PRIVADA_RECHAZADA']) });
  });
  it('dominio oficial verificado → SOURCE_VALIDATED con el tier del registro, pero autoritativo:false', () => {
    const r = validar(paquete({ source_url: 'https://legislacion.poderjudicial.gob.hn/sistemalegislacion/Anexos/x.pdf', source_domain: 'legislacion.poderjudicial.gob.hn', source_tier: 2 }));
    expect(r).toMatchObject({ estado: 'SOURCE_VALIDATED', tierConcedido: 2, autoritativo: false });
    expect((r as { advertencias: string[] }).advertencias.join(' ')).toMatch(/CLO/);
  });
  it('tier mayor al concedido (o tier sobre dominio desconocido) → TIER_EXCEDE_REGISTRO', () => {
    expect(validar(paquete({ source_tier: 1 }))).toMatchObject({ estado: 'REJECTED', razones: expect.arrayContaining(['TIER_EXCEDE_REGISTRO']) });
    const r = validar(paquete({ source_url: 'https://legislacion.poderjudicial.gob.hn/x.pdf', source_domain: 'legislacion.poderjudicial.gob.hn', source_tier: 1 }));
    expect(r).toMatchObject({ estado: 'REJECTED', razones: expect.arrayContaining(['TIER_EXCEDE_REGISTRO']) });
  });
  it('un host solo de descubrimiento (SEJE) no concede tier', () => {
    const r = validar(paquete({ source_url: 'https://sejeinfo.poderjudicial.gob.hn/x.csv', source_domain: 'sejeinfo.poderjudicial.gob.hn' }));
    expect(r).toMatchObject({ estado: 'DISCOVERED_UNVERIFIED', tierConcedido: null });
  });
  it('fecha futura → FECHA_FUTURA; fecha inválida → FECHA_INVALIDA', () => {
    expect(validar(paquete({ retrieved_at: '2027-01-01T00:00:00Z' }))).toMatchObject({ razones: expect.arrayContaining(['FECHA_FUTURA']) });
    expect(validar(paquete({ retrieved_at: 'no-es-fecha' }))).toMatchObject({ razones: expect.arrayContaining(['FECHA_INVALIDA']) });
  });
  it('http o dominio que no coincide con la URL → rechazado', () => {
    expect(validar(paquete({ source_url: 'http://example.invalid/doc.pdf' }))).toMatchObject({ razones: expect.arrayContaining(['URL_NO_HTTPS']) });
    expect(validar(paquete({ source_domain: 'otro.invalid' }))).toMatchObject({ razones: expect.arrayContaining(['DOMINIO_NO_COINCIDE']) });
    expect(validar(paquete({ source_url: 'https://legislacion.poderjudicial.gob.hn.evil.invalid/x', source_domain: 'legislacion.poderjudicial.gob.hn.evil.invalid' })).estado).toBe('DISCOVERED_UNVERIFIED');
  });
  it('texto vacío o absurdamente corto → TEXTO_DEMASIADO_CORTO', () => {
    const corto = 'hola';
    expect(validar(paquete({ extracted_text: corto, text_sha256: sha256Texto(corto) }))).toMatchObject({ razones: expect.arrayContaining(['TEXTO_DEMASIADO_CORTO']) });
  });
  it('un paquete no puede autoverificarse (V4/V5)', () => {
    expect(validar(paquete({ verification_state: 'V5' }))).toMatchObject({ estado: 'REJECTED', razones: expect.arrayContaining(['VERIFICACION_AUTOASIGNADA']) });
  });
  it('decree/gaceta ausentes quedan UNKNOWN, nunca inferidos', () => {
    const { decree: _d, gaceta: _g, gaceta_date: _f, ...resto } = paquete();
    const r = validar(resto);
    expect(r.estado).toBe('DISCOVERED_UNVERIFIED');
    if (r.estado !== 'REJECTED') expect(r.paquete).toMatchObject({ decree: 'UNKNOWN', gaceta: 'UNKNOWN', gaceta_date: 'UNKNOWN' });
  });
});

describe('importarPaquetes', () => {
  it('convierte a registro PENDING_VERIFICATION en etapa HASH sin URL oficial si solo es descubrimiento', () => {
    const l = importarPaquetes([{ archivo: 'a.json', contenido: paquete() }], [], { now: AHORA });
    expect(l.items[0]).toMatchObject({ estado: 'IMPORTED_DISCOVERED_UNVERIFIED', destino: 'CORPUS_RECORD', version: 1 });
    expect(l.records[0]).toMatchObject({ verification_state: 'PENDING_VERIFICATION', ingestion_state: 'HASH', official_url: null, source_tier: null, approvals: [] });
  });
  it('fuente validada conserva official_url y tier, y sigue sin aprobaciones', () => {
    const p = paquete({ source_url: 'https://legislacion.poderjudicial.gob.hn/x.pdf', source_domain: 'legislacion.poderjudicial.gob.hn', source_tier: 2 });
    const l = importarPaquetes([{ archivo: 'a.json', contenido: p }], [], { now: AHORA });
    expect(l.records[0]).toMatchObject({ official_url: 'https://legislacion.poderjudicial.gob.hn/x.pdf', source_tier: 2, verification_state: 'PENDING_VERIFICATION', approvals: [] });
  });
  it('duplicado por text_sha256 → DUPLICATE; mismo documento con texto nuevo → versión 2 (append-only)', () => {
    const a = importarPaquetes([{ archivo: 'a.json', contenido: paquete() }], [], { now: AHORA });
    const dup = importarPaquetes([{ archivo: 'b.json', contenido: paquete() }], a.records, { now: AHORA });
    expect(dup.items[0].estado).toBe('DUPLICATE');
    expect(dup.records).toHaveLength(1);
    const nuevoTexto = `${TEXTO} Texto reformado.`;
    const v2 = importarPaquetes([{ archivo: 'c.json', contenido: paquete({ extracted_text: nuevoTexto, text_sha256: sha256Texto(nuevoTexto) }) }], a.records, { now: AHORA });
    expect(v2.items[0]).toMatchObject({ estado: 'IMPORTED_DISCOVERED_UNVERIFIED', version: 2 });
    expect(v2.records.map((r) => r.version)).toEqual([1, 2]);
    expect(v2.records[0]).toEqual(a.records[0]);
  });
  it('un paquete rechazado no genera registro', () => {
    const l = importarPaquetes([{ archivo: 'x.json', contenido: paquete({ text_sha256: sha256Texto('otro') }) }], [], { now: AHORA });
    expect(l.items[0].estado).toBe('REJECTED');
    expect(l.records).toEqual([]);
  });
  it('una sentencia (JUDGMENT) va a jurisprudencia con precedencia y público/privado UNKNOWN → no indexable', () => {
    const l = importarPaquetes([{ archivo: 'j.json', contenido: paquete({ document_type: 'JUDGMENT', document_name: 'Sentencia sintética' }) }], [], { now: AHORA });
    expect(l.items[0]).toMatchObject({ destino: 'JURISPRUDENCE_RECORD' });
    expect(l.records).toEqual([]);
    expect(l.jurisprudencia[0]).toMatchObject({ precedential_status: 'UNKNOWN', public_private_status: 'UNKNOWN' });
    expect(puedeIndexarPublicamente(l.jurisprudencia[0]).puede).toBe(false);
  });
});

describe('CLI y fixture sintético', () => {
  it('el paquete de ejemplo es claramente falso (example.invalid) y se importa solo como descubrimiento', () => {
    const f = JSON.parse(readFileSync(join(RAIZ, 'tools', 'corpus', 'examples', 'synthetic-package.json'), 'utf8'));
    expect(f.source_domain).toBe('example.invalid');
    const r = validarPaquete(f, { now: AHORA });
    expect(r.estado).toBe('DISCOVERED_UNVERIFIED');
  });
  it('main() escribe records.json y el informe solo en --out, y es idempotente (duplicado la segunda vez)', () => {
    const out = mkdtempSync(join(tmpdir(), 'pkg-out-'));
    const entrada = join(RAIZ, 'tools', 'corpus', 'examples', 'synthetic-package.json');
    const r1 = main([entrada, '--out', out]);
    expect(r1.codigo).toBe(0);
    const recs = JSON.parse(readFileSync(join(out, 'records.json'), 'utf8'));
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({ verification_state: 'PENDING_VERIFICATION', ingestion_state: 'HASH' });
    main([entrada, '--out', out]);
    expect(JSON.parse(readFileSync(join(out, 'records.json'), 'utf8'))).toHaveLength(1);
    expect(JSON.parse(readFileSync(join(out, 'IMPORT_REPORT.json'), 'utf8')).items[0].estado).toBe('DUPLICATE');
    expect(readFileSync(join(out, 'IMPORT_REPORT.md'), 'utf8')).toMatch(/NO otorga autoridad/);
  });
  it('main() devuelve código 1 si hay paquetes rechazados y 2 si falta la entrada', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pkg-in-'));
    writeFileSync(join(dir, 'malo.json'), JSON.stringify(paquete({ text_sha256: sha256Texto('x') })));
    expect(main([dir, '--out', mkdtempSync(join(tmpdir(), 'pkg-out-'))]).codigo).toBe(1);
    expect(main([]).codigo).toBe(2);
    expect(main([join(dir, 'no-existe.json')]).codigo).toBe(2);
  });
  it('el CLI y los módulos de importación no usan red, bases de datos ni variables de entorno', () => {
    const GUARD = /\bfetch\s*\(|XMLHttpRequest|node:https?|from ['"]https?['"]|axios|undici|@supabase|supabase|process\.env|OPENAI|createClient/;
    for (const f of [
      ['tools', 'corpus', 'import-official-source-package.ts'], ['lib', 'legal-os', 'corpus-factory', 'official-source-package.ts'],
      ['lib', 'legal-os', 'corpus-factory', 'import-package.ts'], ['lib', 'legal-os', 'retrieval', 'official-source-registry.ts'],
    ]) expect(readFileSync(join(RAIZ, ...f), 'utf8'), f.join('/')).not.toMatch(GUARD);
  });
});
