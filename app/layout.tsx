import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MAYA LEX IA PINEL HN — Asistente Jurídico Hondureño',
  description:
    'Plataforma de inteligencia artificial legal para Honduras. Análisis jurídico, redacción de documentos, derecho civil, penal, notarial y laboral. Powered by Claude AI.',
  keywords: [
    'abogado Honduras',
    'inteligencia artificial legal',
    'derecho hondureño',
    'MAYA LEX',
    'asistente jurídico IA',
    'Código Procesal Civil Honduras',
    'notario Honduras',
  ],
  authors: [{ name: 'Abogado Fredy Omar Pinel Flores', url: 'https://abogadofredypinelfirmalegal.com' }],
  openGraph: {
    title: 'MAYA LEX IA PINEL HN',
    description: 'Asistente jurídico inteligente para Honduras',
    type: 'website',
    locale: 'es_HN',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0D1B3E',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-navy">{children}</body>
    </html>
  );
}
