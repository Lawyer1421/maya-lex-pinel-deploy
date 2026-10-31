# Aviso de privacidad de «Consulta jurídica general» (Luna) — BORRADOR

**Estado: BORRADOR, PENDIENTE DE AUTORIZACIÓN EXPRESA DEL PROPIETARIO (o de su delegado jurídico).** No se muestra a usuarios: la interfaz mantiene `AVISO_LUNA_AUTORIZADO_POR_PROPIETARIO = false` (`lib/luna/consent.ts`) y no pinta el interruptor ni este texto. Cambiar esa constante a `true` es un cambio revisado, posterior a la autorización expresa y escrita del propietario o su delegado jurídico (el antiguo CLO ya no interviene). Las citas legales y la descripción de retención del proveedor son `PENDIENTE_VERIFICACIÓN`.

**Versión del aviso:** `2026-10-29.v1`. Si el texto cambia, la versión cambia y toda aceptación anterior deja de valer (el servidor compara la versión en cada solicitud).

## Texto (idéntico a `AVISO_LUNA_TEXTO`; una prueba verifica que coinciden)

Consulta jurídica general: tu pregunta y los textos normativos públicos recuperados se envían a un proveedor externo de IA (OpenAI) para redactar una respuesta con referencias. No escribas nombres, RTN, DNI, números de expediente, montos ni fechas de un caso concreto, ni cuentes hechos propios. No se envían tu historial, archivos ni datos de tu sesión. El proveedor puede conservar registros de monitoreo de abuso hasta 30 días. La respuesta es analítica y NO OFICIAL.

## Comportamiento de la interfaz cuando el propietario autorice
Interruptor «Consulta jurídica general» **apagado por defecto** → al activarlo se muestra este aviso y una casilla de aceptación (también apagada) → solo con ambos se envía `luna:{modalidad, aceptado:true, aviso_version}`. Desactivar el interruptor o cambiar de versión borra la aceptación. Todo lo demás se envía al proveedor actual.

## Puntos para el propietario o su delegado jurídico
Redacción en español jurídico; si debe nombrar a OpenAI; descripción de retención (30 días de monitoreo de abuso; `store:false` no es Zero Data Retention); conservar o no prueba de aceptación (requeriría almacenamiento = DDL, no incluido).
