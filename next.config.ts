import type { NextConfig } from 'next';
import fs from 'fs';
import path from 'path';

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
const nextConfig: NextConfig = {};

export default nextConfig;
