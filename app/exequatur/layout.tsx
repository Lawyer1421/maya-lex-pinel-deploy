import { redirect } from 'next/navigation';
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
 */
export default async function ExequaturLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

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
