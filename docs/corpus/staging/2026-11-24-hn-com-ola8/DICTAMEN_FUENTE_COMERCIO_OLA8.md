# OLA 8 · `HN:CODIGO_COMERCIO` — dictamen de fuente (sin paquete)

**Estado:** PAUSADA por resolución del CLO (2026-11-24): se aprueba la opción 1 (recomendada); la OLA 8 espera la edición consolidada del CEDIJ del Código de Comercio.
**Fecha:** 2026-11-24 · **Producción hoy:** 0 filas del Código de Comercio (Decreto Legislativo No. 73-50).

## 1. Fuentes revisadas

| Archivo | Bytes · SHA-256 | Resultado |
|---|---|---|
| `S26/codigo del comercio.pdf` (CrossDevice, teléfono) | 1,438,733 | **Ilegible**: marcador de nube sin sincronizar (mismo caso que la Constitución, OLA 3). Por su tamaño, es la misma copia que A01 |
| Candidato **A01** (`docs/corpus/inbox/2026-11-04-hn-001-tranche-a-drive/HN-001-A01.json`) | `cd8b55fb4f33…` (= `Codigo del Comercio (1).pdf` y `(2).pdf` de `SISTEMA_LEGAL_PRINCIPAL`) | Compilación CSJ «Norma º 73-50», Acrobat Distiller del 27-abr-2003, **sin notas ni marcas de reforma o derogación**. QA previo: 1,705 artículos, 13 ausentes (417, 1000, 1236–1245, 1661), 4 repetidos (418, 1511, 1541, 1662) |
| `SISTEMA_LEGAL_PRINCIPAL/…/codigo del comercio.pdf` | 1,389,199 · `bd488fde7219…` | Otra salida de la misma compilación de 2003 |
| `…/CODIGO DE COMERCIO PDF DESGLOSADO POR ARTICULOS.pdf` | 838,484 · `4bcd70803c7c…` | **No es de Honduras**: es el Código de Comercio del Perú («Promulgado 15.02.1902») |

## 2. Por qué no se empaqueta

Todas las copias hondureñas legibles son la compilación de **2003**. No reflejan las reformas posteriores. Ya consta en producción V5, por ejemplo, el **D.284-2013** (La Gaceta 33,445; lote `PILOTO_D284_2013_01`), que:
- reforma los arts. 14, 15, 18, 157, 169, 189, 193, 210, 222, 224, 226 y 228;
- deroga los arts. 380 a 383.

A01 conserva esos artículos con su redacción anterior y sin marca de derogación. Hay además reformas por leyes posteriores a 2003 (garantías mobiliarias, mercado de valores, sistema financiero, entre otras) que ninguna de estas copias anota.

Un paquete armado con esta compilación presentaría como vigente texto superado. Ese es el defecto que las OLAS 1 a 7 corrigieron en otros códigos.

## 3. Opciones para el CLO

1. **Recomendada:** conseguir la edición consolidada del CEDIJ del Código de Comercio, del mismo formato que las de las OLAS 5 a 7 y con notas por decreto, o sincronizar el PDF del teléfono si fuera una edición distinta. Con eso, la OLA 8 se arma con `scripts/olas/cedij.ts` en el mismo día.
2. **Paliativa:** cargar la compilación de 2003 entera como **CONTEXT** (nunca PRIMARY), con constancia de «texto anterior a 2003, reformas posteriores no integradas». Aplicaría el D.284-2013 desde su texto oficial V5: los 12 artículos reformados con el texto de La Gaceta y los arts. 380 a 383 como derogados. Cubre el vacío de 0 filas sin presentar texto superado como vigente, pero la consulta mercantil seguiría sin texto PRIMARY.

No se ejecutó ni se generó nada para la OLA 8.
