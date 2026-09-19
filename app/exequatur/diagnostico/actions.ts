'use server';

import { redirect } from 'next/navigation';
import { evaluarDiagnostico, parsearRespuestas } from '@/lib/exequatur/diagnostico/evaluar';

/**
 * POST del formulario de diagnóstico. Solo redirige con IDs de objetivos
 * pendientes ya validados contra el currículo. No persiste, no escribe DB.
 */
export async function enviarDiagnostico(formData: FormData): Promise<void> {
  const resultado = evaluarDiagnostico(parsearRespuestas(formData));
  const params = new URLSearchParams();
  if (resultado.objetivosPendientes.length > 0) {
    params.set('objetivos', resultado.objetivosPendientes.join(','));
  }
  params.set('aciertos', String(resultado.aciertos.length));
  params.set('total', String(resultado.total));
  redirect(`/exequatur/plan?${params.toString()}`);
}
