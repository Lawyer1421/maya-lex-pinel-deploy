// Gate: escanea el diff staged por patrones de secretos. No imprime el valor
// encontrado - solo archivo y tipo de patron.
import { execSync } from 'node:child_process';
const diff = execSync('git diff --cached --unified=0', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const PATRONES = [
  { nombre: 'JWT', re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/ },
  { nombre: 'clave privada PEM', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { nombre: 'API key sk-/pk_live/AKIA', re: /\b(sk-[A-Za-z0-9]{20,}|pk_live_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/ },
  { nombre: 'URL con credenciales embebidas', re: /https?:\/\/[^\/\s:@]+:[^\/\s:@]+@/ },
  { nombre: 'asignacion literal de secreto', re: /(SERVICE_ROLE_KEY|CLIENT_SECRET|API_KEY|PASSWORD)\s*[=:]\s*["'][A-Za-z0-9+\/_-]{16,}["']/i },
];
const lineas = diff.split('\n');
let archivo = '';
const hallazgos = [];
for (const l of lineas) {
  if (l.startsWith('+++ b/')) { archivo = l.slice(6); continue; }
  if (!l.startsWith('+')) continue;
  for (const p of PATRONES) if (p.re.test(l)) hallazgos.push(archivo + ': ' + p.nombre);
}
if (hallazgos.length) {
  console.error('X POSIBLES SECRETOS EN EL DIFF STAGED (valor no mostrado):');
  for (const h of [...new Set(hallazgos)]) console.error('  - ' + h);
  process.exit(1);
}
console.log('OK Sin patrones de secretos en el diff staged');
