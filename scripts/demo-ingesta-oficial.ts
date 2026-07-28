/**
 * scripts/demo-ingesta-oficial.ts
 * Paquete E — demostración del pipeline de ingesta oficial con una norma
 * 100% FICTICIA (HN-DEMO-NORMA-FICTICIA-001). No usa legislación real.
 *
 * Ejecutar: npx tsx scripts/demo-ingesta-oficial.ts
 *
 * Este script corre íntegramente en memoria (sin red, sin credenciales) —
 * demuestra: ingestión, segmentación, rechazo de errores, máquina de
 * estados V0→V5, auditoría y salida JSONL. La escritura real en el proyecto
 * de staging y el rollback se documentan por separado en
 * MAYALEX_DEMO_INGESTION_RESULTS.md (ejecutados vía consola SQL de
 * staging, no desde este script, para no requerir credenciales aquí).
 */
import { ejecutarPipeline } from '../lib/ingesta-oficial/pipeline';
import { sha256 } from '../lib/ingesta-oficial/hash';
import { MaquinaEstadosCorpus } from '../lib/ingesta-oficial/estados';
import type { ManifestFuenteOficial, PaqueteIngesta } from '../lib/ingesta-oficial/types';

const NORM_ID = 'HN-DEMO-NORMA-FICTICIA-001';

const TEXTO_DEMO = `
LEY DEMOSTRATIVA FICTICIA DEL PIPELINE MAYA LEX — NO ES LEGISLACIÓN REAL

ARTÍCULO 1. Esta ley ficticia existe únicamente para probar el pipeline de
ingesta de fuentes oficiales. No debe citarse como fuente jurídica real.

ARTÍCULO 2. El pipeline debe segmentar este artículo de forma independiente
del artículo 1, sin mezclar su contenido.

ARTÍCULO 3. Tercer artículo de demostración, para probar recuperación
exacta por número de artículo en el benchmark básico.
`;

function log(titulo: string, detalle: unknown) {
  console.log(`\n=== ${titulo} ===`);
  console.log(typeof detalle === 'string' ? detalle : JSON.stringify(detalle, null, 2));
}

async function main() {
  const manifestValido: ManifestFuenteOficial = {
    autoridad: 'Autoridad ficticia de demostración (NO REAL)',
    decreto: 'DEMO-FICTICIO-001',
    publicacion: '2026-01-01',
    materia: '99_DEMO_FICTICIO',
    estado: 'vigente',
    checksum: sha256(TEXTO_DEMO),
    responsableRevision: 'demo-tester',
    urlOReferencia: 'no-aplica-es-ficticio',
  };

  // ── 1. Escenario de RECHAZO — manifest incompleto ────────────────────────
  const paqueteInvalido: PaqueteIngesta = {
    manifest: { ...manifestValido, autoridad: '' },
    textoFuente: TEXTO_DEMO,
  };
  const resultadoRechazo = await ejecutarPipeline(NORM_ID, paqueteInvalido, {
    obtenerHashesExistentes: async () => new Set<string>(),
  });
  log('Escenario 1 — RECHAZO por manifest incompleto', {
    aceptado: resultadoRechazo.aceptado,
    motivo: resultadoRechazo.motivoRechazo,
    pasos_ejecutados: resultadoRechazo.pasos.length,
  });
  if (resultadoRechazo.aceptado) throw new Error('FALLO DE DEMO: se esperaba un rechazo');

  // ── 2. Escenario de RECHAZO — datos privados detectados ──────────────────
  const textoConPII = TEXTO_DEMO.replace('ARTÍCULO 1.', 'ARTÍCULO 1. [Cliente_Anonimo] —');
  const resultadoRechazoPII = await ejecutarPipeline(
    NORM_ID,
    { manifest: { ...manifestValido, checksum: sha256(textoConPII) }, textoFuente: textoConPII },
    { obtenerHashesExistentes: async () => new Set<string>() },
  );
  log('Escenario 2 — RECHAZO por posibles datos privados', {
    aceptado: resultadoRechazoPII.aceptado,
    motivo: resultadoRechazoPII.motivoRechazo,
  });
  if (resultadoRechazoPII.aceptado) throw new Error('FALLO DE DEMO: se esperaba un rechazo');

  // ── 3. Escenario de ACEPTACIÓN — paquete válido, con aprobación humana ───
  const resultadoOk = await ejecutarPipeline(
    NORM_ID,
    { manifest: manifestValido, textoFuente: TEXTO_DEMO },
    {
      obtenerHashesExistentes: async () => new Set<string>(),
      aprobadoPor: 'demo-abogado-revisor',
    },
  );
  log('Escenario 3 — ACEPTACIÓN completa (16/16 pasos)', {
    aceptado: resultadoOk.aceptado,
    articulos_extraidos: resultadoOk.articulos.map((a) => a.numArticulo),
    pasos_ok: resultadoOk.pasos.filter((p) => p.resultado === 'ok').length,
  });
  if (!resultadoOk.aceptado || resultadoOk.pasos.length !== 16) {
    throw new Error('FALLO DE DEMO: se esperaba aceptación completa de 16 pasos');
  }
  log('JSONL generado', resultadoOk.jsonl);

  // ── 4. Máquina de estados V0→V5 con auditoría ────────────────────────────
  const maquina = new MaquinaEstadosCorpus();
  const promociones = [
    maquina.promover(NORM_ID, 'V0', 'V1', { identificador: 'pipeline', rol: 'pipeline_automatico' }),
    maquina.promover(NORM_ID, 'V1', 'V2', { identificador: 'pipeline', rol: 'pipeline_automatico' }),
    maquina.promover(NORM_ID, 'V2', 'V3', { identificador: 'pipeline', rol: 'pipeline_automatico' }),
    maquina.promover(NORM_ID, 'V3', 'V4', { identificador: 'bot-no-autorizado', rol: 'pipeline_automatico' }), // debe rechazarse
    maquina.promover(NORM_ID, 'V3', 'V4', { identificador: 'demo-abogado-revisor', rol: 'abogado_revisor_senior' }), // debe aprobarse
  ];
  log('Máquina de estados — 5 intentos de promoción', promociones);

  const auditoria = maquina.obtenerAuditoria();
  log('Auditoría completa (persistir en ingestion_audit_log de staging)', auditoria);

  console.log('\n=== DEMO COMPLETA — HN-DEMO-NORMA-FICTICIA-001 ===');
  console.log('Ningún dato de esta demo corresponde a legislación real.');
}

main().catch((err) => {
  console.error('DEMO FALLÓ:', err);
  process.exit(1);
});
