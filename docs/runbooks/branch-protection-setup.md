# Runbook: activar branch protection en `main` (deploy cero-manual)

## Por qué esto lo ejecuta Fredy y no Claude

Activar branch protection y crear labels son operaciones de **administración
del repositorio**. La sesión de Claude Code corre con el token de la CLI de
`gh` (cuenta `Lawyer1421`) pero **no debe** cambiar settings del repo/organización
por su cuenta — igual que no aplica migraciones a producción sin 🟢 + sí
explícito. Este runbook entrega los comandos exactos; los corre Fredy.

Estado observado el 2026-09-06 (`gh api`):

- `repos/Lawyer1421/maya-lex-pinel-deploy/branches/main/protection` → `404 Branch not protected`.
- Único status check en commits de `main`: **`Vercel`** (Vercel GitHub App).
- No existe el label `auditor-green`.

## Orden de ejecución

1. Mergear el PR de `feature/stack-maestro` que trae `.github/workflows/ci.yml`
   y `.github/workflows/grokbot-audit.yml` **primero**. Hasta que esos workflows
   estén en `main`, los checks `typecheck` / `test` / `auditor-gate` no existen
   y no se pueden marcar como requeridos.
2. Crear el label `auditor-green`.
3. Aplicar la branch protection.
4. Verificar.

---

## 1. Crear el label `auditor-green`

```bash
gh label create auditor-green \
  --repo Lawyer1421/maya-lex-pinel-deploy \
  --color 2ea44f \
  --description "Auditor DevOps (Grokbot) aprobo el diff — habilita merge"
```

El workflow `grokbot-audit` deja el check `auditor-gate` en ❌ mientras el PR
no tenga este label, y en ✅ cuando se añade. Quitar el label vuelve a ❌.

---

## 2. Aplicar branch protection en `main`

```bash
gh api -X PUT repos/Lawyer1421/maya-lex-pinel-deploy/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Vercel", "typecheck", "test", "auditor-gate"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

Qué hace cada campo:

| Campo | Efecto |
|---|---|
| `required_status_checks.strict` | La rama del PR debe estar al día con `main` antes de mergear. |
| `required_status_checks.contexts` | `Vercel` (deploy preview OK), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `auditor-gate` (label `auditor-green`). |
| `enforce_admins` | Las reglas aplican también a Fredy — sin bypass silencioso. |
| `required_pull_request_reviews` | 1 approval; los approvals viejos se descartan al pushear cambios. |
| `required_conversation_resolution` | Todos los hilos de review resueltos antes de mergear. |
| `allow_force_pushes` / `allow_deletions` | `false` — `main` no se reescribe ni se borra. |

### Nota sobre `contexts` vs `checks`

`contexts` es la forma clásica y sigue funcionando. Si en el futuro dos apps
publican un check con el mismo nombre, migrar a la forma nueva:

```json
"required_status_checks": {
  "strict": true,
  "checks": [
    { "context": "Vercel" },
    { "context": "typecheck" },
    { "context": "test" },
    { "context": "auditor-gate" }
  ]
}
```

---

## 3. Alternativa por UI (equivalente)

`Settings → Branches → Add branch ruleset` (o `Add rule` en el modelo viejo):

- Branch name pattern: `main`
- ☑ Require a pull request before merging → Required approvals: **1**, ☑ Dismiss stale approvals
- ☑ Require status checks to pass → ☑ Require branches to be up to date → añadir: `Vercel`, `typecheck`, `test`, `auditor-gate`
- ☑ Require conversation resolution before merging
- ☑ Do not allow bypassing the above settings (equivale a `enforce_admins`)
- ☐ Allow force pushes · ☐ Allow deletions

---

## 4. Verificar

```bash
gh api repos/Lawyer1421/maya-lex-pinel-deploy/branches/main/protection \
  --jq '{checks: .required_status_checks.contexts, strict: .required_status_checks.strict, admins: .enforce_admins.enabled, reviews: .required_pull_request_reviews.required_approving_review_count}'
```

Esperado:

```
{"checks":["Vercel","typecheck","test","auditor-gate"],"strict":true,"admins":true,"reviews":1}
```

Y abrir un PR de prueba: el check `auditor-gate` debe salir ❌ hasta añadir
el label `auditor-green`.

---

## Revertir

```bash
gh api -X DELETE repos/Lawyer1421/maya-lex-pinel-deploy/branches/main/protection
```
