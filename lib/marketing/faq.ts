export interface PreguntaFaq {
  pregunta: string;
  respuesta: string;
}

export const PREGUNTAS_FAQ_PORTADA: PreguntaFaq[] = [
  {
    pregunta: '¿Qué materias del derecho hondureño cubre Maya Lex?',
    respuesta:
      'Penal y Procesal Civil cuentan con la cobertura más profunda y verificada del corpus. Consulte el estado detallado de cada materia en la página de Cobertura Jurídica.',
  },
  {
    pregunta: '¿Las respuestas de Maya Lex son asesoría legal?',
    respuesta:
      'No. Maya Lex es una herramienta de apoyo a la investigación y el análisis jurídico — no sustituye el criterio de un abogado colegiado ni constituye asesoría legal formal.',
  },
  {
    pregunta: '¿Necesito pagar para probarlo?',
    respuesta:
      'No — cree una cuenta gratuita (sin tarjeta) y use Maya Lex con hasta 3 consultas reales por día.',
  },
  {
    pregunta: '¿Qué pasa con mis suscripciones y datos si cambia el diseño del sitio?',
    respuesta:
      'Nada — cuentas, historial y suscripciones existentes se conservan íntegramente. Los cambios de presentación pública no alteran su acceso.',
  },
  {
    pregunta: '¿Ofrecen planes ilimitados?',
    respuesta:
      'Los planes con uso amplio están sujetos a una política de uso razonable — evitamos prometer "ilimitado" sin un control técnico y económico real detrás.',
  },
  {
    pregunta: '¿Maya Lex se entrena solo con mis consultas o expedientes?',
    respuesta:
      'No. El corpus oficial nunca se autoentrena con chats ni documentos de usuarios. Eso protege el secreto profesional y evita contaminar normas con casos ajenos. La siguiente fase de pago es una biblioteca privada de plantillas de su despacho — nunca se mezcla con el derecho de otros clientes.',
  },
];

export function faqPageJsonLd(baseUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PREGUNTAS_FAQ_PORTADA.map((item) => ({
      '@type': 'Question',
      name: item.pregunta,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.respuesta,
      },
    })),
    url: baseUrl,
  };
}
