'use server';

import { redirect } from 'next/navigation';
import { parsearRespuestas } from '@/lib/exequatur/diagnostico/evaluar';
import { guardarIntento, resolverSesionExequatur } from '@/lib/exequatur/diagnostico/persistencia';

/**
 * POST del diagnóstico (Slice 3B).
 * Identidad y autorización se resuelven en servidor. El cliente solo envía
 * item:<id>=opcion. Score, plan y user_id no se leen del form.
 */
export async function enviarDiagnostico(formData: FormData): Promise<void> {
  const sesion = await resolverSesionExequatur();
  if (!sesion) {
    redirect('/login?next=/exequatur/diagnostico');
  }

  const respuestas = parsearRespuestas(formData);
  const guardado = await guardarIntento(sesion, respuestas);
  if (!guardado) {
    redirect('/exequatur/plan');
  }
  redirect(`/exequatur/plan?intento=${guardado.id}`);
}
