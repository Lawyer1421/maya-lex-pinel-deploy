# MayaLex — Retrieval V4: roadmap

- **Base:** `origin/main` = `c3847d9297b63dc8b45b700ec7fd82d471f0171f`
- **Fecha:** 2026-10-09
- **Estado:** propuesta. Ninguna fase está iniciada salvo la documentación de V4.0.
- **Independiente del lanzamiento comercial.** Ninguna fase de V4 es requisito para el lanzamiento.
- **Toda transición de fase requiere aprobación explícita del fundador.**

---

## Prerrequisitos transversales

| Prerrequisito | Estado a 2026-10-09 | Evidencia |
|---|---|---|
| Acceso de solo lectura vigente a la base de producción | **BLOQUEADO.** No hay `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` (verificado). Según el reporte recibido, la conexión PostgreSQL directa por puerto 5432 dio timeout en un intento previo | Verificación local de `.env.local` en esta sesión |
| Registro CLO E2 cerrado | OPEN | `docs/corpus/MAYALEX_CANONICAL_ADJUDICATION_REGISTER_V1.md` |
| Registro CLO E5 cerrado | OPEN | Mismo registro |
| Registro CLO E6 cerrado | OPEN | Mismo registro |
| Registro CLO E8 cerrado | CLOSED para la decisión; el texto de Gaceta sigue pendiente | Mismo registro |
| Ingesta de Código de Comercio (D.73-1950) | No autorizada; `ABSENT_VERIFIED` | `docs/corpus/P0_COMERCIO_*` |
| Lista de 41 filas `revision_pendiente` revisada | Pendiente de decisión del fundador | Migración `20260925055249` |

---

## V4.0 — LAB

**Objetivo:** medir el estado real y validar el diseño sin tocar producción.

- **Entrada:** este commit aprobado. Acceso de lectura vigente para la medición (sin esto, la fase se limita a diseño).
- **Trabajo:**
  1. Medición de corpus con consultas de solo lectura: total, por colección, `fuente IS NULL`, `doc_*`, `revision_pendiente`, sin embedding, elegibles según los filtros reales. Resultados agregados, sin contenido de documentos.
  2. Conjunto de 24 consultas del benchmark con respuestas validadas por una persona.
  3. Paquetes de evidencia congelados para la variante A.
  4. Prototipo de unidad legal con fixtures sintéticos, sólo en tests locales.
- **Métrica de éxito:** la medición de corpus se reconcilia con las cifras documentales (76.381 y 77.376) o explica la diferencia con filas identificadas.
- **Rollback:** no aplica; no hay cambio de runtime ni de base.
- **Validación de no escritura:** `production_writes=0`, `staging_writes=0`, sin migraciones, sin cambios en `biblioteca_vectores`.
- **Aprobación del fundador:** requerida para iniciar V4.0 con acceso a la base y para cerrar la fase.

---

## V4.1 — SHADOW

**Objetivo:** ejecutar los canales nuevos en paralelo, registrar su salida y **no** mostrarla al usuario.

- **Entrada:**
  - V4.0 cerrada con medición de corpus aprobada.
  - Aprobación de esquema: `buscar_biblioteca_v3`, columna `tsvector`, tabla `legal_relation`, tabla de identidad de instrumentos. Cada una en migración separada y revisable.
  - Decisión sobre las 41 filas `revision_pendiente`.
  - Entorno de staging o copia de solo lectura disponible.
- **Trabajo:**
  1. Migraciones aplicadas primero en staging. Verificación de rendimiento de `buscar_biblioteca_v3`, corrigiendo el tope de 20.
  2. Canal léxico y canal de relaciones en modo registro. La respuesta al usuario sigue viniendo de la ruta actual.
  3. Comparación offline de variantes A y B sobre el conjunto congelado.
