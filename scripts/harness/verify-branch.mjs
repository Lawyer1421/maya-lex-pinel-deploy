// Gate: prohibe operar con main como rama actual.
import { execSync } from 'node:child_process';
const rama = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
if (rama === 'main' || rama === 'master') {
  console.error('X Rama actual: ' + rama + '. El harness prohibe trabajar directamente sobre main.');
  process.exit(1);
}
console.log('OK Rama de trabajo: ' + rama);
