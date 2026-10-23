/**
 * lib/ai-gateway/canary/clo-pilot-pack.ts
 * G6-B: genera el paquete exacto que necesita el CLO para aprobar las primeras entradas reales del manifiesto.
 * Puro y determinista: mismo input, mismo documento. Nunca aprueba nada ni rellena un dato que falte.
 *
 *   candidate → verification → CLO review → approval → effective manifest
 *
 * Este módulo cubre los tres primeros pasos y deja constancia de en cuál está cada candidato. El último paso
 * (`construirManifiestoEfectivo`) existe en pilot-manifest.ts pero no se ejecuta sobre el manifiesto real sin autorización.
 */
import { MANIFIESTO_PROCEDENCIA_PUBLICA } from '../shadow/public-provenance-manifest';
import { etapaDe, verificarCandidato, type CandidatoPiloto, type DossierCLO } from './pilot-manifest';

export type PasoFlujo = 'CANDIDATE' | 'VERIFICATION_PENDING' | 'READY_FOR_CLO_REVIEW' | 'CLO_APPROVED' | 'CLO_REJECTED';

const CAMPOS: ReadonlyArray<readonly [keyof Omit<DossierCLO, 'decisionSolicitada'>, string]> = [
  ['norma', '1. Norma'],
  ['decreto', '2. Decreto'],
  ['articulo', '3. Artículo'],
  ['textoExacto', '4. Texto exacto'],
  ['fragmentoIdCanonico', '5. Canonical fragment ID'],
  ['contenidoSha256', '6. SHA-256 del texto exacto'],
  ['gaceta', '7. Número de La Gaceta'],
  ['fechaGaceta', '8. Fecha'],
  ['urlOficial', '9. URL oficial'],
  ['pdfSha256', '10. SHA-256 del PDF oficial'],
  ['estadoV', '11. Estado V4/V5'],
  ['evidenciaVigencia', '12. Evidencia de vigencia'],
  ['reformaODerogacion', '13. Reforma / derogación'],
  ['goldenSetRelacionado', '14. Golden Set relacionado'],
];

export function pasoDelFlujo(c: CandidatoPiloto): PasoFlujo {
  const etapa = etapaDe(c);
  if (etapa === 'APPROVED') return 'CLO_APPROVED';
  if (etapa === 'REJECTED') return 'CLO_REJECTED';
  const v = verificarCandidato(c);
  const pendientesDossier = c.dossier ? Object.values(c.dossier).filter((d) => typeof d === 'object' && d.estado === 'PENDING_VERIFICATION').length : 1;
  if (!v.revisable || pendientesDossier > 0) return 'VERIFICATION_PENDING';
  return 'READY_FOR_CLO_REVIEW';
}

export interface ResumenPaquete {
  candidatos: number;
  pendingVerification: number;
  pendingCloApproval: number;
  approved: number;
  effectiveManifestCount: number;
}

export function resumenPaquete(candidatos: readonly CandidatoPiloto[]): ResumenPaquete {
  const pasos = candidatos.map(pasoDelFlujo);
  return {
    candidatos: candidatos.length,
    pendingVerification: pasos.filter((p) => p === 'VERIFICATION_PENDING' || p === 'CANDIDATE').length,
    pendingCloApproval: candidatos.filter((c) => etapaDe(c) === 'PENDING_CLO_APPROVAL').length,
    approved: pasos.filter((p) => p === 'CLO_APPROVED').length,
    effectiveManifestCount: MANIFIESTO_PROCEDENCIA_PUBLICA.length,
  };
}

const celda = (t: string) => t.replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** Documento Markdown del paquete, listo para entregar al CLO. */
export function generarPaqueteCLO(candidatos: readonly CandidatoPiloto[]): string {
  const r = resumenPaquete(candidatos);
  const L: string[] = [
    '# Paquete del piloto de procedencia para el CLO — G6-B',
    '',
    '> Generado por `npx tsx scripts/g6-clo-pilot-pack.ts`. No aprueba nada: cada decisión es del CLO.',
    '> Estados: `SOURCED_FROM_REPO` = respaldado por evidencia del repositorio (con su procedencia); `PENDING_VERIFICATION` = falta evidencia;',
    '> `PENDING_CLO_APPROVAL` = falta la aprobación humana. Lo que falta aparece como `—`: no se inventa.',
    '',
    `**Candidatos:** ${r.candidatos} · **PENDING_VERIFICATION:** ${r.pendingVerification} · **PENDING_CLO_APPROVAL:** ${r.pendingCloApproval} · **Aprobados:** ${r.approved}`,
    `**Manifiesto efectivo (entradas aprobadas): ${r.effectiveManifestCount}**`,
    '',
    'Flujo: `candidate → verification → CLO review → approval → effective manifest`. El último paso no se ejecuta sin autorización expresa.',
  ];
  for (const c of candidatos) {
    const paso = pasoDelFlujo(c);
    L.push('', `## ${c.clave} — ${c.descripcion}`, '', `- **Paso del flujo:** ${paso}`, `- **Etapa de aprobación:** ${etapaDe(c)}${c.revisionCLO ? '' : ' (sin revisión formal del CLO)'}`);
    if (!c.dossier) {
      L.push('- _Sin expediente._');
      continue;
    }
    L.push('', '| Dato | Valor | Estado | Procedencia |', '|---|---|---|---|');
    for (const [clave, titulo] of CAMPOS) {
      const d = c.dossier[clave];
      L.push(`| ${titulo} | ${d.valor === null ? '—' : celda(d.valor)} | ${d.estado} | ${d.procedencia === null ? '—' : celda(d.procedencia)} |`);
    }
    const notas = CAMPOS.map(([clave, titulo]) => [titulo, c.dossier![clave].nota] as const).filter(([, n]) => n);
    if (notas.length) L.push('', '**Notas por dato:**', ...notas.map(([t, n]) => `- ${t}: ${n}`));
    L.push('', `**15. Procedencia de cada dato:** ver la columna «Procedencia».`, `**16. Decisión solicitada al CLO:** ${c.dossier.decisionSolicitada}`);
  }
  return `${L.join('\n')}\n`;
}
