/**
 * Prep path for Código del Notariado (Decreto 353-2005).
 *
 * Classification: MULTI_INSTRUMENT_APPEND
 * The CEDIJ PDF appends the full reform decree D.77-2006 after D.353-2005.
 * Dry-run FAIL-HARD duplicates arts 1, 2, 3, 4, 11, 27 because the appendix
 * restates those articles. `--reject-quoted-heading` does not help (0
 * guillemets). This script always wires `--stop-at-text` with the
 * `DECRETO No. 77-2006` marker (opt-in on the generic parser; required
 * here). A look-ahead phantom Art.11 on `Artículos 11 Y` in the appendix
 * is also dropped by the same cut.
 *
 * Dry-run by default. `--execute` writes local SQL only; does NOT apply
 * to Supabase / production. SQL_APPLIED=NO. PRODUCTION_WRITE_AUTHORIZED=NO.
 *
 * Usage:
 *   npx tsx scripts/ingesta-notariado.ts --input fuente.pdf
 *   npx tsx scripts/ingesta-notariado.ts --input fuente.pdf --execute out/notariado.sql
 */
import { ejecutarIngesta, fallarDuro, parsearArgs } from './ingestar-ley';

/** First-line marker of the appended D.77-2006 in the CEDIJ PDF. */
export const STOP_AT_TEXT_CODIGO_NOTARIADO = 'DECRETO No. 77-2006';

export function argvPrepNotariado(input: string, execute: string | null = null): string[] {
  const argv = [
    '--input', input,
    '--coleccion', 'mayalex_normativos',
    '--materia', '03_NOTARIAL',
    '--fuente', 'Código del Notariado (Decreto 353-2005)',
    '--id-prefix', 'mayalex_normativos:codigo_notariado_2005',
    '--instrumento', 'Decreto 353-2005',
    '--stop-at-text', STOP_AT_TEXT_CODIGO_NOTARIADO,
  ];
  if (execute) {
    argv.push('--execute', execute);
  }
  return argv;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const inputIdx = argv.indexOf('--input');
  const input = inputIdx >= 0 ? argv[inputIdx + 1] : undefined;
  if (!input || input.startsWith('--')) {
    fallarDuro('--input requerido');
  }
  const execIdx = argv.indexOf('--execute');
  const execute = execIdx >= 0 ? argv[execIdx + 1] : null;
  if (execIdx >= 0 && (!execute || execute.startsWith('--'))) {
    fallarDuro('falta valor para --execute <salida.sql>');
  }

  const opts = parsearArgs(argvPrepNotariado(input, execute));
  console.log('Prep Notariado (MULTI_INSTRUMENT_APPEND): --stop-at-text ' + JSON.stringify(STOP_AT_TEXT_CODIGO_NOTARIADO));
  await ejecutarIngesta(opts);
}

if (process.argv[1] && process.argv[1].endsWith('ingesta-notariado.ts')) {
  main().catch((err) => {
    console.error('FALLÓ:', err);
    process.exit(1);
  });
}
