import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** El diagnóstico CLO de corpus es de SOLO LECTURA y devuelve solo conteos. Este archivo no se ejecuta aquí: se inspecciona su texto. */
const SQL = readFileSync(join(process.cwd(), 'scripts/diagnostics/clo-corpus-counts-readonly.sql'), 'utf8');
const SIN_COMENTARIOS = SQL.replace(/--.*$/gm, '');
const SENTENCIAS = SIN_COMENTARIOS.split(';').map((x) => x.trim()).filter(Boolean);

describe('diagnóstico CLO de corpus (solo lectura)', () => {
  it('toda sentencia es un SELECT', () => {
    expect(SENTENCIAS.length).toBeGreaterThanOrEqual(6);
    for (const s of SENTENCIAS) expect(s, s.slice(0, 60)).toMatch(/^select\b/i);
  });
  it('no contiene escrituras, DDL, copias ni llamadas con efectos', () => {
    expect(SIN_COMENTARIOS).not.toMatch(/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|merge|call|vacuum|reindex|refresh|comment\s+on|set\s+role|lo_import|pg_read_file|pg_ls_dir|pg_sleep|nextval|setval)\b/i);
  });
  it('lee una sola tabla: public.biblioteca_vectores', () => {
    const tablas = [...SIN_COMENTARIOS.matchAll(/\bfrom\s+([a-z_.]+)/gi)].map((m) => m[1].toLowerCase());
    expect(tablas.length).toBe(SENTENCIAS.length);
    expect(new Set(tablas)).toEqual(new Set(['public.biblioteca_vectores']));
  });
  it('devuelve solo conteos: el contenido y el embedding nunca van en una lista de columnas', () => {
    // `contenido` solo puede aparecer como operando de una expresión regular (conteo); `embedding` solo como `is not null`.
    for (const m of SIN_COMENTARIOS.matchAll(/\bcontenido\b(.{0,3})/g)) expect(m[1].trim().startsWith('~'), m[0]).toBe(true);
    for (const m of SIN_COMENTARIOS.matchAll(/\bembedding\b(.{0,12})/g)) expect(m[1]).toMatch(/^\s*is not null/i);
    expect(SIN_COMENTARIOS).not.toMatch(/\bselect\s+\*/i);
    expect(SIN_COMENTARIOS).not.toMatch(/\b(?:id|fuente|num_articulo|metadata)\s*,\s*(?:count|from)/i);
  });
  it('cubre lo pedido: instrument_id, tipo de fuente, país, nulos, últimas 48 h y 03_NOTARIAL con DNI/RTN/protocolo', () => {
    expect(SQL).toMatch(/metadata->>'instrument_id'/);
    expect(SQL).toMatch(/fuente_tipo/);
    expect(SQL).toMatch(/jurisdiccion/);
    expect(SQL).toMatch(/instrument_id_nulo_metadata/);
    expect(SQL).toMatch(/interval '48 hours'/);
    expect(SQL).toMatch(/materia = '03_NOTARIAL'/);
    expect(SQL).toMatch(/con_posible_dni/);
    expect(SQL).toMatch(/con_posible_rtn/);
    expect(SQL).toMatch(/con_numero_de_protocolo/);
  });
});
