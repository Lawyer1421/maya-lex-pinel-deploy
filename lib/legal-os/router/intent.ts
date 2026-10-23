/**
 * lib/legal-os/router/intent.ts
 * Clasificación determinista de la intención: sin LLM. Envuelve la detección de artículo del Exact Resolver existente.
 */
import { detectarArticuloExacto } from '../../legal-retrieval/exact-resolver';
import type { IntentResult, LegalTask, RiskLevel } from '../types';
import { resolverJurisdiccion } from '../jurisdiction/registry';

// Solo verbos/sustantivos de redacción: «contrato de»/«demanda de» por sí solos aparecen en preguntas de investigación.
const RE_REDACTAR = /\b(redacta\w*|redactar|elabora\w*|elaborar|prepara(?:r|me)?\s+(?:un|una|el|la)|borrador|minuta)\b/i;
const RE_DOCUMENTO = /\b(revisa|revisar|analiza este|adjunto|este documento|esta escritura|este contrato)\b/i;
const RE_ANALISIS = /\b(anali[zc]a|compara|diferencia|estrategia|viabilidad|riesgos?|consecuencias|c[oó]mo (?:se )?(?:debe|deber[ií]a)|qu[eé] pasa si)\b/i;
const RE_ALTO_RIESGO = /\b(plazo|prescrip|caducidad|recurso|apelaci[oó]n|casaci[oó]n|detenci[oó]n|prisi[oó]n|delito|demanda|sanci[oó]n|multa|despido|desahucio|embargo)\b/i;
const RE_FUERA_DE_ALCANCE = /\b(receta|f[uú]tbol|clima|horóscopo|horoscopo|chiste)\b/i;

const MATERIAS: ReadonlyArray<[RegExp, string]> = [
  [/\b(penal|delito|cpp|proceso penal)\b/i, 'penal'],
  [/\b(civil|cpc|contrato|obligaci|herencia|sucesi)/i, 'civil'],
  [/\b(trabajo|laboral|despido|salario|prestaciones)\b/i, 'laboral'],
  [/\b(familia|divorcio|pensi[oó]n alimenticia|adopci)/i, 'familia'],
  [/\b(notari|escritura p[uú]blica|protocolo)/i, 'notarial'],
  [/\b(mercantil|comercio|sociedad an[oó]nima|letra de cambio|cheque)\b/i, 'comercial'],
  [/\b(tributari|impuesto|sar\b|isv|renta)/i, 'tributario'],
  [/\b(constituci|amparo|inconstitucional|habeas)/i, 'constitucional'],
  [/\b(administrativ|contencioso)/i, 'administrativo'],
  [/\b(aduana|arancel)/i, 'aduanero'],
  [/\b(lavado de activos|aml|uif)\b/i, 'aml'],
  [/\b(banc|cnbs|financier)/i, 'bancario'],
  [/\b(propiedad|catastro|registro de la propiedad|inmueble)/i, 'propiedad'],
];

export function clasificarIntencion(texto: string): IntentResult {
  const j = resolverJurisdiccion(texto);
  const jurisdiction = j.estado === 'RESUELTA' ? j.jurisdiccion : { country: 'HN' as const, jurisdiction: 'NACIONAL' as const };
  const exacto = detectarArticuloExacto(texto);
  const hasExactReference = exacto !== null;
  const matter = MATERIAS.find(([re]) => re.test(texto))?.[1] ?? exacto?.materiaDetectada ?? null;

  let task: LegalTask;
  if (RE_FUERA_DE_ALCANCE.test(texto) && !matter) task = 'OUT_OF_SCOPE';
  else if (RE_REDACTAR.test(texto)) task = 'DRAFTING';
  else if (RE_DOCUMENTO.test(texto)) task = 'DOCUMENT_REVIEW';
  else if (hasExactReference && !RE_ANALISIS.test(texto)) task = 'EXACT_LOOKUP';
  else if (RE_ANALISIS.test(texto)) task = 'ANALYSIS';
  else task = 'RESEARCH';

  const risk: RiskLevel = RE_ALTO_RIESGO.test(texto) || task === 'DRAFTING' ? 'HIGH' : task === 'ANALYSIS' ? 'MEDIUM' : 'LOW';
  return { task, jurisdiction, matter, risk, hasExactReference, requiresEvidence: task !== 'OUT_OF_SCOPE' };
}
