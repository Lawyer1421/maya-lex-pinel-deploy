# Fase 1 — Ley de Organización y Atribuciones de los Tribunales (`HN_LEY_ORGANIZACION_ATRIBUCIONES_TRIBUNALES`)

Grupo secundario dentro de la misma cola (30 hallazgos totales, líneas 340–351 y
949–955 de `HUMAN_LEGAL_REVIEW_QUEUE.jsonl`), distinto al problema del Código de
Familia. No se resolvió nada aquí — es un resumen de estado, para que decidas
prioridad frente al resto de la Fase 1.

## Resuelto (no requiere acción)

- **Decreto 91** → reclasificado a reforma del Art. 254, inciso 5 (cita textual
  confirmada por lectura directa).
- **Decreto 90** → reclasificado a reforma del Art. 78, inciso 4 (cita textual
  confirmada por lectura directa).

## Enriquecido, pero aún requiere revisión legal humana (`decisionLegalPendiente: true`)

- **Decreto 11**: reorganiza jurisdicción entre Corte de Apelaciones de lo Criminal
  y de lo Civil — reorganización de tribunales existentes, no crea institución
  nueva. **Advertencia**: existen dos instrumentos distintos con el mismo número
  de decreto 11 en la colección (reutilización histórica de numeración
  legislativa) — requiere desambiguar cuál es cuál.
- **Decreto 8**: reforma artículos de OTRO decreto (Decreto 8 del Gobierno
  Provisional de 1907), no directamente de la Ley base por nombre — relación
  indirecta, sin confirmar si ese Decreto 8 de 1907 quedó incorporado a la ley
  vigente.
- **Decreto 54**: reorganiza jurisdicción territorial en Olancho/Copán.
  **Inconsistencia de dato detectada**: el metadato registra fecha de Gaceta "9 de
  marzo de 1918", pero el propio texto del decreto cita "La Gaceta número 3,232 de
  fecha 15 de febrero de 1909" — hay que corregir el metadato, no es una pregunta
  de fondo jurídico, es un error de captura.
- **Decreto 102**: crea una regla sustantiva nueva y autónoma (responsabilidad
  solidaria de Secretarios de Jueces de Paz) sin citar un artículo numerado que
  reforme — podría ser adición de artículo o reforma implícita no citada.
- **Decreto 38**: crea una excepción a una prohibición de OTRO decreto (Decreto 88,
  ya clasificado como derogación de artículo) — relación inter-decreto, no reforma
  directa de la ley base.

## Sin ninguna investigación posterior encontrada (estado original, sin enriquecer)

- **Decreto 88**: solo tiene el hallazgo automático original ("no se detectó
  patrón de reforma/derogación vía regex") — sin lectura directa posterior
  registrada en lo que revisé.
- **Creación de instituciones nuevas** (no son reforma de artículo numerado, cada
  una con solo el hallazgo automático original, sin lectura directa posterior
  registrada): Decreto 30 (crea "Corte"), Decreto 15 (crea "Juzgado"), Decreto 40
  (crea "Juzgado"), Decreto 41 (crea "Juzgado"), Decreto 2 (crea "Juzgado"),
  Decreto 22 (crea "Juzgado").
- Posible segunda instancia de **Decreto 91** sin resolver (el hallazgo automático
  original aparece dos veces con `instrumentoId` distinto, pero solo encontré una
  reclasificación posterior) — verificar antes de asumir que ambas instancias
  quedaron cerradas.

## Recomendación

Ninguno de estos toca datos de clientes ni afecta directamente los hallazgos de
prioridad ALTA del Código de Familia. Prioridad sugerida: MEDIA-BAJA frente al
extractor de notas al pie y la verificación OSINT del Decreto 102-2018, que
afectan una superficie mucho mayor del corpus.

---

*Solo documentación de estado, no resuelto, no mergeado.*
