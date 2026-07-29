import Link from 'next/link';

/* Área táctil móvil: cada enlace del footer es block con py-3 (20px de línea +
 * 24px de padding = 44px CSS, mínimo recomendado). En ≥sm se vuelve al layout
 * compacto original (py-0 + space-y-2) — la apariencia desktop no cambia. */
const enlaceFooter = 'block py-3 sm:py-0 text-ivory-dim hover:text-ivory';
const listaFooter = 'mt-1 sm:mt-3 sm:space-y-2 text-sm';

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
          <ul className={listaFooter}>
            <li><Link href="/producto" className={enlaceFooter}>Producto</Link></li>
            <li><Link href="/herramientas" className={enlaceFooter}>Herramientas</Link></li>
            <li><Link href="/cobertura-juridica" className={enlaceFooter}>Cobertura jurídica</Link></li>
            <li><Link href="/pricing" className={enlaceFooter}>Precios</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ivory-muted">Soluciones</p>
          <ul className={listaFooter}>
            <li><Link href="/soluciones/abogados" className={enlaceFooter}>Abogados</Link></li>
            <li><Link href="/soluciones/universidades" className={enlaceFooter}>Universidades</Link></li>
            <li><Link href="/soluciones/bufetes" className={enlaceFooter}>Bufetes</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ivory-muted">Confianza</p>
          <ul className={listaFooter}>
            <li><Link href="/seguridad" className={enlaceFooter}>Seguridad y privacidad</Link></li>
            <li><Link href="/fundador" className={enlaceFooter}>El fundador</Link></li>
            <li><Link href="/recursos" className={enlaceFooter}>Recursos</Link></li>
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
