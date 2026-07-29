/**
 * Casos 100% ficticios para /demo. Ningún dato aquí proviene de un
 * expediente real, cliente real, ni del corpus de biblioteca_vectores —
 * esta demo nunca se conecta a Supabase ni a lib/rag/search.ts.
 */
export interface CasoDemo {
  id: string;
  etiqueta: string;
  pregunta: string;
  materia: string;
  cuestionJuridica: string;
  analisisBreve: string;
  accionSugerida: string;
  riesgo: string;
  fuenteDemostrativa: string;
  estadoVerificacion: 'V3' | 'V4';
}

export const CASOS_DEMO: CasoDemo[] = [
  {
    id: 'contrato-arrendamiento',
    etiqueta: 'Incumplimiento de contrato de arrendamiento',
    pregunta: '¿Puede el arrendador rescindir un contrato de arrendamiento comercial ficticio por falta de pago de dos meses?',
    materia: 'Civil — Contratos de arrendamiento',
    cuestionJuridica: 'Procedencia de la rescisión contractual por incumplimiento reiterado de la obligación de pago.',
    analisisBreve:
      'En este caso ilustrativo, el atraso de dos mensualidades consecutivas suele configurar incumplimiento grave '
      + 'suficiente para fundar la rescisión, siempre que el contrato original establezca ese umbral o la ley general '
      + 'de obligaciones lo respalde. Se recomienda verificar la cláusula penal pactada antes de actuar.',
    accionSugerida: 'Notificar formalmente al arrendatario y otorgar un plazo de subsanación antes de iniciar la acción de rescisión.',
    riesgo: 'Si no se notifica con el plazo mínimo exigido, la rescisión podría declararse improcedente por defecto de forma.',
    fuenteDemostrativa: 'Código Civil (ilustrativo) — Art. 45 sobre resolución de contratos bilaterales',
    estadoVerificacion: 'V3',
  },
  {
    id: 'plazo-recurso-penal',
    etiqueta: 'Plazo para recurso de apelación penal',
    pregunta: '¿Cuál es el plazo ficticio aplicable para apelar una sentencia condenatoria en un proceso penal ordinario?',
    materia: 'Penal — Recursos procesales',
    cuestionJuridica: 'Cómputo del plazo para interponer recurso de apelación tras la notificación de sentencia.',
    analisisBreve:
      'De forma ilustrativa, el plazo suele computarse en días hábiles a partir de la notificación formal, no de la '
      + 'fecha de la audiencia. Es un error común confundir ambas fechas, lo que puede llevar a presentar el recurso '
      + 'fuera de tiempo.',
    accionSugerida: 'Confirmar la fecha exacta de notificación en el expediente antes de calcular el vencimiento del plazo.',
    riesgo: 'Un cómputo erróneo del plazo puede resultar en la pérdida definitiva del derecho a recurrir.',
    fuenteDemostrativa: 'Código Procesal Penal (ilustrativo) — Art. 173 sobre plazos de impugnación',
    estadoVerificacion: 'V4',
  },
];
