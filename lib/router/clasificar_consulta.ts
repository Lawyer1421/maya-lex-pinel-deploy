/**
 * Clasificador de consultas — Enrutador Inteligente Maya Lex
 *
 * RUTA_A — Solo procedimental : plazos, recursos, fases del proceso
 * RUTA_B — Solo normativo     : texto de artículos, decreto, código
 * RUTA_C — Combinado          : análisis que requiere norma + procedimiento
 * RUTA_D — Sin RAG            : saludo, consulta ambigua → aclaración inmediata
 */

import type { RutaRAG } from '@/config/openrouter_config';

// Modos de "sala" (real-time < 150 palabras, sin RAG)
const MODOS_SALA = ['sala_ia', 'sala_penal'];

const RE_PROCEDIMENTAL = /\b(plazo[s]?|t[eé]rmino[s]?|recurso de|interponer|apelaci[oó]n|casaci[oó]n|reposici[oó]n|queja|procedimiento|fase|etapa|audiencia|d[ií]as h[aá]biles|notificaci[oó]n|vencimiento|prescripci[oó]n|caducidad|tramit[ae]|proceso|instancia|ejecutoria|calend[a]|c[oó]mputo)\b/i;

const RE_NORMATIVO = /\b(art[ií]culo\s+\d+|art\.\s*\d+|decreto\s+[\d-]+|cpc|cpp|c[oó]digo\s+(civil|procesal|penal)|texto\s+del\s+art|qu[eé]\s+dice\s+el\s+art|literal\s+del\s+art|norma|ley especial|reglamento)\b/i;

const RE_ACLARACION = /^(hola|buenos\s|buenas\s|gracias|ok\b|bien\b|entendido|cl[aá]ro|ayuda|help|start|inicio|empez|comenz|\?+)\s*[.!]?\s*$/i;

export function clasificarConsulta(query: string, mode: string): RutaRAG {
  // Modos sala → sin RAG (máxima velocidad, respuesta directa del LLM)
  if (MODOS_SALA.includes(mode)) return 'D';

  const q = query.trim();

  // Consulta muy corta o saludo → pedir aclaración
  if (q.length < 15 || RE_ACLARACION.test(q)) return 'D';

  const tieneProcedimental = RE_PROCEDIMENTAL.test(q);
  const tieneNormativo     = RE_NORMATIVO.test(q);

  if (tieneProcedimental && tieneNormativo) return 'C';
  if (tieneProcedimental)                  return 'A';
  if (tieneNormativo)                      return 'B';

  // Modos de análisis completo sin marcadores explícitos → combinado
  const MODOS_ANALISIS = ['analisis', 'analisis_penal', 'documento', 'escritos_penales'];
  if (MODOS_ANALISIS.includes(mode)) return 'C';

  // Consulta general sin clasificación clara → procedimental (más frecuente)
  return 'A';
}

/**
 * Mensaje de aclaración para RUTA_D (consulta ambigua en modo análisis).
 * Se envía como stream SSE inmediato sin llamar al LLM ni al RAG.
 */
export const MENSAJE_ACLARACION = `Hola, soy **Maya Lex IA Pinel HN**. Para darte la respuesta más precisa posible, necesito que me indiques:

1. **¿Cuál es tu consulta jurídica?** (descríbela con el mayor detalle posible)
2. **¿Qué área del derecho aplica?**
   - Civil / Procesal Civil (CPC D.211-2006)
   - Penal / Procesal Penal (CP D.130-2017 / CPP D.9-99-E)
   - Notarial / Registral
   - Laboral (CT Honduras)
   - Internacional / Inversión extranjera
3. **¿Tienes hechos o documentos específicos** que quieras analizar?

Con esa información activo el módulo jurídico correcto y te respondo con fundamento en el derecho hondureño vigente.`;
