import Link from 'next/link';

export default function TeaserCTA({ mensaje }: { mensaje: string }) {
  return (
    <div className="glass-card p-6 text-center border border-jade/30">
      <p className="text-white/70 text-sm mb-4">{mensaje}</p>
      <Link href="/login" className="inline-block btn-jade px-6 py-3 text-sm font-semibold">
        Iniciar sesión con MAYA LEX IA →
      </Link>
      <p className="text-white/30 text-xs mt-3">Gratis para empezar · Sin tarjeta de crédito</p>
    </div>
  );
}
