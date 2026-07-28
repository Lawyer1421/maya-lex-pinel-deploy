'use client';

import { useState } from 'react';
import Link from 'next/link';

const SOLUCIONES = [
  { href: '/soluciones/abogados', label: 'Abogados' },
  { href: '/soluciones/notarios', label: 'Notarios' },
  { href: '/soluciones/estudiantes', label: 'Estudiantes' },
  { href: '/soluciones/docentes', label: 'Docentes' },
  { href: '/soluciones/bufetes', label: 'Bufetes' },
  { href: '/soluciones/universidades', label: 'Universidades' },
];

export default function NavV2() {
  const [abierto, setAbierto] = useState(false);
  const [menuMovil, setMenuMovil] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-obsidian-medium bg-obsidian/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6" aria-label="Navegación principal">
        <Link href="/" className="font-serif text-xl font-bold text-ivory">
          MAYA <span className="text-jade">LEX</span>
        </Link>

        {/* Escritorio */}
        <div className="hidden items-center gap-6 lg:flex">
          <Link href="/producto" className="text-sm text-ivory-dim transition-colors hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian rounded">
            Producto
          </Link>

          <div className="relative" onMouseEnter={() => setAbierto(true)} onMouseLeave={() => setAbierto(false)}>
            <button
              type="button"
              className="text-sm text-ivory-dim transition-colors hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian rounded"
              aria-expanded={abierto}
              aria-haspopup="menu"
            >
              Soluciones
            </button>
            {abierto && (
              <div role="menu" className="absolute left-0 top-full w-56 rounded-xl border border-obsidian-medium bg-obsidian-light p-2 shadow-2xl">
                {SOLUCIONES.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    role="menuitem"
                    className="block rounded-lg px-3 py-2 text-sm text-ivory-dim hover:bg-obsidian-medium hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/herramientas" className="text-sm text-ivory-dim transition-colors hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian rounded">
            Herramientas
          </Link>
          <Link href="/cobertura-juridica" className="text-sm text-ivory-dim transition-colors hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian rounded">
            Cobertura jurídica
          </Link>
          <Link href="/pricing" className="text-sm text-ivory-dim transition-colors hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian rounded">
            Precios
          </Link>
          <Link href="/seguridad" className="text-sm text-ivory-dim transition-colors hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian rounded">
            Seguridad
          </Link>
          <Link href="/recursos" className="text-sm text-ivory-dim transition-colors hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian rounded">
            Recursos
          </Link>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className="text-sm font-medium text-ivory-dim hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade rounded px-2 py-1">
            Iniciar sesión
          </Link>
          <Link
            href="/demo"
            className="rounded-xl bg-jade px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-jade/20 transition hover:bg-jade-light focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian"
          >
            Probar gratis
          </Link>
        </div>

        {/* Botón móvil */}
        <button
          type="button"
          className="rounded-lg p-2 text-ivory lg:hidden focus-visible:ring-2 focus-visible:ring-jade"
          aria-label={menuMovil ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuMovil}
          onClick={() => setMenuMovil((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            {menuMovil ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            )}
          </svg>
        </button>
      </nav>

      {/* Menú móvil */}
      {menuMovil && (
        <div className="border-t border-obsidian-medium bg-obsidian px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            <Link href="/producto" className="rounded-lg px-3 py-2 text-sm text-ivory-dim hover:bg-obsidian-medium hover:text-ivory">Producto</Link>
            {SOLUCIONES.map((s) => (
              <Link key={s.href} href={s.href} className="rounded-lg px-3 py-2 pl-6 text-sm text-ivory-dim hover:bg-obsidian-medium hover:text-ivory">{s.label}</Link>
            ))}
            <Link href="/herramientas" className="rounded-lg px-3 py-2 text-sm text-ivory-dim hover:bg-obsidian-medium hover:text-ivory">Herramientas</Link>
            <Link href="/cobertura-juridica" className="rounded-lg px-3 py-2 text-sm text-ivory-dim hover:bg-obsidian-medium hover:text-ivory">Cobertura jurídica</Link>
            <Link href="/pricing" className="rounded-lg px-3 py-2 text-sm text-ivory-dim hover:bg-obsidian-medium hover:text-ivory">Precios</Link>
            <Link href="/seguridad" className="rounded-lg px-3 py-2 text-sm text-ivory-dim hover:bg-obsidian-medium hover:text-ivory">Seguridad</Link>
            <Link href="/recursos" className="rounded-lg px-3 py-2 text-sm text-ivory-dim hover:bg-obsidian-medium hover:text-ivory">Recursos</Link>
            <div className="mt-3 flex flex-col gap-2 border-t border-obsidian-medium pt-3">
              <Link href="/login" className="rounded-lg px-3 py-2 text-center text-sm text-ivory-dim hover:text-ivory">Iniciar sesión</Link>
              <Link href="/demo" className="rounded-xl bg-jade px-4 py-2 text-center text-sm font-semibold text-white">Probar gratis</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
