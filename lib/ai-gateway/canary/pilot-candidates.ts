/**
 * lib/ai-gateway/canary/pilot-candidates.ts
 * G5-A / G6-B: candidatos del piloto. SOLO se registra lo que la evidencia existente del repositorio respalda; el resto es `null`
 * y figura como PENDING_VERIFICATION. Nada se inventa: ni URL, ni hash de contenido, ni id canónico, ni estado V, ni aprobación.
 *
 * Evidencia disponible:
 *  - tests/golden/gateway-g1-casos.ts → caso G1-VIG-CODIGO-PENAL-130-2017 (dictamen CLO del 2026-10-22, issue #78): La Gaceta 34,940
 *    (10-may-2019, pág. 140-A) y La Gaceta 35,247 (9-may-2020, pág. 2-A), con el SHA-256 de cada PDF oficial.
 *  - docs/governance/DECISION_LOG.md §2: transcripción del art. 634 del D.130-2017 «extracto para expediente».
 * Ese dictamen aprueba un CASO DEL GOLDEN SET; NO es una aprobación de entradas del manifiesto, así que `revisionCLO` es null.
 */
import type { CandidatoPiloto, DatoDossier } from './pilot-manifest';

const GOLDEN = 'tests/golden/gateway-g1-casos.ts → PROCEDENCIA_G1 y verificacionFechaPagina (G1-VIG-CODIGO-PENAL-130-2017; dictamen CLO 22-oct-2026, issue #78)';
const DECISION_LOG = 'docs/governance/DECISION_LOG.md §2 «Art. 1 y Art. 634, Código Penal (Decreto 130-2017) — extracto para expediente»';

const sourced = (valor: string, procedencia: string, nota?: string): DatoDossier => ({ valor, estado: 'SOURCED_FROM_REPO', procedencia, ...(nota ? { nota } : {}) });
const pending = (nota: string, valor: string | null = null, procedencia: string | null = null): DatoDossier => ({ valor, estado: 'PENDING_VERIFICATION', procedencia, nota });

const SIN_ID = 'El repositorio no contiene el id canónico del fragmento almacenado (los fixtures usan ids sintéticos). Debe leerse de la fila real del corpus; este PR no consulta la base.';
const SIN_HASH = 'Requiere el texto EXACTO almacenado (fragmento.contenido) para calcular el SHA-256; no se calcula sobre una transcripción.';
const SIN_URL = 'No hay URL oficial del PDF en el repositorio (el registro CEDIJ describe un patrón, no la URL de este documento). No se infiere.';
const SIN_V = 'El estado V4/V5 de la fila del corpus no consta en el repositorio; lo fija el pipeline de ingesta oficial, no este paquete.';

