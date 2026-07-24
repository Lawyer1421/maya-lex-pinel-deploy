import type { Metadata, Viewport } from 'next';
import './globals.css';
import Script from 'next/script';

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

const JSON_LD_LEGAL_SERVICE = {
  '@context': 'https://schema.org',
  '@type': 'LegalService',
  name: 'MAYA LEX IA PINEL HN',
  description:
    'Plataforma de inteligencia artificial legal para Honduras. Análisis jurídico, redacción de documentos, derecho civil, penal, notarial y laboral.',
  url: 'https://mayalexhn.com',
  areaServed: { '@type': 'Country', name: 'Honduras' },
  founder: { '@type': 'Person', name: 'Fredy Omar Pinel Flores' },
};

const JSON_LD_SOFTWARE_APP = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'MAYA LEX IA',
  applicationCategory: 'LegalService',
  operatingSystem: 'Web',
  url: 'https://mayalexhn.com',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_LEGAL_SERVICE) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SOFTWARE_APP) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@400;700&display=swap"
          rel="stylesheet"
        /><Script
        src="https://www.googletagmanager.com/gtag/js?id=G-50RFB5FLXB" 
        strategy="afterInteractive" 
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-50RFB5FLXB');
        `}
      </Script>
      </head>
      <body className="min-h-screen bg-navy">{children}</body>
    </html>
  );
}
