# Hoja de verificación CLO — Código de Comercio (PKG_CODIGO_DE_COMERCIO@v1)

> **ESTADO: SOURCE_HOLD.** Esta hoja no aprueba nada. `authoritative: false` · vigencia: UNKNOWN · verificación: PENDING_VERIFICATION.

## 1. Procedencia (a confirmar por el CLO)
- URL: https://drive.google.com/file/d/1fkgjiSliYY7mtcM0VD62ygUxBsxLMeNN/view · dominio: drive.google.com · validación de dominio: **DISCOVERED_UNVERIFIED** · tier concedido: —
- Obtenido por: claude (conector Google Drive; archivo del Drive del propietario; procedencia institucional pendiente de cotejo) (API) el 2026-11-04T03:32:48.000Z
- Decreto: 73-50 · Gaceta: UNKNOWN · Fecha de Gaceta: UNKNOWN  _(UNKNOWN = el paquete no lo aportó; no se infiere)_
- sha256 del archivo original: `cd8b55fb4f3387e8e20aacb38950c2f13a8bfdbb5c2af9be6ea0c8877c680d8b`
- sha256 del texto: `e8f77e65189b7ad7b36658cb10d6c9e3a66effc9456fcd78c9a62ce3253db221`

## 2. Chequeos automáticos de QA
| Chequeo | Severidad | Resultado | Detalle |
|---|---|---|---|
| TEXT_NOT_EMPTY | BLOCKER | OK | 654646 caracteres |
| HASH_MATCH | BLOCKER | OK | sha256 del texto recalculado contra text_sha256 |
| ENCODING | BLOCKER | OK | sin mojibake (Ã¡, Â, �) |
| NOT_NOISE | BLOCKER | OK | 81 % letras |
| LOOKS_SPANISH | WARNING | OK | 33.3 palabras funcionales por 100 |
| ARTICLES_DETECTED | BLOCKER | OK | 1691 artículos detectados (tipo CODE) |
| ARTICLES_PLAUSIBLE | WARNING | OK | 1691 artículos en 654649 caracteres (promedio 387 por artículo) |
| SEQUENCE_CONTINUOUS | WARNING | FALLA | saltos: 164→166, 230→232, 371→373, 383→385, 416→418, 418→418, 504→504, 565→567, 594→596, 618→620 … |
| NO_DUPLICATE_NUMBERS | WARNING | FALLA | repetidos: 418, 504, 1511, 1541, 1662 |
| NO_EMPTY_ARTICLES | WARNING | FALLA | artículos casi vacíos: 504 |
| NO_PLACEHOLDERS | WARNING | OK | sin marcas de ilegibilidad |
| FIXTURE | INFO | OK | material sintético/de prueba detectado |

## 3. Estructura detectada: 1691 artículos
Primero: 1 · último: 1714. (Tabla completa en el JSON del candidato.)

## 4. Decisión del CLO (solo una persona)
- [ ] Identidad del instrumento confirmada (título, decreto, Gaceta, fecha)
- [ ] Texto contrastado con el original oficial (no solo con este extracto)
- [ ] Reformas y derogaciones registradas (o declaradas desconocidas)
- [ ] V4   - [ ] V5   - [ ] RECHAZADO

Nombre: ______________________   Fecha: ____-__-__   Enlace de la decisión: ______________________

**Siguiente paso:** La fuente no está en el registro de fuentes oficiales verificadas: verificar el dominio (registro) antes de que el CLO adjudique el texto.