export const CANDIDATOS_PILOTO: readonly CandidatoPiloto[] = [
  {
    clave: 'PILOTO-CP-D130-2017-ART-634',
    descripcion: 'Código Penal (D.130-2017), art. 634: abrogación del D.144-83 y sus reformas',
    fragmentoId: null, fuente: null, numArticulo: '634', contenidoSha256: null,
    fuenteOficial: { url: null, gaceta: '34,940', pdfSha256: '54f6a4122f8b96a60631deb8c486284ff0744c0d09ea0ed332d8d5d1960ba132' },
    estadoVerificacion: null,
    nota: 'Gaceta y SHA-256 del PDF tomados del Golden Set (dictamen CLO 22-oct-2026). Faltan: id canónico del fragmento almacenado, texto exacto almacenado (para el hash), URL oficial y estado V4/V5 del corpus.',
    revisionCLO: null,
    dossier: {
      norma: sourced('Código Penal de Honduras', DECISION_LOG),
      decreto: sourced('Decreto 130-2017', `${DECISION_LOG}; lib/normas-cpp.ts («CÓDIGO PENAL HONDURAS (D.130-2017)»)`),
      articulo: sourced('634 — ABROGACIÓN', DECISION_LOG),
      textoExacto: pending(
        'Transcripción del expediente interno; debe cotejarse byte a byte con el texto almacenado y con el PDF oficial antes de calcular el hash.',
        'Derogar el Decreto No 144-83, de fecha 23 de Agosto de 1983, contentivo del Código Penal y todas sus reformas.',
        DECISION_LOG,
      ),
      fragmentoIdCanonico: pending(SIN_ID),
      contenidoSha256: pending(SIN_HASH),
      gaceta: sourced('La Gaceta 34,940', GOLDEN),
      fechaGaceta: sourced('10-may-2019 (pág. 140-A; página 156 del PDF)', GOLDEN, 'Fecha y página verificadas por el CLO contra el PDF oficial (VERIFICADO_CLO_PDF_OFICIAL).'),
      urlOficial: pending(SIN_URL),
      pdfSha256: sourced('54f6a4122f8b96a60631deb8c486284ff0744c0d09ea0ed332d8d5d1960ba132', GOLDEN, 'SHA-256 del PDF oficial de La Gaceta 34,940 aportado por el Investigador de Fuentes Oficiales HN y cotejado por el CLO.'),
      estadoV: pending(SIN_V),
      evidenciaVigencia: sourced(
        'Vigencia desde el 25-jun-2020 por el art. 1 del D.46-2020 (La Gaceta 35,247, 9-may-2020, pág. 2-A), que reforma el art. 635.',
        GOLDEN,
      ),
      reformaODerogacion: pending(
        'El art. 634 deroga el D.144-83. Falta confirmar que el art. 634 no haya sido reformado después: el registro CEDIJ lista un texto consolidado «actualizado a julio 2026» (docs/retrieval/OFFICIAL_HONDURAS_SOURCE_REGISTRY.md).',
        'Deroga el Decreto 144-83 (Código Penal de 1983) y todas sus reformas.',
        GOLDEN,
      ),
      goldenSetRelacionado: sourced('G1-VIG-CODIGO-PENAL-130-2017', GOLDEN),
      decisionSolicitada:
        'Confirmar que el texto almacenado del art. 634 coincide con La Gaceta 34,940, aportar el id canónico del fragmento, la URL oficial y el estado V4/V5 y, solo entonces, aprobar o rechazar la entrada con nombre, fecha y enlace al dictamen.',
    },
  },
  {
    clave: 'PILOTO-D46-2020-ART-1',
    descripcion: 'Decreto 46-2020, art. 1: fija la vigencia del Código Penal desde el 25-jun-2020',
    fragmentoId: null, fuente: null, numArticulo: '1', contenidoSha256: null,
    fuenteOficial: { url: null, gaceta: '35,247', pdfSha256: '60b5b7865bdb0b868131005429017632fb168e286a1a9dfa5482378e8f58bbdb' },
    estadoVerificacion: null,
    nota: 'Gaceta y SHA-256 del PDF tomados del Golden Set (dictamen CLO 22-oct-2026). Faltan: id canónico del fragmento almacenado, texto exacto (el repositorio no lo transcribe), URL oficial y estado V4/V5 del corpus.',
    revisionCLO: null,
    dossier: {
      norma: sourced('Decreto 46-2020 (reforma del Código Penal, D.130-2017)', GOLDEN),
      decreto: sourced('Decreto 46-2020', GOLDEN),
      articulo: sourced('1', GOLDEN),
      textoExacto: pending('El repositorio no contiene el texto del art. 1 del D.46-2020; solo lo describe (reforma el art. 635 del D.130-2017 y fija la vigencia del 25-jun-2020).'),
      fragmentoIdCanonico: pending(SIN_ID),
      contenidoSha256: pending(SIN_HASH),
      gaceta: sourced('La Gaceta 35,247', GOLDEN),
      fechaGaceta: sourced('9-may-2020 (pág. 2-A; página 2 del PDF)', GOLDEN, 'Fecha y página verificadas por el CLO contra el PDF oficial (VERIFICADO_CLO_PDF_OFICIAL).'),
      urlOficial: pending(SIN_URL),
      pdfSha256: sourced('60b5b7865bdb0b868131005429017632fb168e286a1a9dfa5482378e8f58bbdb', GOLDEN, 'SHA-256 del PDF oficial de La Gaceta 35,247 aportado por el Investigador de Fuentes Oficiales HN y cotejado por el CLO.'),
      estadoV: pending(SIN_V),
      evidenciaVigencia: sourced('Fija el 25-jun-2020 como inicio de vigencia del D.130-2017 (La Gaceta 35,247, 9-may-2020, pág. 2-A).', GOLDEN),
      reformaODerogacion: sourced('Reforma el art. 635 del D.130-2017.', GOLDEN, 'Falta confirmar si el propio D.46-2020 fue reformado o derogado posteriormente.'),
      goldenSetRelacionado: sourced('G1-VIG-CODIGO-PENAL-130-2017', GOLDEN),
      decisionSolicitada:
        'Aportar el texto exacto del art. 1 y confirmar que coincide con La Gaceta 35,247; aportar el id canónico, la URL oficial y el estado V4/V5 y, solo entonces, aprobar o rechazar la entrada con nombre, fecha y enlace al dictamen.',
    },
  },
];
