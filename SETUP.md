# MAYA LEX IA PINEL HN — Guía de Instalación

## Requisitos previos

- Node.js 18+ instalado (descargar en nodejs.org)
- npm o yarn
- Cuenta en Anthropic (console.anthropic.com) — para la API key de Claude
- Cuenta en Supabase (supabase.com) — para la base de datos (OPCIONAL para pruebas iniciales)

---

## PASO 1 — Instalar dependencias

Abrir terminal en la carpeta `maya-lex-app/`:

```bash
npm install
```

---

## PASO 2 — Configurar variables de entorno

Copiar el archivo de ejemplo:

```bash
# Windows PowerShell:
Copy-Item .env.local.example .env.local

# O simplemente copiar y pegar el archivo manualmente
```

Editar `.env.local` con tus claves reales:

```env
# OBLIGATORIO para que el chat funcione:
ANTHROPIC_API_KEY=sk-ant-api03-TU_CLAVE_AQUI

# OPCIONAL (sin esto funciona en modo demo sin rate limiting):
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### ¿Dónde obtener la Anthropic API Key?
1. Ve a https://console.anthropic.com/settings/keys
2. Crea una nueva API key
3. Pégala en .env.local como ANTHROPIC_API_KEY

---

## PASO 3 — Configurar base de datos Supabase (OPCIONAL)

Si quieres el rate limiting real (3 consultas/día en plan gratuito):

1. Ve a https://app.supabase.com y crea un proyecto
2. En el menú lateral, ve a **SQL Editor**
3. Copia y ejecuta el contenido de `supabase/schema.sql`
4. Ve a **Project Settings → API** y copia:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

**Sin Supabase configurado**, el chat funciona sin límites (modo desarrollo).

---

## PASO 4 — Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abrir en el navegador: **http://localhost:3000/chat**

---

## PASO 5 — Probar el chat

1. Ve a http://localhost:3000/chat
2. Selecciona el modo: **Sala IA** (rápido) / **Análisis** (profundo) / **Documento** (redacción)
3. Escribe una consulta jurídica, por ejemplo:
   - "¿Cuál es el plazo para apelar según el Art. 706 CPC?"
   - "Redacta un contrato de arrendamiento de inmueble"
4. El sistema responde en streaming en tiempo real

---

## Estructura del proyecto

```
maya-lex-app/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      ← API de chat con Claude (CORE)
│   │   └── usage/route.ts     ← API de estado de uso
│   ├── chat/page.tsx          ← Interfaz de chat
│   ├── layout.tsx             ← Layout raíz
│   └── page.tsx               ← Página de inicio
├── components/
│   ├── ChatInterface.tsx      ← Componente principal del chat
│   └── MessageBubble.tsx      ← Burbuja de mensajes con Markdown
├── lib/
│   ├── system-prompt.ts       ← System prompt completo de Maya Lex
│   ├── rate-limit.ts          ← Control de 3 consultas/día (free)
│   └── supabase.ts            ← Cliente de base de datos
├── supabase/
│   └── schema.sql             ← Esquema de base de datos
└── .env.local.example         ← Template de variables de entorno
```

---

## Modos de consulta

| Modo | Modelo | Máx. tokens | Uso recomendado |
|------|--------|-------------|-----------------|
| ⚡ Sala IA | claude-haiku-4-5 | 800 | Audiencias · respuesta ultrarrápida |
| ⚖️ Análisis | claude-opus-4-7 | 4,000 | Análisis jurídico profundo |
| 📜 Documento | claude-opus-4-7 | 8,000 | Redacción completa de instrumentos |

---

## Deployment en Vercel (producción)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variables de entorno en Vercel Dashboard:
# Settings → Environment Variables → agregar todas las de .env.local
```

URL de producción sugerida: **maya-lex.vercel.app**

---

## Siguiente paso: RAG con pgvector

Para conectar los códigos y plantillas personales a la base de conocimiento:

1. Activar pgvector en Supabase: Extensions → pgvector
2. Crear tabla `documents` con columna `embedding vector(1536)`
3. Usar OpenAI text-embedding-3-small para vectorizar los documentos
4. Implementar búsqueda semántica en el API route antes de llamar a Claude

---

*© 2026 MAYA LEX IA PINEL HN · Abogado Fredy Omar Pinel Flores · Choluteca, Honduras*
