# MAYA LEX V2 — Backlog estructurado de fases restantes

Alcance de esta sesión: portada `/`, `/demo`, `/pricing` — completadas. Lo siguiente queda documentado para una sesión futura enfocada, en el mismo orden de prioridad.

## Orden de implementación recomendado

| # | Ruta | Componentes nuevos | Dependencias | Criterios de aceptación | Prioridad | Riesgos |
|---|---|---|---|---|---|---|
| 1 | `/cobertura-juridica` | `TablaCoberturaMaterias`, reutiliza `BadgeVerificacion` | Datos de `MAYALEX_CORPUS_MATERIAS_COBERTURA.csv` (fase de auditoría previa) transcritos a un objeto estático — **no conectar a Supabase en vivo todavía** | Debe reflejar honestamente V0-V5 real por materia; nunca afirmar cobertura no verificada | P1 (bloquea que la portada enlace a algo real) | Si se conecta a datos en vivo antes de tener el pipeline V0-V5 operativo, podría mostrar datos desactualizados sin mecanismo de refresco |
| 2 | `/herramientas` | `TarjetaHerramientaDetalle` | Ninguna (contenido estático + capturas ilustrativas) | Debe detallar las 4 herramientas de la portada con ejemplos, sin prometer funciones no implementadas | P1 | Riesgo de sobre-prometer si se listan funciones aún no construidas |
| 3 | `/seguridad` | Ninguno nuevo, reutiliza `SeccionSeguridad` expandida | Ninguna | Debe listar medidas verificables (RLS, aislamiento de corpus privado) citando evidencia real de auditorías previas | P1 | Bajo — es principalmente contenido honesto ya verificado en esta sesión |
| 4 | `/soluciones/abogados` | `PlantillaSolucionPerfil` (reutilizable para los 6 perfiles restantes) | Ninguna | Problema/solución/funciones/demo/beneficios/límites/plan recomendado/CTA — estructura completa | P1 | Ninguno mayor — es contenido de marketing |
| 5 | `/soluciones/notarios`, `/soluciones/estudiantes` | Reutiliza `PlantillaSolucionPerfil` | Ítem 4 completado primero | Igual que ítem 4 | P1 | Ninguno |
| 6 | `/soluciones/docentes`, `/soluciones/bufetes`, `/soluciones/universidades` | Reutiliza `PlantillaSolucionPerfil` | Ítem 4 completado primero | Igual que ítem 4 | P2 | Ninguno |
| 7 | `/producto` | Página de profundización del producto (no solo resumen de portada) | Ninguna | Debe ampliar, no repetir, el contenido de la portada | P1 | Riesgo de contenido duplicado si no se diferencia claramente de `/` |
| 8 | `/fundador` | Ninguno nuevo | Contenido biográfico real a proporcionar por Don Fredy | P2 | Requiere información real que solo el fundador puede proporcionar — no se debe inventar biografía |
| 9 | `/recursos` | `TarjetaRecurso` | Contenido real (artículos, guías) — puede empezar vacío con "próximamente" | P3 | Bajo impacto si se retrasa |
| 10 | Onboarding post-registro | Flujo de 6 preguntas (perfil, área, objetivo, nivel, tipo de resultado, preferencias) | Requiere decisión sobre dónde persistir las respuestas (¿tabla nueva en Supabase? ¿solo localStorage?) — **requiere autorización explícita antes de tocar el esquema de base de datos** | Usuario nuevo llega a una primera experiencia útil, no a un dashboard vacío | P1 | Es la única pieza de este backlog que toca potencialmente el backend — requiere fase propia con las mismas salvaguardas de esta sesión (snapshot, migración no ejecutada, Preview) |
| 11 | Pruebas de accesibilidad completas | Auditoría con lector de pantalla real, navegación 100% por teclado en las 16 páginas | Todas las páginas anteriores completadas | 0 errores críticos de accesibilidad (WCAG AA) | P1 | Requiere herramientas de auditoría (axe, Lighthouse) no ejecutadas en esta sesión |
| 12 | Pruebas de rendimiento (LCP/INP/CLS) | Ninguno | Todas las páginas completadas y desplegadas a un Preview real | LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 | P1 | Requiere medición en un entorno de red real, no solo local |

## Principio para todas las fases restantes

Ninguna de estas páginas debe conectarse al corpus jurídico real (`biblioteca_vectores`) hasta que ese corpus alcance el nivel de verificación V4/V5 correspondiente (ver `MAYALEX_CORPUS_APPROVAL_WORKFLOW.md`, entregado en una fase previa). El onboarding (ítem 10) es la única pieza que requeriría tocar el esquema de base de datos — debe tratarse como su propia fase con snapshot y aprobación explícita, replicando exactamente las salvaguardas usadas en la Fase 1-3 de la sesión anterior (contención SEO productiva).
