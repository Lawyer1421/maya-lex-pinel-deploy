/**
 * lib/ingesta-oficial/validaciones.ts
 * Reglas de rechazo del pipeline de ingesta oficial. Cada función devuelve
 * un mensaje de error (string) si el paquete debe rechazarse, o null si
 * pasa. Deliberadamente pura y sin I/O — facilita probar cada regla en
 * aislamiento.
 */
import type { ArticuloExtraido, ManifestFuenteOficial } from './types';

const CAMPOS_OBLIGATORIOS: (keyof ManifestFuenteOficial)[] = [
  'autoridad', 'decreto', 'publicacion', 'materia', 'estado', 'checksum', 'responsableRevision',
];

export function validarManifestCompleto(manifest: ManifestFuenteOficial): string | null {
  const faltantes = CAMPOS_OBLIGATORIOS.filter((campo) => !manifest[campo] || String(manifest[campo]).trim() === '');
  if (faltantes.length > 0) {
    return `manifest incompleto: faltan los campos [${faltantes.join(', ')}]`;
  }
  return null;
}

export function validarFuenteIdentificada(manifest: ManifestFuenteOficial): string | null {
  if (!manifest.urlOReferencia && !manifest.autoridad) {
    return 'fuente sin identificación: no se declaró autoridad ni URL/referencia documental';
  }
  return null;
}

export function validarArticulosNoVacios(articulos: ArticuloExtraido[]): string | null {
  const vacios = articulos.filter((a) => !a.contenido || a.contenido.trim().length === 0);
  if (vacios.length > 0) {
    return `artículos vacíos detectados: ${vacios.map((a) => a.numArticulo).join(', ')}`;
  }
  if (articulos.length === 0) {
    return 'no se extrajo ningún artículo del texto fuente';
  }
  return null;
}

/** Numeración incoherente: duplicados, o no parseable como entero positivo. */
export function validarNumeracionCoherente(articulos: ArticuloExtraido[]): string | null {
  const numeros = articulos.map((a) => a.numArticulo);
  const vistos = new Set<string>();
  const duplicados = new Set<string>();
  for (const n of numeros) {
    if (vistos.has(n)) duplicados.add(n);
    vistos.add(n);
  }
  if (duplicados.size > 0) {
    return `numeración incoherente: artículo(s) repetido(s) en el mismo paquete: ${[...duplicados].join(', ')}`;
  }
  const noNumericos = numeros.filter((n) => !/^\d+$/.test(n));
  if (noNumericos.length > 0) {
    return `numeración incoherente: valores no numéricos: ${noNumericos.join(', ')}`;
  }
  return null;
}

export function validarSinDuplicadosContraCorpusExistente(
  articulos: ArticuloExtraido[],
  hashesExistentes: ReadonlySet<string>,
  hashFn: (texto: string) => string,
): string | null {
  const coincidencias = articulos.filter((a) => hashesExistentes.has(hashFn(a.contenido)));
  if (coincidencias.length > 0) {
    return `documentos duplicados: ${coincidencias.length} artículo(s) coinciden por hash exacto con contenido ya existente en staging`;
  }
  return null;
}

export function validarMezclaDeMaterias(manifest: ManifestFuenteOficial, materiasDetectadas: string[]): string | null {
  const distintas = new Set(materiasDetectadas.filter(Boolean));
  distintas.add(manifest.materia);
  if (distintas.size > 1) {
    return `mezcla de materias detectada en un único paquete: ${[...distintas].join(', ')} — un paquete debe representar una sola materia`;
  }
  return null;
}

const PATRON_ANONIMIZACION_SIN_LIMPIAR = /\[(Cliente|Empresa)_An[oó]nimo|Tel[eé]fono_Oculto|Expediente_Anonimizado\]/;
// Heurística conservadora de PII cruda (no anonimizada) — números de
// teléfono hondureños (8 dígitos) y patrones de identidad; solo se usa
// para RECHAZAR paquetes sospechosos, nunca para aceptar sin revisión humana.
const PATRON_POSIBLE_PII = /\b\d{4}-\d{4}\b|\bRTN\s*[:#]?\s*\d{14}\b|\bDNI\s*[:#]?\s*\d{13}\b/i;

export function validarSinDatosPrivados(articulos: ArticuloExtraido[]): string | null {
  const sospechosos = articulos.filter(
    (a) => PATRON_ANONIMIZACION_SIN_LIMPIAR.test(a.contenido) || PATRON_POSIBLE_PII.test(a.contenido),
  );
  if (sospechosos.length > 0) {
    return `archivo con posibles datos privados: ${sospechosos.length} artículo(s) contienen artefactos de anonimización o patrones de identificación personal — un texto de norma oficial publicada no debería tener ninguno`;
  }
  return null;
}

export function validarEstadoDeRevisionDeclarado(manifest: ManifestFuenteOficial): string | null {
  const estadosValidos = ['vigente', 'derogado', 'reformado', 'pendiente_verificacion'];
  if (!estadosValidos.includes(manifest.estado)) {
    return `contenido sin estado de revisión reconocido: "${manifest.estado}" — valores válidos: ${estadosValidos.join(', ')}`;
  }
  if (!manifest.responsableRevision) {
    return 'contenido sin responsable de revisión asignado';
  }
  return null;
}
