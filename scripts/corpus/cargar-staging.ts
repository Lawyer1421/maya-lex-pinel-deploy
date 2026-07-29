/**
 * scripts/corpus/cargar-staging.ts
 * Carga mecánica a staging: lee el JSONL estructurado y normalizado ya
 * generado y validado por procesar-hn-constitucion.ts, y lo inserta vía el
 * cliente Supabase de servicio existente del repo (lib/supabase.ts) — el
 * texto NUNCA pasa por el razonamiento del modelo, solo por este script.
 *
 * Convención de norm_id ya establecida en el scaffold previo (Fase 6):
 * una fila por artículo, norm_id = "<NORMA>_ART_<n>" (la tabla
 * hn_normas_verificadas_staging tiene PK en norm_id, no en (norm_id,
 * num_articulo)).
 *
 * Uso: npx tsx scripts/corpus/cargar-staging.ts
 */
import fs from 'node:fs';
import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
import { createServerSupabaseClient } from '../../lib/supabase';

const NORM_ID_BASE = 'HN_CONSTITUCION';
const RUTA_JSON = 'corpus-data/estructurado/hn-constitucion.staging.normalizado.json';

interface FilaNormalizada {
  numArticulo: string;
  texto: string;
  fuenteId: string;
  fuenteSha256: string;
  hashArticulo: string;
}

async function main() {
  const filas: FilaNormalizada[] = JSON.parse(fs.readFileSync(RUTA_JSON, 'utf8'));
  console.log(`Cargando ${filas.length} artículos a staging (${NORM_ID_BASE}_ART_*)...`);

  const supabase = createServerSupabaseClient();

  const registros = filas.map((f) => ({
    norm_id: `${NORM_ID_BASE}_ART_${f.numArticulo}`,
    titulo: `Constitución de la República de Honduras — Artículo ${f.numArticulo}`,
    tipo: 'constitucion',
    decreto: '131-1982',
    autoridad: 'Congreso Nacional de Honduras (Asamblea Nacional Constituyente)',
    materia: '00_CONSTITUCIONAL',
    publicacion: '1982-01-11',
    estado: 'pendiente_verificacion',
    num_articulo: f.numArticulo,
    contenido: f.texto,
    fuente: 'https://www.tsc.gob.hn/web/leyes/Constitucion_de_la_republica.pdf',
    hash: f.hashArticulo,
    estado_v: 'V2',
    formato_cita: `Const. Honduras, art. ${f.numArticulo}`,
    fecha_ingesta: new Date().toISOString(),
  }));

  const TAMANO_LOTE = 50;
  let insertados = 0;
  for (let i = 0; i < registros.length; i += TAMANO_LOTE) {
    const lote = registros.slice(i, i + TAMANO_LOTE);
    const { error } = await supabase.from('hn_normas_verificadas_staging').upsert(lote, { onConflict: 'norm_id' });
    if (error) throw new Error(`Fallo en lote ${i}-${i + lote.length}: ${error.message}`);
    insertados += lote.length;
    console.log(`  ${insertados}/${registros.length} insertados`);
  }

  // Verificación de fidelidad: recuperar cada fila y confirmar que el hash
  // declarado coincide con sha256(contenido) recuperado de la base de datos.
  const crypto = await import('node:crypto');
  const { data: verificacion, error: errVerif } = await supabase
    .from('hn_normas_verificadas_staging')
    .select('norm_id, num_articulo, contenido, hash')
    .like('norm_id', `${NORM_ID_BASE}_ART_%`);
  if (errVerif) throw new Error(`Fallo en verificación: ${errVerif.message}`);

  let coinciden = 0;
  const discrepancias: string[] = [];
  for (const fila of verificacion ?? []) {
    const calculado = crypto.createHash('sha256').update(fila.contenido).digest('hex');
    if (calculado === fila.hash) coinciden++;
    else discrepancias.push(fila.norm_id);
  }
  console.log(`\nVerificación de fidelidad: ${coinciden}/${verificacion?.length ?? 0} coinciden con su hash declarado.`);
  if (discrepancias.length > 0) {
    console.error('DISCREPANCIAS (integridad rota):', discrepancias);
    process.exit(1);
  }
  console.log(`\nOK: ${filas.length} artículos de ${NORM_ID_BASE} en staging, estado V2, fidelidad 100% verificada.`);
}

main().catch((err) => {
  console.error('FALLÓ:', err.message);
  process.exit(1);
});
