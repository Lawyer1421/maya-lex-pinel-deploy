import Link from 'next/link';

export default function FooterV2() {
  return (
    <footer className="border-t border-obsidian-medium bg-obsidian px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-lg font-bold text-ivory">MAYA <span className="text-jade">LEX</span></p>
          <p className="mt-2 text-sm text-ivory-muted">
            Inteligencia jurídica hondureña. Abogado Fredy Omar Pinel Flores, Choluteca, Honduras.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ivory-muted">Producto</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/producto" className="text-ivory-dim hover:text-ivory">Producto</Link></li>
            <li><Link href="/herramientas" className="text-ivory-dim hover:text-ivory">Herramientas</Link></li>
            <li><Link href="/cobertura-juridica" className="text-ivory-dim hover:text-ivory">Cobertura jurídica</Link></li>
            <li><Link href="/pricing" className="text-ivory-dim hover:text-ivory">Precios</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ivory-muted">Soluciones</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/soluciones/abogados" className="text-ivory-dim hover:text-ivory">Abogados</Link></li>
            <li><Link href="/soluciones/universidades" className="text-ivory-dim hover:text-ivory">Universidades</Link></li>
            <li><Link href="/soluciones/bufetes" className="text-ivory-dim hover:text-ivory">Bufetes</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ivory-muted">Confianza</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/seguridad" className="text-ivory-dim hover:text-ivory">Seguridad y privacidad</Link></li>
            <li><Link href="/fundador" className="text-ivory-dim hover:text-ivory">El fundador</Link></li>
            <li><Link href="/recursos" className="text-ivory-dim hover:text-ivory">Recursos</Link></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-7xl border-t border-obsidian-medium pt-6 text-xs text-ivory-muted">
        © 2026 MAYA LEX IA PINEL HN · Choluteca, Honduras. Maya Lex es una herramienta de apoyo a la investigación
        jurídica; no sustituye el criterio profesional de un abogado colegiado.
      </p>
    </footer>
  );
}
