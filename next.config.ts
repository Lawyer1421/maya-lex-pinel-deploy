import type { NextConfig } from 'next';
import fs from 'fs';
import path from 'path';
import { ALIAS_REDIRECTS } from './lib/seo/rutas-publicas';

/**
 * Carga manualmente .env.local y lo inyecta en process.env.
 * Workaround para Next.js 16 + Turbopack en rutas OneDrive (Windows).
 */
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      // Saltar comentarios y líneas vacías
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim();
      // Solo setear si no está ya definida (las del sistema tienen prioridad)
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
    console.log('[next.config] .env.local cargado manualmente ✓');
  } catch (e) {
    console.warn('[next.config] No se pudo leer .env.local:', e);
  }
}

// Cargar antes de que Next.js procese el config
loadEnvLocal();

// serverRuntimeConfig fue eliminado en Next.js 15+.
// Las env vars de servidor se leen directamente desde process.env en las API routes.
// La ANTHROPIC_API_KEY se carga vía Windows env var (registrada permanentemente)
// o via loadEnvLocal() arriba para desarrollo local.
const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /demo mostraba un banner de "datos 100% ficticios" que hacía percibir
      // el sitio entero como versión de prueba. El plan gratuito real (3
      // consultas/día, sin registro) ya vive en /chat -- no hace falta una
      // demo separada con datos simulados.
      {
        source: '/demo',
        destination: '/chat',
        permanent: true,
      },
      // Aliases históricos en español: las páginas V2 viven en slugs en
      // inglés (/pricing, /cobertura-juridica). Sin estos 308, /precios,
      // /planes y /cobertura responden 404 (verificado en producción).
      ...ALIAS_REDIRECTS,
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://analytics.tiktok.com https://www.paypal.com https://www.sandbox.paypal.com https://www.paypalobjects.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://*.paypal.com https://connect.facebook.net https://analytics.tiktok.com https://router.huggingface.co https://api.anthropic.com",
              "img-src 'self' data: blob: https:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "frame-src https://www.paypal.com https://www.sandbox.paypal.com https://accounts.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com https://www.paypal.com https://www.sandbox.paypal.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
