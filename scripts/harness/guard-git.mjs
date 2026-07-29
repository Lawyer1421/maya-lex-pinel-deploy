// Hook determinista PreToolUse(Bash) del Maya Lex Delivery Harness.
// Lee la invocacion por stdin (JSON) y BLOQUEA (exit 2) comandos prohibidos.
// Nunca imprime valores de variables ni secretos - solo la regla violada.
import fs from 'node:fs';

let input = '';
try { input = fs.readFileSync(0, 'utf8'); } catch { process.exit(0); }
let cmd = '';
try { cmd = (JSON.parse(input).tool_input?.command ?? '').toString(); } catch { process.exit(0); }

const REGLAS = [
  { re: /git\s+push[^\n]*(--force|-f\b|--force-with-lease)/, msg: 'BLOQUEADO: push forzado prohibido por el harness.' },
  { re: /git\s+push\s+origin\s+main\b/, msg: 'BLOQUEADO: push directo a main. Usa el merge controlado (mayalex-production-release) que empuja <rama-temporal>:main tras gates verdes.' },
  { re: /git\s+(branch|push)[^\n]*(-D|--delete)[^\n]*\b(main|master)\b/, msg: 'BLOQUEADO: eliminacion de main.' },
  { re: /git\s+config\s+--global/, msg: 'BLOQUEADO: modificacion de configuracion global de Git.' },
  { re: /\b(DROP|TRUNCATE)\s+(TABLE|DATABASE|SCHEMA)/i, msg: 'BLOQUEADO: operacion destructiva de base de datos (condicion de detencion obligatoria).' },
  { re: /vercel[^\n]*\s(--prod\b|--target[= ]production)/, msg: 'BLOQUEADO: deploy productivo manual con CLI. Produccion solo por merge a main con gates verdes.' },
  { re: /rm\s+-rf\s+["']?\/?c?\/?(Users|Windows|Program)/i, msg: 'BLOQUEADO: borrado fuera del area de trabajo autorizada.' },
];

for (const r of REGLAS) {
  if (r.re.test(cmd)) { console.error(r.msg); process.exit(2); }
}
process.exit(0);
