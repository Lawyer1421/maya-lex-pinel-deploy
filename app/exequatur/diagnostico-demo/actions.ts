'use server';

import { redirect } from 'next/navigation';
import { parsearRespuestas, evaluarDiagnostico } from '@/lib/exequatur/diagnostico/evaluar';

/**
 * app/exequatur/diagnostico-demo/actions.ts — Diagnóstico de Colocación DEMO.
 *
 * Pública a propósito (CTA "prueba de valor" de OfertaExequatur, sin sesión
 * ni suscripción). Evalúa en memoria con el mismo banco/evaluador que el
 * diagnóstico real (lib/exequatur/diagnostico/evaluar.ts) pero SIN llamar a
 * resolverSesionExequatur() ni escribir en
 * exequatur_diagnostico_intentos/progreso -- esas tablas son exclusivas del
 * diagnóstico persistido para usuarios con acceso ya concedido
 * (app/exequatur/(protegido)/diagnostico). El puntaje va en la URL de
 * vuelta (aciertos/total, sin PII) solo para renderizar el resultado.
 */
export async function evaluarDiagnosticoDemo(formData: FormData): Promise<void> {
  const respuestas = parsearRespuestas(formData);
  const resultado = evaluarDiagnostico(respuestas);
  redirect(`/exequatur/diagnostico-demo?aciertos=${resultado.aciertos.length}&total=${resultado.total}`);
}
