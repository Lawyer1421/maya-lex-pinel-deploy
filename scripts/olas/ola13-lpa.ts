/**
 * scripts/olas/ola13-lpa.ts
 * OLA 13 · lote 1 — HN:LEY_PROCEDIMIENTO_ADMINISTRATIVO (Decreto No. 152-87, La Gaceta No. 25,391 del 1-dic-1987).
 * Fuente base: edición del CEDIJ (Poder Judicial) «LEY DE PROCEDIMIENTOS ADMINISTRATIVO HONDURAS.pdf» (PDFMaker, 2009), con 5 notas al
 * pie (D.255-2002 y la reforma constitucional del D.268-2002). Reformas posteriores al corte de la edición: el Artículo 2 del Decreto
 * No. 266-2013 (La Gaceta No. 33,336 del 23-ene-2014) da nueva redacción a los arts. 1, 6, 41, 61, 87, 88, 119, 123 y 126; su texto se
 * toma de La Gaceta (extracción por columnas) y sustituye al de la edición. No hay legacy de esta ley en producción.
 * Uso: npx tsx scripts/olas/ola13-lpa.ts [--sin-embeddings]
 */
import type { ConfigOla } from './paquete-ola';
import type { Constancia } from './cedij';
import { emitirOlaCedij, type ParamsCedij } from './cedij';

export const CFG: ConfigOla = {
  ola: 'OLA13', normId: 'HN:LEY_PROCEDIMIENTO_ADMINISTRATIVO', instrumentoId: 'LEY_PROCEDIMIENTO_ADMINISTRATIVO', ingestBatch: 'OLA13_LPA_2014_01',
  fechaCorte: '2026-11-25', adjudicacion: 'EXPEDIENTE_AUDITORIA_LPA_OLA13.md (D1–D8)',
};

const D266: Constancia = {
  nota: null, tipo: 'REFORMA', decretos: ['266-2013'],
  texto: 'Reformado por el Artículo 2 del Decreto No. 266-2013 (Ley para Optimizar la Administración Pública, Mejorar los Servicios a la Ciudadanía y Fortalecimiento de la Transparencia en el Gobierno), publicado en La Gaceta No. 33,336 del 23 de enero de 2014. Texto tomado de La Gaceta; sustituye al de la edición CEDIJ.',
};
const reforma = (texto: string) => ({ texto, constancia: D266 });

