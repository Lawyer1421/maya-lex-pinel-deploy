import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import { buildUserIdentifierFromEmail } from '@/lib/rate-limit';
import { resolveExequaturAccess } from '@/lib/exequatur/access';
import OfertaExequatur from '@/components/v2/exequatur/OfertaExequatur';

/**
 * app/exequatur/(protegido)/layout.tsx — puerta server-side de la vertical
 * Exequátur (Slice 1, reubicada a un route group).
 *
 * El route group (protegido) NO cambia ninguna URL -- /exequatur,
 * /exequatur/plan, /exequatur/modulos y /exequatur/diagnostico (el
 * diagnóstico real, persistido) siguen exactamente igual. Lo que cambia es
 * que app/exequatur/diagnostico-demo (fuera de este grupo) ya NO hereda
 * este gate: es la demo pública sin sesión ni suscripción.
 *
 * Reutiliza EXACTAMENTE la misma autoridad de sesión que /chat y /cuenta
 * (createSupabaseServerClient().auth.getUser()) -- sin login propio, sin
 * checkout propio, sin segundo sistema de identidad.
 *
 * Sin sesión O con sesión pero sin exequatur.access (tier no elegible, o
 * flag_exq_enabled apagado/no disponible): en vez de redirigir a /login se
 * renderiza la Landing de oferta (OfertaExequatur) directamente dentro de
 * /exequatur -- el visitante ve la propuesta de valor (autoridad
 * institucional, ejes formativos, precio, demo gratuita) antes de que se le
 * pida iniciar sesión o pagar. El login real sigue disponible desde ahí
 * (CTA de suscripción) o desde la navegación general del sitio.
 *
 * Modo demo local (SOLO development, nunca producción): si faltan las
 * variables de Supabase o `auth.getUser()` falla (Supabase inalcanzable),
 * en vez de tronar con un error 500 se renderiza /exequatur con una sesión
 * invitada y acceso concedido -- para poder auditar el formulario y el
 * diseño del módulo sin depender de credenciales reales. Doble gate:
 * NODE_ENV !== 'production' Y (faltan credenciales O la llamada falla). En
 * producción cualquier fallo de Supabase se re-lanza sin cambios (mismo
 * comportamiento de antes de este parche), y el fail-closed real de
 * lib/exequatur/access.ts (tier + flag) no se toca en absoluto.
 */
const ES_PRODUCCION = process.env.NODE_ENV === 'production';

function tieneCredencialesSupabase() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function BannerDemoLocal({ motivo }: { motivo: string }) {
  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-300">
      Modo demo local — {motivo} Sesión invitada, sin persistencia real. Esta franja y el acceso de invitado nunca
      aparecen en producción.
    </div>
  );
}

export default async function ExequaturProtegidoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!ES_PRODUCCION && !tieneCredencialesSupabase()) {
    return (
      <>
        <BannerDemoLocal motivo="Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en este entorno." />
        {children}
      </>
    );
  }

  let user: User | null;
  try {
    const supabaseAuth = await createSupabaseServerClient();
    ({ data: { user } } = await supabaseAuth.auth.getUser());
  } catch (error) {
    if (ES_PRODUCCION) throw error;
    console.warn('[exequatur/layout] Supabase no disponible en local -- modo demo activado.', error);
    return (
      <>
        <BannerDemoLocal motivo="No se pudo conectar con Supabase." />
        {children}
      </>
    );
  }

  if (!user) {
    return <OfertaExequatur eligibleTier={false} />;
  }

  const userIdentifier = buildUserIdentifierFromEmail(user.email ?? '');
  const access = await resolveExequaturAccess(userIdentifier, user.email);

  if (!access.granted) {
    return <OfertaExequatur eligibleTier={access.eligibleTier} />;
  }

  return <>{children}</>;
}
