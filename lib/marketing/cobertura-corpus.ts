/**
 * Estado público del corpus por CUERPO — no por conteo.
 * Fuente: Decision Log + dictamen CLO/Auditor. Sin COUNT inventados.
 * Promote a biblioteca_vectores: solo CLO + sí del fundador.
 */

export type EstadoCuerpo =
  | 'presente_vigente'
  | 'ausente_cuerpo'
  | 'cuarentena'
  | 'staging_sin_promote';

export interface FilaCoberturaCuerpo {
  cuerpo: string;
  estado: EstadoCuerpo;
  etiqueta: string;
  nota: string;
}

export const ETIQUETA_ESTADO: Record<EstadoCuerpo, string> = {
  presente_vigente: 'Presente / vigente',
  ausente_cuerpo: 'Ausente como cuerpo propio',
  cuarentena: 'Cuarentena editorial',
  staging_sin_promote: 'Staging · sin promote',
};

export const CUERPOS_COBERTURA: readonly FilaCoberturaCuerpo[] = [
  {
    cuerpo: 'Código Penal',
    estado: 'presente_vigente',
    etiqueta: ETIQUETA_ESTADO.presente_vigente,
    nota: 'Mayor cobertura verificada. Artículos de referencia públicos. La revisión editorial continúa.',
  },
  {
    cuerpo: 'Código Procesal Civil',
    estado: 'presente_vigente',
    etiqueta: ETIQUETA_ESTADO.presente_vigente,
    nota: 'Cuerpo incorporado y marcado vigente. Verificación editorial continua.',
  },
  {
    cuerpo: 'Código del Trabajo',
    estado: 'presente_vigente',
    etiqueta: ETIQUETA_ESTADO.presente_vigente,
    nota: 'Marcado vigente (B1 en Decision Log). Verificación editorial continua.',
  },
  {
    cuerpo: 'Constitución de la República (1982)',
    estado: 'ausente_cuerpo',
    etiqueta: ETIQUETA_ESTADO.ausente_cuerpo,
    nota: 'No se anuncia como cubierta. Siguiente cuerpo de L1 (dueño: CLO + fundador).',
  },
  {
    cuerpo: 'Código Civil',
    estado: 'ausente_cuerpo',
    etiqueta: ETIQUETA_ESTADO.ausente_cuerpo,
    nota: 'Sin cuerpo propio. El cubo 02_CIVIL permanece en cuarentena hasta cotejo CLO.',
  },
  {
    cuerpo: 'Código Tributario',
    estado: 'ausente_cuerpo',
    etiqueta: ETIQUETA_ESTADO.ausente_cuerpo,
    nota: 'Sin cuerpo propio en producción. Evidencias parciales no se promueven.',
  },
  {
    cuerpo: 'Código de Familia',
    estado: 'cuarentena',
    etiqueta: ETIQUETA_ESTADO.cuarentena,
    nota: 'Vigencia en cotejo. No se cita como vigente por atajo.',
  },
  {
    cuerpo: 'Documentos doc_*',
    estado: 'cuarentena',
    etiqueta: ETIQUETA_ESTADO.cuarentena,
    nota: 'Fuera del RAG público. No alimentan respuestas compartidas.',
  },
  {
    cuerpo: 'Código de Comercio / mercantil',
    estado: 'staging_sin_promote',
    etiqueta: ETIQUETA_ESTADO.staging_sin_promote,
    nota: 'Staging solamente. Sin promote a biblioteca_vectores sin expediente CLO y sí del fundador.',
  },
];

export const AVISO_FAIL_CLOSED =
  'Maya Lex no inventa artículos de un cuerpo ausente. La búsqueda web no sustituye integrar ese cuerpo. Nadie marca vigencia sin cotejo del fundador y del CLO.';
