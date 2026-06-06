import type { Metadata } from 'next';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import { createServerSupabaseClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Mi Cuenta — MAYA LEX IA PINEL HN',
};

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string }>;
}) {
  const params = await searchParams;
  const pagoExitoso = params.pago === 'exitoso';

  // ── Verificar sesión ──────────────────────────────────────────────────────
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // ── Obtener datos de suscripción ──────────────────────────────────────────
  const supabase = createServerSupabaseClient();
  const userIdentifier = `email:${user.email}`;

  const { data: suscripcion } = await supabase
    .from('subscriptions')
    .select('tier, status, current_period_end, stripe_sub_id')
    .eq('user_identifier', userIdentifier)
    .single();

  const { data: usage } = await supabase
    .from('queries_log')
    .select('query_count, tier')
    .eq('user_identifier', userIdentifier)
    .eq('query_date', new Date().toISOString().split('T')[0])
    .single();

  const tier = suscripcion?.tier ?? usage?.tier ?? 'free';
  const esPro = tier === 'pro';
  const esAcademico = tier === 'academico';
  const periodoFin = suscripcion?.current_period_end
    ? new Date(suscripcion.current_period_end).toLocaleDateString('es-HN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  const consultasHoy = usage?.query_count ?? 0;
  const limiteHoy = tier === 'pro' ? '∞' : tier === 'academico' ? '20' : '3';

  return (
    <main className="min-h-screen bg-navy pt-12 pb-20 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link href="/chat" className="text-white/40 hover:text-white/60 text-sm flex items-center gap-1.5 mb-6">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al chat
          </Link>
          <h1 className="font-serif text-3xl font-bold text-gradient-maya">Mi Cuenta</h1>
          <p className="text-white/50 text-sm mt-1">{user.email}</p>
        </div>

        {/* Aviso de pago exitoso */}
        {pagoExitoso && (
          <div className="glass-card border-jade/40 p-4 mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-jade flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-jade font-semibold text-sm">¡Pago exitoso!</p>
              <p className="text-white/60 text-xs">Su plan ha sido activado. Disfrute las consultas ilimitadas.</p>
            </div>
          </div>
        )}

        {/* Estado de suscripción */}
        <div className="glass-card p-6 mb-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Plan activo</p>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-bold text-white capitalize">{tier}</h2>
                {esPro && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-maya text-white">PRO</span>
                )}
                {esAcademico && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">ACADÉMICO</span>
                )}
              </div>
            </div>
            {!esPro && (
              <Link href="/pricing" className="btn-jade text-xs py-2 px-4">
                Actualizar al Pro →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
            <div>
              <p className="text-white/40 text-xs mb-1">Consultas hoy</p>
              <p className="text-white font-semibold">{consultasHoy} / {limiteHoy}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs mb-1">Estado</p>
              <p className={`font-semibold text-sm ${suscripcion?.status === 'past_due' ? 'text-red-400' : 'text-jade'}`}>
                {suscripcion?.status === 'active' ? 'Activo' :
                 suscripcion?.status === 'past_due' ? 'Pago pendiente' :
                 suscripcion?.status === 'cancelled' ? 'Cancelado' : 'Gratuito'}
              </p>
            </div>
            {periodoFin && (
              <div>
                <p className="text-white/40 text-xs mb-1">Renueva</p>
                <p className="text-white/70 text-sm">{periodoFin}</p>
              </div>
            )}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Link href="/chat?mode=analisis_penal" className="glass-card-hover p-4 text-center">
            <div className="text-2xl mb-1">⚖️</div>
            <p className="text-white/70 text-xs">MAYA PENAL</p>
          </Link>
          <Link href="/chat?mode=analisis" className="glass-card-hover p-4 text-center">
            <div className="text-2xl mb-1">📜</div>
            <p className="text-white/70 text-xs">MAYA LEX Civil</p>
          </Link>
        </div>

        {/* Gestionar suscripción / Cerrar sesión */}
        <div className="glass-card p-5 space-y-3">
          {(esPro || esAcademico) && suscripcion?.stripe_sub_id && (
            <a
              href="https://billing.stripe.com/p/login/test_placeholder"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full btn-ghost text-sm text-center block"
            >
              Gestionar suscripción (Stripe Portal)
            </a>
          )}
          <form action="/auth/signout" method="POST">
            <button
              formAction="/api/auth/signout"
              className="w-full text-white/40 hover:text-white/70 text-sm transition-colors py-2"
            >
              Cerrar sesión
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-8">
          ¿Preguntas? <a href="mailto:contacto@abogadofredypinelfirmalegal.com" className="text-jade/50 hover:text-jade transition-colors">contacto@abogadofredypinelfirmalegal.com</a>
        </p>
      </div>
    </main>
  );
}
