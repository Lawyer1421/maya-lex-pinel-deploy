/**
 * G5-A — informe OFFLINE del piloto de manifiesto de procedencia. Solo lectura: no escribe archivos ni toca la red.
 * Uso: npx tsx scripts/g5-manifiesto-piloto.ts
 */
import { CANDIDATOS_PILOTO } from '../lib/ai-gateway/canary/pilot-candidates';
import { informePiloto } from '../lib/ai-gateway/canary/pilot-manifest';

console.log(informePiloto(CANDIDATOS_PILOTO));
