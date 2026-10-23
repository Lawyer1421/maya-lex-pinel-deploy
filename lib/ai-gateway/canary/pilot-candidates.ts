/**
 * lib/ai-gateway/canary/pilot-candidates.ts
 * G5-A: candidatos del piloto. SOLO se registra lo que la evidencia existente del repositorio respalda; el resto es `null`.
 *
 * Evidencia disponible: el caso G1-VIG-CODIGO-PENAL-130-2017 del Golden Set (dictamen CLO del 2026-10-22, issue #78)
 * cita La Gaceta 34,940 (Código Penal, D.130-2017) y La Gaceta 35,247 (D.46-2020) con el SHA-256 de cada PDF oficial.
 * Ese dictamen aprueba un CASO DEL GOLDEN SET; NO es una aprobación de entradas del manifiesto, así que `revisionCLO`
 * queda en null. Tampoco hay en el repositorio el id canónico del fragmento almacenado, el texto real del artículo
 * ni una URL oficial: no se inventan. Todos los candidatos quedan en PENDING_CLO_APPROVAL.
 */
import type { CandidatoPiloto } from './pilot-manifest';

export const CANDIDATOS_PILOTO: readonly CandidatoPiloto[] = [
  {
    clave: 'PILOTO-CP-D130-2017-ART-634',
    descripcion: 'Código Penal (D.130-2017), art. 634: deroga el D.144-83 y sus reformas',
    fragmentoId: null, fuente: null, numArticulo: '634', contenidoSha256: null,
    fuenteOficial: { url: null, gaceta: '34,940', pdfSha256: '54f6a4122f8b96a60631deb8c486284ff0744c0d09ea0ed332d8d5d1960ba132' },
    estadoVerificacion: null,
    nota: 'Gaceta y SHA-256 del PDF tomados de tests/golden/gateway-g1-casos.ts (PROCEDENCIA_G1, dictamen CLO 22-oct-2026). Faltan: id canónico del fragmento almacenado, texto real del artículo (para el hash), URL oficial y estado V4/V5 del corpus.',
    revisionCLO: null,
  },
  {
    clave: 'PILOTO-D46-2020-ART-1',
    descripcion: 'Decreto 46-2020, art. 1: vigencia del Código Penal desde el 25-jun-2020',
    fragmentoId: null, fuente: null, numArticulo: '1', contenidoSha256: null,
    fuenteOficial: { url: null, gaceta: '35,247', pdfSha256: '60b5b7865bdb0b868131005429017632fb168e286a1a9dfa5482378e8f58bbdb' },
    estadoVerificacion: null,
    nota: 'Gaceta y SHA-256 del PDF tomados de tests/golden/gateway-g1-casos.ts (PROCEDENCIA_G1, dictamen CLO 22-oct-2026). Faltan: id canónico del fragmento almacenado, texto real del artículo (para el hash), URL oficial y estado V4/V5 del corpus.',
    revisionCLO: null,
  },
];
