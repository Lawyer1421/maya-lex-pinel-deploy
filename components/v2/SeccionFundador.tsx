import Link from 'next/link';

const CREDENCIALES = [
  { cifra: '34+', etiqueta: 'años de ejercicio activo como Abogado y Notario Público' },
  { cifra: '24+', etiqueta: 'años como docente e investigador en la UNAH' },
];

export default function SeccionFundador() {
  return (
    <section aria-labelledby="fundador-titulo" className="bg-obsidian-light/40 px-4 py-16 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-gold/10 font-serif text-xl font-bold text-gold-light">
          FP
        </div>
        <div>
          <span className="mode-badge border-gold/30 bg-gold/10 text-gold-light">Autoridad y respaldo académico</span>
          <h2 id="fundador-titulo" className="mt-4 font-serif text-2xl font-bold text-ivory sm:text-3xl">
            Concebida, estructurada y supervisada por un jurista, no por un equipo ajeno al derecho hondureño
          </h2>
        </div>
        <p className="max-w-2xl text-ivory-dim">
          Maya Lex nace del ejercicio profesional real de Fredy Omar Pinel Flores, Abogado y Notario Público en
          Choluteca, Honduras — no de una idea genérica de "chatbot legal". Cada herramienta responde a una
          necesidad concreta del ejercicio diario del derecho hondureño, con el mismo rigor dogmático que exige la
          cátedra universitaria.
        </p>
        <div className="grid w-full max-w-lg grid-cols-2 gap-4">
          {CREDENCIALES.map((c) => (
            <div key={c.etiqueta} className="rounded-2xl border border-obsidian-medium bg-obsidian p-5">
              <p className="font-serif text-3xl font-bold text-gold-light">{c.cifra}</p>
              <p className="mt-1 text-xs text-ivory-muted">{c.etiqueta}</p>
            </div>
          ))}
        </div>
        <Link href="/fundador" className="text-sm font-semibold text-jade-light hover:underline focus-visible:ring-2 focus-visible:ring-jade rounded">
          Conocer la historia →
        </Link>
      </div>
    </section>
  );
}
