# MAYA LEX V2 — Arquitectura de información

Rama: `feature/mayalex-v2-accelerated-relaunch` (base: `content/seo-containment-corpus-pipeline` @ `dc5633e`). No mezclada, no desplegada.

## 1. Mapa de rutas completo

| Ruta | Estado en esta sesión | Prioridad |
|---|---|---|
| `/` | **Implementada** (portada V2 completa) | P0 |
| `/demo` | **Implementada** (demo con mock, sin registro) | P0 |
| `/pricing` | **Implementada** (rediseño V2, sin checkout activo) | P0 |
| `/producto` | Backlog | P1 |
| `/herramientas` | Backlog | P1 |
| `/cobertura-juridica` | Backlog | P1 |
| `/seguridad` | Backlog | P1 |
| `/fundador` | Backlog | P2 |
| `/soluciones/abogados` | Backlog | P1 |
| `/soluciones/notarios` | Backlog | P1 |
| `/soluciones/estudiantes` | Backlog | P1 |
| `/soluciones/docentes` | Backlog | P2 |
| `/soluciones/bufetes` | Backlog | P2 |
| `/soluciones/universidades` | Backlog | P2 |
| `/recursos` | Backlog | P3 |
| `/login` | Sin cambios (backend actual, no reconstruido) | — |

Ver `MAYALEX_V2_RELEASE_RUNBOOK.md` para el backlog estructurado completo de las rutas pendientes.

## 2. Estructura de la portada `/`

1. **Navegación premium** — logo, Producto, Soluciones (dropdown 6 perfiles), Herramientas, Cobertura jurídica, Precios, Seguridad, Recursos, Iniciar sesión, Probar gratis (CTA).
2. **Hero** — título de posicionamiento, descripción, CTA principal "Probar demostración", CTA secundario "Explorar herramientas", enlace "Ver cobertura jurídica".
3. **Demostración visual** — vista previa embebida/estática de cómo luce una respuesta de Maya Lex (sin interactividad real aquí — el enlace lleva a `/demo`).
4. **Herramientas principales** — grid de 4-6 tarjetas (consulta normativa, análisis de documentos, estrategia procesal, generación de escritos).
5. **Perfiles de usuario** — 7 tarjetas (abogados, notarios, estudiantes, docentes, bufetes, universidades, empresas), cada una enlazando a su futura página `/soluciones/*`.
6. **Banco Jurídico Hondureño** — sección que presenta el corpus normativo, con honestidad sobre su estado actual (enlaza a `/cobertura-juridica`).
7. **Futuro Modo Litigante** — sección "próximamente", sin prometer disponibilidad inmediata.
8. **Seguridad y privacidad** — bullets verificables (aislamiento de datos privados, sin PII en respuestas públicas, RLS), enlaza a `/seguridad`.
9. **Experiencia del fundador** — breve nota de Fredy Omar Pinel Flores, abogado/notario, Choluteca — credibilidad humana, no corporativa genérica.
10. **Planes** — resumen de 5 niveles, enlaza a `/pricing`.
11. **Preguntas frecuentes** — 5-6 preguntas honestas (incluye "¿cubre toda la legislación hondureña?" con respuesta transparente de que no).
12. **CTA final** — repetición de "Probar demostración".
13. **Footer profesional** — enlaces legales, contacto, ubicación, redes, copyright.

## 3. Estructura de `/demo`

1. Selector de escenario ficticio (1-2 casos precargados, sin input libre en esta primera versión — evita que alguien pegue un caso real).
2. Resultado demostrativo con 7 campos obligatorios: materia, cuestión jurídica, análisis breve, acción sugerida, riesgo, fuente demostrativa, estado de verificación.
3. Aviso permanente y visible: "Esto es una demostración con datos ficticios — no es asesoría jurídica ni fuente vigente."
4. 3 CTA de salida: "Crear cuenta gratuita", "Ver análisis profesional", "Explorar planes".

## 4. Estructura de `/pricing`

1. 5 tarjetas: Explorar, Académico (USD 9), Profesional (USD 15), Bufete, Universidad.
2. Comparación de características por fila (tabla responsive).
3. Nota de política de uso razonable donde aplique "ilimitado".
4. Todos los botones de plan de pago: deshabilitados o dirigidos a lista de espera — ningún checkout real.
5. FAQ de precios (facturación, cambios de plan, cancelación).

## 5. Principio de aislamiento de datos

Ninguna de estas 3 páginas importa `lib/seo/articulos-vigentes.ts`, `lib/rag/search.ts`, ni ningún módulo que toque `biblioteca_vectores`. La demo usa exclusivamente un objeto TypeScript local con datos ficticios (`app/demo/casos-mock.ts`). Cero conexión al corpus, contaminado o no.
