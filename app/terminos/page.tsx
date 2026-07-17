import Link from 'next/link';

export const metadata = { title: 'Términos de uso — MAYA LEX IA PINEL HN' };

/**
 * Placeholder estructural — el texto legal real de los términos de uso
 * debe ser redactado y aprobado por Don Fredy (abogado/notario, dueño
 * del producto) antes del lanzamiento público. No se genera contenido
 * legal sustantivo aquí.
 */
export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-navy px-4 py-16">
      <div className="max-w-2xl mx-auto glass-card p-8">
        <h1 className="font-serif text-2xl font-bold text-gradient-maya mb-4">Términos de uso</h1>
        <p className="text-white/60 text-sm leading-relaxed">
          Este texto es un marcador de posición. El contenido legal definitivo de los
          términos de uso de MAYA LEX IA PINEL HN debe ser redactado y aprobado antes
          del lanzamiento público.
        </p>
        <Link href="/" className="text-jade text-sm hover:underline mt-6 inline-block">Volver al inicio</Link>
      </div>
    </main>
  );
}
