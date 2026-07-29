// Verificación postbuild del conteo de rutas estáticas (determinismo del build).
// Falla DURO (exit 1) si el build produjo menos páginas de las esperadas —
// exactamente el modo de fallo silencioso que motivó esta verificación:
// un build que "completa" con 0 páginas /leyes no es un build válido.
// Corre automáticamente vía el script npm "postbuild" (local y Vercel).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.join(raiz, '.next', 'server', 'app');

const manifest = JSON.parse(
  fs.readFileSync(path.join(raiz, 'data', 'corpus-editorial-status.json'), 'utf8')
);
const ESPERADO_ARTICULOS = Object.keys(manifest.articulos).length;

// Páginas públicas V2 cuyo HTML estático debe existir (sin extensión .html).
const PAGINAS_ESTATICAS = [
  'index',
  'demo',
  'pricing',
  'producto',
  'herramientas',
  'cobertura-juridica',
  'seguridad',
  'fundador',
  'recursos',
  'soluciones/abogados',
  'soluciones/notarios',
  'soluciones/estudiantes',
  'soluciones/docentes',
  'soluciones/bufetes',
  'soluciones/universidades',
  'soluciones/empresas',
];

function contarHtml(subdir) {
  const dir = path.join(appDir, subdir);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith('.html')).length;
}

const errores = [];

const leyes = contarHtml('leyes');
const consultas = contarHtml('consultas');
if (leyes !== ESPERADO_ARTICULOS) errores.push(`/leyes: ${leyes} páginas HTML, esperadas ${ESPERADO_ARTICULOS}`);
if (consultas !== ESPERADO_ARTICULOS) errores.push(`/consultas: ${consultas} páginas HTML, esperadas ${ESPERADO_ARTICULOS}`);

for (const p of PAGINAS_ESTATICAS) {
  if (!fs.existsSync(path.join(appDir, `${p}.html`))) errores.push(`falta página estática: /${p === 'index' ? '' : p}`);
}

if (errores.length > 0) {
  console.error('✗ VERIFICACIÓN DE CONTEO DEL BUILD FALLIDA:');
  for (const e of errores) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `✓ Conteo del build verificado: ${leyes} /leyes + ${consultas} /consultas + ${PAGINAS_ESTATICAS.length} estáticas públicas`
);
