import Link from 'next/link';

export default function SeccionFundador() {
  return (
    <section aria-labelledby="fundador-titulo" className="bg-obsidian-light/40 px-4 py-16 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-jade/15 font-serif text-xl font-bold text-jade-light">
          FP
        </div>
        <h2 id="fundador-titulo" className="font-serif text-2xl font-bold text-ivory">
          Construido por un abogado, para abogados
        </h2>
        <p className="text-ivory-dim">
          Maya Lex nace del ejercicio profesional real de Fredy Omar Pinel Flores, abogado y notario en Choluteca,
          Honduras — no de una idea genérica de "chatbot legal". Cada herramienta responde a una necesidad concreta
          del ejercicio diario del derecho hondureño.
        </p>
        <Link href="/fundador" className="text-sm font-semibold text-jade-light hover:underline focus-visible:ring-2 focus-visible:ring-jade rounded">
          Conocer la historia →
        </Link>
      </div>
    </section>
  );
}
