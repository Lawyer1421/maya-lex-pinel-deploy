-- Bucket privado de tránsito para subida directa de documentos pesados
-- (createSignedUploadUrl desde el cliente -- ver app/api/documents/upload-url
-- y app/api/documents/extract). Evita el límite de 4.5 MB de body en
-- funciones serverless de Vercel: el archivo va del navegador a Storage
-- directo, nunca pasa por Vercel.
--
-- Sin políticas RLS permisivas para anon/authenticated a propósito: todo el
-- acceso a este bucket ocurre vía (a) el token de una signed upload URL
-- emitida server-side, o (b) el cliente service_role del servidor (que
-- descarga, extrae y borra el objeto en la misma request) -- ninguno de los
-- dos depende de políticas de storage.objects. RLS ya está habilitado por
-- defecto en storage.objects; al no crear ninguna policy aquí, ningún rol
-- anon/authenticated puede leer, listar ni borrar este bucket directamente.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-temporales',
  'documentos-temporales',
  false,
  20971520, -- 20 MB, igual a MAX_DOCUMENT_BYTES_DIRECT en lib/documents/upload-rules.ts
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do nothing;