- **Métrica de éxito:** B no empeora A en instrumento correcto ni artículo correcto en ninguna categoría; B reduce afirmaciones sin soporte o no las aumenta.
- **Límite de latencia:** la suma de recuperación en shadow no supera 2 veces la latencia actual de `buscarRAG` en el percentil 95 medido en staging. Umbral a confirmar por el fundador.
- **Rollback:** desactivar el registro shadow (sin efecto en respuesta). Migraciones reversibles con su script de rollback.
- **Validación de no escritura:** el shadow sólo escribe en tabla de registro propia, nunca en `biblioteca_vectores`. Verificación de conteos antes y después.
- **Aprobación del fundador:** requerida para cada migración y para activar el registro shadow.

---

## V4.2 — CANARY

**Objetivo:** servir B a una fracción pequeña de consultas, con gate y citas activos.

- **Entrada:**
  - V4.1 con métricas aprobadas.
  - Mecanismo de activación por flag con allowlist. Recordar: `enabled=true` con `allowed_emails` vacío activa para **todos** los usuarios (`lib/flags.ts:65`). El canary debe usar siempre allowlist explícita.
  - Plan de seguimiento de errores y abstenciones.
- **Trabajo:** activar B para una lista de correos internos. Después, una fracción de tráfico si la infraestructura lo permite.
- **Métrica de éxito:** tasa de abstención correcta igual o mayor que A; cero citas a artículos inexistentes en el corpus; latencia dentro del límite.
- **Rollback:** desactivar el flag. Verificar que la ruta A responde igual que antes del canary, con la misma evidencia.
- **Validación de no escritura:** verificar que `biblioteca_vectores` no cambió durante el canary.
- **Aprobación del fundador:** requerida para cada aumento de la fracción de usuarios.

---

## V4.3 — LIMITED PRODUCTION

**Objetivo:** B como ruta principal para el subconjunto de consultas donde el benchmark mostró mejora (por ejemplo, multi-artículo y remisiones).

- **Entrada:**
  - Canary con métricas sostenidas durante el período acordado por el fundador.
  - Revisión de cumplimiento de los datos de consulta registrados (privacidad).
  - Documentación de cobertura explícita por materia, con las exclusiones del registro CLO visibles.
- **Trabajo:** enrutar esas categorías a B. A sigue como fallback.
- **Métrica de éxito:** igual o mejor que A en todas las categorías de la sección 6 del benchmark, sin excepción.
- **Rollback:** volver a A por categoría con un solo cambio de configuración.
- **Validación de no escritura:** verificación periódica de conteos de la base.
- **Aprobación del fundador:** requerida.

---

## V4.4 — GENERAL PRODUCTION

**Objetivo:** B como ruta general y retiro gradual del camino anterior.

- **Entrada:**
  - V4.3 estable durante el período acordado.
  - Cierre de E2, E5, E6 para las materias en producción.
  - Decisión sobre la ingesta de Código de Comercio y LOAT.
  - Decisión documentada sobre contexto largo (sección 5 del blueprint). Sólo si el laboratorio lo justifica; no es requisito.
- **Trabajo:** retirar la ruta A del camino por defecto. Mantener el código de A como fallback durante un período definido.
- **Métrica de éxito:** métricas de V4.3 sostenidas en todo el corpus.
- **Rollback:** reactivar la ruta A por configuración.
- **Validación de no escritura:** auditoría de conteos y de las exclusiones.
- **Aprobación del fundador:** requerida.

---

## Riesgos transversales

| Riesgo | Fase donde aparece | Mitigación |
|---|---|---|
| Medición de corpus no posible por falta de acceso | V4.0 | Declarar el bloqueo; no sustituir por cifras documentales |
| Tope de 20 candidatos en RPC | V4.1 | `buscar_biblioteca_v3` con límite explícito |
| Flag con allowlist vacía activa para todos | V4.2 | Allowlist obligatoria en el procedimiento |
| Modelo de relaciones con datos no verificados | V4.1 | Sólo `VERIFIED` fundamenta; `UNVERIFIED` amplía candidatos en shadow |
| Presión para acelerar el lanzamiento | Todas | Ninguna fase de V4 bloquea el lanzamiento; las aprobaciones son del fundador |
