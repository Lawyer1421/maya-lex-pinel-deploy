/** G5-D — imprime el reporte del canary dry-run. Offline: no abre red ni lee credenciales. Uso: npx tsx scripts/g5-dry-run.ts */
import { ejecutarDryRun, textoReporte } from '../lib/ai-gateway/canary/dry-run';

// El temporizador de timeout del dispatcher es `unref`: este mantiene vivo el proceso hasta terminar.
const vivo = setInterval(() => {}, 1000);
ejecutarDryRun().then((r) => console.log(textoReporte(r))).finally(() => clearInterval(vivo));
