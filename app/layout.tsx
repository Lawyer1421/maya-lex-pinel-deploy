import type { Metadata, Viewport } from 'next';
import './globals.css';
import Script from 'next/script';
import CampaignPixels from '@/components/marketing/CampaignPixels';
import WhatsAppFlotante from '@/components/marketing/WhatsAppFlotante';
import { faqPageJsonLd } from '@/lib/marketing/faq';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mayalexhn.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL.startsWith('http') ? SITE_URL : 'https://mayalexhn.com'),
  title: {
    default: 'MAYA LEX IA — Inteligencia jurídica hondureña',
    template: '%s — MAYA LEX IA',
  },
  description:
    'Plataforma de inteligencia jurídica para Honduras. Consulte normas, analice documentos y genere borradores con estado de verificación visible. No sustituye a un abogado colegiado.',
  keywords: [
    'abogado Honduras',
    'inteligencia jurídica hondureña',
    'derecho hondureño',
    'MAYA LEX',
    'asistente jurídico',
    'Código Procesal Civil Honduras',
    'notario Honduras',
  ],
  authors: [{ name: 'Abogado Fredy Omar Pinel Flores', url: 'https://abogadofredypinelfirmalegal.com' }],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'MAYA LEX IA — Inteligencia jurídica hondureña',
    description: 'Investigue, cite y actúe con el derecho hondureño. 3 consultas gratis, sin tarjeta.',
    type: 'website',
    locale: 'es_HN',
    url: SITE_URL,
    siteName: 'MAYA LEX IA',
    images: [
      {
        url: '/og/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MAYA LEX — Inteligencia jurídica hondureña',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MAYA LEX IA — Inteligencia jurídica hondureña',
    description: 'Investigue, cite y actúe con el derecho hondureño.',
    images: ['/og/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
  },
  robots: {
    index: true,
    follow: true,
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
  name: 'MAYA LEX IA',
  description:
    'Plataforma de inteligencia jurídica para Honduras. Análisis, documentos y derecho hondureño. No constituye asesoría legal.',
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
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Plan Explorar: 3 consultas diarias sin tarjeta',
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd('https://mayalexhn.com')) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Merriweather:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <Script
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
        <CampaignPixels />
      </head>
      <body className="min-h-screen bg-navy">
        {children}
        <WhatsAppFlotante />
      </body>
    </html>
  );
}