/** Nueva redacción del Art. 2 del D.266-2013 (La Gaceta 33,336, extraída por columnas), sin las comillas de apertura y cierre. */
export const REFORMAS_D266: Record<string, { texto: string; constancia: Constancia }> = {
  '1': reforma('Los órganos y entidades de la Administración Pública están sujetos a la presente Ley, cuando declaren, reconozcan o limiten los derechos de los particulares.\n\nLa misma no será aplicable al gobierno electrónico o a los procedimientos que se tramiten electrónicamente, mismos que son normados mediante Decreto Ejecutivo emitido por el Presidente de la República en Consejo de Secretarios de Estado.'),
  '6': reforma('El órgano superior puede avocarse en el conocimiento de asuntos atribuidos por la Ley a la competencia de un órgano inferior.'),
  '41': reforma('Corresponde al Poder Ejecutivo expedir los reglamentos de la Administración Pública, salvo disposición contraria de la Ley.'),
  '61': reforma('Si se iniciara a instancias de persona interesada, en el escrito que ésta presente, se expresará lo siguiente:\n\na) Suma que indique su contenido o el trámite de que se trata;\n\nb) La indicación del órgano al que se dirige;\n\nc) El nombre y apellidos, estado, profesión u oficio, domicilio del solicitante o de su representante, números de teléfono fijo y móvil de contacto, correo electrónico, en cuyo caso deberá presentar el documento que acredite su representación;\n\nch) Los hechos y razones en que se funde y la expresión clara de lo que se solicita;\n\nd) En el caso de Reclamos Administrativos que incluyan pago del daño real efectivamente causado, debe acompañar constancia emitida por la Dirección Ejecutiva de Ingresos (DEI) de encontrarse solvente por las obligaciones tributarias de los últimos cinco (5) años, a la fecha de presentación del reclamo administrativo; y,\n\ne) Lugar, fecha, firma o huella digital cuando no supiere firmar.'),
  '87': reforma('Las resoluciones se notificarán personal o electrónicamente en el plazo máximo de cinco (5) días a partir de su fecha; las providencias cuando perjudiquen a los interesados, en el plazo de dos (2) días.'),
  // La Gaceta no imprime la comilla de cierre de este artículo; el texto termina con la frase transcrita.
  '88': reforma('La notificación personal o electrónica se practicará mediante envío o entrega de copia íntegra del acto de que se trate.\n\nNo habiéndose podido notificar personal o electrónicamente el acto dentro de los plazos establecidos en el Artículo 87, la notificación se hará fijando en la tabla de avisos de Despacho la providencia o parte dispositiva de la resolución.'),
  '119': reforma('La declaración de nulidad de los actos enumerados en el Artículo 34, se hará de oficio y en cualquier momento, por el órgano que dictó el acto o por el superior.'),
  '123': reforma('La anulación, revocación y modificación de un acto solamente dará lugar a la reparación del daño efectivamente causado, cuando la misma esté prevista expresamente en la Ley.'),
  // «conva-lidar» partido con guion al final de renglón en La Gaceta.
  '126': reforma('La Administración puede convalidar los actos anulables subsanando los vicios de que adolezcan, aún cuando se hubiere interpuesto recurso contra los mismos. El acto de convalidación producirá efecto desde su fecha.\n\nSi el vicio consistiera en incompetencia la convalidación puede realizarse por el órgano competente cuando sea superior jerárquico del que dictó el acto.\n\nLos actos viciados por la falta de alguna autorización pueden ser convalidados mediante el otorgamiento de la misma por el órgano competente.'),
};

export const PARAMS: ParamsCedij = {
  cfg: CFG,
  pdf: 'C:/Users/fredy/OneDrive/SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/LEY DE PROCEDIMIENTOS ADMINISTRATIVO HONDURAS.pdf',
  materia: '10_LEYES_REGLAMENTOS', fuenteCanonica: 'Ley de Procedimiento Administrativo de Honduras (Decreto No. 152-87)', decreto: '152-87',
  edicionFuente: 'Edición del CEDIJ (Poder Judicial), «LEY DE PROCEDIMIENTOS ADMINISTRATIVO HONDURAS.pdf», con notas al pie de los D.255-2002 y D.268-2002; arts. 1, 6, 41, 61, 87, 88, 119, 123 y 126 según el D.266-2013 (La Gaceta 33,336).',
  inicio: /^Artículo 1\. Los órganos y entidades de la Administración Pública/m, fin: /^Dado en la ciudad de Tegucigalpa, Municipio del Distrito Central/m,
  ultimoBase: 154, idLegacy: () => null, legacyDump: null,
  reformasPosteriores: REFORMAS_D266,
  // La nota 5 va sangrada después de las firmas y `extraer` no la toma: su llamada «ocho5» quedaría en el texto del art. 154.
  erratas: [{ impreso: 'mil novecientos ochenta y ocho5.', correcto: 'mil novecientos ochenta y ocho.', nota: 5 }],
  dictamenes: {
    '154': {
      clasificacion: { vigencia: 'VIGENTE', rol: null, motivo: 'PRIMARY elegible: edición consolidada CEDIJ; cotejo íntegro con La Gaceta pendiente (D1)' },
      constancia: { nota: 5, tipo: 'REFERENCIA', decretos: ['152-87'], texto: 'Publicado en el Diario Oficial La Gaceta número 25391 de fecha 1 de diciembre de 1987.' },
    },
  },
};
if (process.argv[1]?.endsWith('ola13-lpa.ts')) {
  emitirOlaCedij({ ...PARAMS, salida: 'out/ola13-lpa', expedienteDir: 'docs/corpus/fase2/2026-11-25-hn-lpa-ola13', pliego: 'EXPEDIENTE_AUDITORIA_LPA_OLA13.md',
    sinEmbeddings: process.argv.includes('--sin-embeddings') })
    .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
