/**
 * lib/ai-gateway/shadow/public-provenance-manifest.ts
 * G4-A: manifiesto de procedencia pública APROBADA. Se entrega VACÍO a propósito.
 *
 * Cada entrada solo puede añadirse con aprobación humana documentada (CLO), tras verificar el artículo contra el
 * PDF oficial (Gaceta). Mientras esté vacío, ningún fragmento tiene prueba fuerte de procedencia pública y el
 * gateway no envía nada fuera (fail-closed). Ver docs/governance/g4a-procedencia-publica.md.
 */
import type { EntradaProcedencia } from './public-provenance';

export const MANIFIESTO_PROCEDENCIA_PUBLICA: readonly EntradaProcedencia[] = [];
