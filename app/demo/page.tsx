import type { Metadata } from 'next';
import NavV2 from '@/components/v2/NavV2';
import FooterV2 from '@/components/v2/FooterV2';
import DemoInteractiva from './DemoInteractiva';

export const metadata: Metadata = {
  title: 'Demostración — MAYA LEX IA',
  description: 'Pruebe Maya Lex con un caso ficticio, sin necesidad de registro.',
  robots: { index: false, follow: true },
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-obsidian text-ivory">
      <NavV2 />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="font-serif text-3xl font-bold text-ivory sm:text-4xl">Demostración de Maya Lex</h1>
        <p className="mt-3 text-ivory-dim">
          Sin registro. Sin datos reales. Una muestra del formato de análisis que recibiría un usuario profesional.
        </p>
        <DemoInteractiva />
      </main>
      <FooterV2 />
    </div>
  );
}
