# CLAUDE.md — instrucciones para agentes de código en este repo

**Usuario / owner:** Fredy Omar Pinel Flores — abogado y notario (Honduras), docente universitario, autor y músico. Responde siempre en **español y en inglés americano** (dos versiones), aunque pregunte en español.

## Reglas inviolables
1. **Local por defecto.** Nada de datos privados sale de la máquina. Todo acceso a un modelo pasa por `core/policy.authorize()`. No añadas llamadas de red fuera de `core/providers` o `integrations/`.
2. **Sin secretos en Git.** Nunca escribas claves en archivos versionados. Solo `.env` (ignorado) y `.env.example` con valores vacíos.
3. **Conocimiento privado ≠ código.** `knowledge/private/` y `storage/` están ignorados. No pegues contenido real de expedientes en pruebas ni docs; usa datos sintéticos.
4. **El prompt/respuesta nunca se registra** en la auditoría; solo hash + longitud.
5. **Mínimo privilegio.** Los manifiestos de `agents/*/agent.json` no pueden auto-conceder proveedores externos; `core/agents` falla cerrado.
6. **Destructivo o publicación externa ⇒ aprobación humana.** Sin excepciones.
7. **No adoptes tecnología nueva** que figure en `DECISIONS.md` sin aprobación del usuario. Prefiere cero dependencias.
8. **Sin acoplamiento a proveedor.** Un proveedor nuevo = un adaptador nuevo en `core/providers`; ningún agente importa un SDK.
9. El asistente **no da dictámenes jurídicos finales**: produce borradores; decide el abogado. No inventes citas legales.

## Metodología (por cada funcionalidad importante)
analizar → ADR en `docs/decisions/` → riesgos → dependencias → implementar → probar → documentar.

## Comandos
`npm start` · `npm test` · `npm run doctor` · `npm run audit:verify`

## Estilo
CommonJS, Node ≥ 20, sin dependencias, pruebas con `node:test`. Comentarios solo donde explican el *porqué*.
