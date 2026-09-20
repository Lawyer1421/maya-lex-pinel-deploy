import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import { buildUserIdentifierFromEmail } from '@/lib/rate-limit';
import { resolveExequaturAccess } from '@/lib/exequatur/access';

/**
 * app/exequatur/layout.tsx — puerta server-side de la vertical Exequátur
 * (Slice 1).
 *
 * Reutiliza EXACTAMENTE la misma autoridad de sesión que /chat y /cuenta
 * (createSupabaseServerClient().auth.getUser()) -- sin login propio, sin
 * checkout propio, sin segundo sistema de identidad.
 *
 * Sin sesión: mismo patrón que /chat -- redirect a una ruta fija
 * ('/login?next=/exequatur'), nunca a un valor derivado de input del
 * cliente (sin riesgo de open redirect).
 *
 * Con sesión pero sin exequatur.access (tier no elegible, o
 * flag_exq_enabled apagado/no disponible): NO se redirige a ninguna
 * página ajena a esta ruta -- se sustituye {children} por un estado
 * mínimo de "todavía no disponible" dentro de /exequatur mismo. Esto
 * evita inventar un destino de redirect nuevo (fuera del alcance de esta
 * slice) y garantiza que el contenido real de Exequátur (page.tsx y
 * cualquier ruta hija futura) nunca se expone antes de autorizar.
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

export default async function ExequaturLayout({
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
    redirect('/login?next=/exequatur');
  }

  const userIdentifier = buildUserIdentifierFromEmail(user.email ?? '');
  const access = await resolveExequaturAccess(userIdentifier, user.email);

  if (!access.granted) {
    return (
      <main className="min-h-screen bg-navy pt-12 pb-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-serif text-2xl font-bold text-gradient-maya mb-4">Exequátur</h1>
          <p className="text-white/70">
            {access.eligibleTier
              ? 'Exequátur está activándose por grupos para el plan Premium. Tu plan ya califica -- vuelve pronto.'
              : 'Exequátur es una función del plan Premium. Actualiza tu plan para acceder cuando esté disponible.'}
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
