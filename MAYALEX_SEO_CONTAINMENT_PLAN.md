# MAYALEX — Plan de contención SEO (Paquete A)

Rama: `content/seo-containment-corpus-pipeline` (creada desde `security/baseline-p0-subscriptions`, commit `55081b6`). Ningún cambio se desplegó ni se subió a GitHub.

## 1. Fuente central de estado editorial

`data/corpus-editorial-status.json` — manifest versionado en el repo con los 198 artículos auditados (`num_articulo` → `{estado: 'contaminado'|'limpio', motivo}`), generado desde la evidencia de `MAYALEX_CORPUS_RUTAS_PUBLICAS.csv`/`MAYALEX_PUBLIC_ROUTES_REMEDIATION.csv` de fases anteriores. 139 contaminados, 59 limpios.

`lib/seo/estado-editorial.ts` — única función que todo consumidor (páginas, sitemap, RAG) debe usar: `obtenerEstadoEditorial`, `esContaminado`, `filtrarLimpios`, `listarContaminados`, `motivoEstado`. **Ninguna ruta está hardcodeada en ningún componente** — todo pasa por este módulo. El día que exista una tabla `corpus_editorial_status` en producción (ver migración no ejecutada `supabase/migrations/20260728000000_corpus_editorial_status.sql`), solo este archivo cambia de implementación.

Regla de seguridad por defecto: un artículo sin entrada en el manifest se trata como `contaminado` (nunca se indexa por defecto sin evidencia).

## 2. Cambios de código (todos en la rama local, sin desplegar)

| Archivo | Cambio |
|---|---|
| `data/corpus-editorial-status.json` | Nuevo — manifest de 198 artículos |
| `lib/seo/estado-editorial.ts` | Nuevo — fuente central de estado editorial |
| `app/leyes/[articulo]/page.tsx` | `generateMetadata` agrega `robots: {index: !contaminado, follow: true}`; el texto visible deja de afirmar "norma verificada" cuando está contaminado |
| `app/consultas/[slug]/page.tsx` | Igual + `alternates.canonical` ahora apunta siempre a `/leyes/{numero}` (antes apuntaba a sí misma) — `/leyes` se declara URL primaria |
| `app/sitemap.ts` | Filtra los números de artículo contaminados antes de listar `/leyes` y `/consultas` — la exclusión del sitemap es automática y basada en datos, no en una lista manual |
| `lib/rag/search.ts` | Nuevo filtro `contieneArtefactoAnonimizacion` — los fragmentos RAG con artefactos de anonimización sin limpiar se excluyen del contexto entregado al modelo de chat (satisface "no aparezcan en búsquedas internas profesionales") |

## 3. Lo que NO cambia

- `generateStaticParams` de ambas páginas sigue generando las 198 rutas de cada tipo (396 total) — **la URL nunca desaparece**, solo deja de anunciarse a buscadores cuando está contaminada.
- El contenido servido (`obtenerArticuloPorNumero`) no se modifica — sigue viniendo de `biblioteca_vectores` en producción, sin alterar ninguna fila.

## 4. Restauración tras limpieza

Cuando un artículo se re-ingiera limpio (vía el pipeline de `MAYALEX_OFFICIAL_SOURCE_PIPELINE.md`) y se confirme sin artefactos, basta con actualizar su entrada en `data/corpus-editorial-status.json` a `estado: 'limpio'` (o migrar a la tabla productiva) — automáticamente vuelve a indexarse y a aparecer en el sitemap, sin tocar los componentes de página.

## 5. Pruebas (24 aprobadas — ver sección de cierre)

- `tests/seo-editorial-status.test.ts` (9 pruebas) — el manifest en sí.
- `tests/seo-sitemap-containment.test.ts` (3 pruebas) — exclusión del sitemap.
- `tests/seo-page-metadata-containment.test.ts` (7 pruebas) — `robots` y `canonical` en ambas páginas.
- `tests/rag-anonymization-filter.test.ts` (5 pruebas) — filtro del RAG del chat.

## 6. Confirmación

No se desplegó. No se hizo push. No se modificó producción (Supabase ni Vercel). No se publicaron páginas nuevas — las 396 rutas ya existían; solo cambió su declaración de indexación.
