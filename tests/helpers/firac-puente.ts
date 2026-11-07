import type { FragmentoRAG } from '@/lib/legal-retrieval/types';
import { hashFragmento } from '@/lib/legal-retrieval/primitives';
import type { InstrumentId } from '@/lib/legal-retrieval/clo-guards';
import { crearPuenteCorpus, type Recuperador, type ResultadoPuente } from '@/lib/legal-os/skills/corpus-bridge';
import type { FiracSkill } from '@/lib/legal-os/skills/firac-schema';

const FUENTE: Partial<Record<InstrumentId, string>> = {
  CODIGO_NOTARIADO: 'Código del Notariado',
  CODIGO_PROCESAL_CIVIL: 'Código Procesal Civil',
  CODIGO_COMERCIO: 'Código de Comercio',
};

/** Fragmento de norma vigente tal como lo entregaría la ruta de recuperación ya anotada (materia sellada para el Notariado). */
export function fragmentoNorma(instrumentId: InstrumentId, articulo: string, extra: Partial<FragmentoRAG> = {}): FragmentoRAG {
  const base = {
    id: `frag-${instrumentId}-${articulo}`,
    contenido: `Texto de prueba del artículo ${articulo}`,
    num_articulo: articulo,
    fuente: FUENTE[instrumentId] ?? 'Código de Comercio',
    relevancia: 1,
    fuente_tipo: 'codigo',
    jurisdiccion: 'HN',
    es_norma_vigente: true as boolean | null,
    materia: instrumentId === 'CODIGO_NOTARIADO' ? '03_NOTARIAL' : null,
    ...extra,
  };
  return { ...base, hash: extra.hash ?? hashFragmento(base) };
}

/** Recuperador de prueba: devuelve la norma vigente de cualquier instrumento y artículo pedido. */
export const recuperadorFeliz: Recuperador = async ({ instrumentId, articulo }) => [fragmentoNorma(instrumentId, articulo)];

export const puenteDePrueba = (recuperar: Recuperador = recuperadorFeliz, snapshot = 'snap-prueba-1') => crearPuenteCorpus(recuperar, snapshot);

/** Resultado sellado del puente para una plantilla con un corpus de prueba que lo respalda todo. */
export const respaldoCompleto = (t: FiracSkill): Promise<ResultadoPuente> => puenteDePrueba().verificarPlantilla(t);
