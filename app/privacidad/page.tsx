import Link from 'next/link';

export const metadata = { title: 'Política de privacidad — MAYA LEX IA PINEL HN' };

/**
 * Placeholder estructural — el texto legal real de la política de
 * privacidad debe ser redactado y aprobado por Don Fredy antes del
 * lanzamiento público. No se genera contenido legal sustantivo aquí.
 */
export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-navy px-4 py-16">
      <div className="max-w-2xl mx-auto glass-card p-8">
        <h1 className="font-serif text-2xl font-bold text-gradient-maya mb-4">Política de privacidad</h1>
        <p className="text-white/60 text-sm leading-relaxed">
          Este texto es un marcador de posición. El contenido legal definitivo de la
          política de privacidad de MAYA LEX IA PINEL HN debe ser redactado y aprobado
          antes del lanzamiento público.
        </p>
        <Link href="/" className="text-jade text-sm hover:underline mt-6 inline-block">Volver al inicio</Link>
      </div>
    </main>
  );
}
