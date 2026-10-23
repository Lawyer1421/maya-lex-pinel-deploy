/** G5-G — simulación offline de costo y latencia. No abre red. Uso: npx tsx scripts/g5-cost-latency.ts */
import { textoCostoLatencia } from '../lib/ai-gateway/canary/cost-latency-sim';

console.log(textoCostoLatencia());
