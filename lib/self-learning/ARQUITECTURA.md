# Self-Learning / Conocimiento Comunitario — Diseño de arquitectura

Rama: `feature/self-learning-rag` — **no mezclada a `main`, no desplegada, DDL no ejecutado.**

## Resumen de la decisión de diseño

Se pidió "aprendizaje en tiempo real". El diseño entregado es responsable en
lugar de literal: **ningún documento se vuelve buscable sin pasar por un gate
de moderación**, y por defecto ese gate requiere confirmación humana. La
razón — explicada también en el chat — es doble:

1. **Confidencialidad**: demandas/sentencias/análisis subidos por usuarios
   casi seguro contienen nombres y datos de terceros (clientes, contrapartes,
   menores). Sin anonimización verificada, esos datos podrían aparecer en
   la respuesta que Maya Lex le da a OTRO usuario — una fuga de datos real,
   con implicación de secreto profesional dado que este es un producto con
   la firma de un abogado/notario licenciado detrás.
2. **Responsabilidad del producto**: un análisis erróneo o mal intencionado
   de un usuario, indexado sin filtro, puede terminar citado como fuente
   en la respuesta a otro cliente — riesgo de mala praxis para un producto
   jurídico.

## Flujo de datos

```
Usuario sube documento (demanda/sentencia/análisis/opinión/dictamen)
        │
        ▼
ingerirDocumento()  ── lib/self-learning/ingesta.ts
        │
        ├─► moderarDocumento()  ── lib/self-learning/moderar.ts
        │     │
        │     ├─ Capa 1: regex estructurado (DNI, teléfono, correo, expediente)
        │     │           → solo telemetría, no es la anonimización real
        │     │
        │     └─ Capa 2: Claude revisa (claude-opus-4-8)
        │                 → detecta nombres de terceros (regex no puede)
        │                 → evalúa si es contenido jurídico legítimo
        │                 → genera texto_anonimizado real
        │                 → score de calidad 0.0–1.0
        │
        ▼
Se guarda SIEMPRE en `documentos_aprendizaje` (auditoría completa,
incluso lo rechazado queda registrado, nunca se descarta en silencio)
        │
        ├─ estado='rechazado'    → fin. Nunca indexado.
        ├─ estado='en_revision'  → fin por ahora. Espera aprobación de un
        │                          admin humano (AUTO_APROBAR_HABILITADO=false
        │                          por defecto → esto es el camino normal).
        │
        └─ estado='aprobado' (solo si AUTO_APROBAR_HABILITADO=true en el futuro)
              │
              ▼
        fragmentarDocumento()  ── chunks de ~1200 caracteres
              │
              ▼
        embedPassage()  ── e5-small (HF), MISMO modelo que biblioteca_vectores
              │
              ▼
        INSERT en `vectores_conocimiento`
              │
              ▼
        Ahora es buscable via buscar_conocimiento_comunidad() (RPC)
        — pero SOLO si algo (una ruta API futura) llama a
        buscarConocimientoComunidad() en lib/self-learning/buscar.ts,
        que HOY no está conectada a app/api/chat/route.ts.
```

## Por qué el mismo modelo de embeddings que el corpus oficial (e5-small)

Se sugirió usar la API de OpenAI/Gemini/Claude para los embeddings. No se
hizo, y la razón es técnica, no de preferencia:

- **Claude no tiene API de embeddings** — Anthropic no ofrece ese producto
  (su socio recomendado es Voyage AI, un proveedor distinto).
- **Vectores de modelos distintos no son comparables.** La similitud coseno
  entre un vector de OpenAI/Gemini y uno de e5-small no tiene significado —
  literalmente no miden lo mismo. Usarlos mezclados en la misma búsqueda
  daría resultados basura.
- Usar e5-small (ya integrado, ya pagado, ya probado en producción con
  77,376 fragmentos) mantiene la puerta abierta a fusionar este índice con
  `biblioteca_vectores` en el futuro si se decide así — sin tener que
  re-embeber los 77,376 fragmentos existentes con un modelo nuevo.

## Aislamiento de la rama de trabajo actual

Deliberadamente **NO se tocó ningún archivo existente**:
- `lib/rag/embed.ts` no se importó ni modificó — `lib/self-learning/embed.ts`
  duplica la lógica mínima necesaria, aceptando algo de repetición a cambio
  de cero riesgo sobre el pipeline de producción.
- `app/api/chat/route.ts` no se tocó — el modelo de chat en producción
  sigue exactamente igual hasta que se decida conectar esto.
- `supabase/*.sql` no se tocó — el nuevo esquema vive en
  `lib/self-learning/schema.sql`, un archivo separado, **no ejecutado**.

## Lo que falta antes de salir a producción (cada uno requiere su propia decisión)

1. **Ejecutar `schema.sql`** contra Supabase — no se hizo automáticamente.
   Revisar el archivo primero.
2. **Ruta API para recibir subidas** (`app/api/self-learning/subir/route.ts`
   o similar) — no existe todavía. Necesita:
   - Rate limiting propio (independiente del rate limit de consultas de chat)
   - Límite de tamaño de subida
   - Si se permite subir PDF/DOCX (no solo texto pegado): reutilizar
     `app/api/extract-text/route.ts`, que ya existe y funciona
3. **Panel de administración** para revisar la cola `en_revision` — no
   existe. Sin esto, `AUTO_APROBAR_HABILITADO=false` significa que nada
   llega nunca a ser buscable, por diseño, hasta que exista una forma de
   aprobar manualmente (aunque sea directo en Supabase Table Editor al
   principio, antes de construir una UI dedicada).
4. **Decisión editorial sobre `AUTO_APROBAR_HABILITADO`**: recomiendo
   mantenerlo en `false` durante las primeras semanas, revisar manualmente
   una muestra de las decisiones que habría tomado el gate automático
   (comparando contra lo que un humano decidiría), y solo entonces
   considerar activarlo.
5. **Conectar `buscarConocimientoComunidad()` al chat** — decisión
   editorial de si se usa por defecto o solo cuando el usuario lo activa
   explícitamente (similar al toggle de "Buscar en web" que ya existe).
   Requiere también extender `lib/system-prompt.ts` para que el modelo
   distinga explícitamente "doctrina oficial" de "aporte comunitario no
   verificado" en su respuesta — el prompt Magistrado ya tiene una
   jerarquía normativa de 7 niveles; esto entraría en un nivel propio,
   claramente marcado como no oficial.
6. **Costo por documento moderado**: cada subida cuesta 1 llamada a
   claude-opus-4-8 (moderación) + N llamadas a HF por cada fragmento
   embebido. Con volumen alto (miles de usuarios), vale la pena revisar
   si claude-haiku-4-5 es suficiente para la moderación (más barato) una
   vez que se tenga evidencia de que la calidad de decisión es aceptable.

## Archivos de esta entrega

| Archivo | Propósito |
|---|---|
| `schema.sql` | DDL — 2 tablas + RPC de búsqueda. NO ejecutado. |
| `types.ts` | Tipos TypeScript compartidos |
| `moderar.ts` | Gate de moderación (regex + Claude) |
| `embed.ts` | Embeddings e5-small + fragmentación de documentos largos |
| `ingesta.ts` | Orquestador: moderar → guardar → (si aprueba) indexar |
| `buscar.ts` | Búsqueda en el conocimiento comunitario (no conectada al chat) |
