# Dictamen · Corrección de la marca de sustitución del legacy de OLA 3 y OLA 9

**Estado:** C1 FIRMADA (2026-11-25, Abg. y Not. Fredy Omar Pinel Flores, CLO)
**Fecha:** 2026-11-25 · **Destino:** producción `thgrhueckkjdutjvcufp`

## 1. Hallazgo de la verificación de cierre

La verificación de cierre (`scripts/olas/verificacion-cierre-prod.sql`, solo lectura, 2026-11-25) confirmó lo siguiente:

- 7,415 filas V5 visibles, todas con embedding 384D válido y con el texto íntegro (SHA-256 coincide en las 7,415). Los 17 lotes cuadran.
- Las 7,349 filas legacy sustituidas están **ocultas** (`revision_pendiente = true`); no queda ninguna visible.

**Defecto.** Las 378 filas legacy de la Constitución (`mayalex_normativos:constitucion_1982_a*`) y las 215 del Código Tributario (`mayalex_normativos:tributario_2016_a*`) tenían `metadata` NULL. El paso 03 de cada paquete escribió `metadata = b.metadata || jsonb_build_object(...)`, y en PostgreSQL `NULL || jsonb` da NULL. Las filas quedaron ocultas, pero **sin la marca `sustituido_por_lote`**.

**Consecuencia.** La búsqueda no se ve afectada. La reversión 99 de OLA 3 y OLA 9 busca el legacy por esa marca: si se corriera hoy, borraría el lote V5 y **no** re-expondría el legacy, y la Constitución o el Código Tributario desaparecerían de la búsqueda. Los respaldos del paso 00 (`biblioteca_vectores_ola3_con_2021_01_backup`, 378 filas, y `biblioteca_vectores_ola9_ctrib_2024_01_backup`, 215 filas) están completos, así que nada se ha perdido.

Son las únicas 593 filas ocultas con metadata NULL en toda la tabla. Las otras siete olas con legacy quedaron marcadas correctamente.

## 2. Corrección propuesta

`01_marcar_legacy_ola3_ola9_prod.sql` escribe en esas 593 filas exactamente la marca que los paquetes firmados quisieron escribir: mismo lote, fecha `2026-11-24` y motivo. Características:

- **no** cambia la visibilidad, el texto ni el embedding;
- identifica las filas contra los respaldos del paso 00;
- corre en una sola transacción y aborta si no marca exactamente 378 y 215 filas, o si queda alguna fila oculta con metadata NULL.

En una lectura previa en producción, las dos condiciones seleccionan exactamente 378 y 215 filas.

Con la marca escrita, la reversión 99 firmada vuelve a funcionar. La única diferencia es que, al revertir, esas filas quedarían con `metadata = {}` en lugar de NULL.

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `01_marcar_legacy_ola3_ola9_prod.sql` | 2,144 | `853a78b72959f90debe6761662b8657aa1644edea7c44f49fe8e245380ed4dbe` |

## 3. Corrección del generador (para olas futuras)

`scripts/olas/paquete-ola.ts` ahora escribe `coalesce(b.metadata, '{}'::jsonb) || …` y añade una postcondición: el paso 03 aborta si no quedan marcadas exactamente las filas legacy esperadas. Los paquetes ya ejecutados no se regeneran.

## 4. Decisión del CLO

| # | Decisión | Decisión del CLO |
|---|---|---|
| C1 | Ejecutar `01_marcar_legacy_ola3_ola9_prod.sql` en producción, exactamente con la huella de §2 | ☑ **Aprueba y autoriza**: marcar las 378 filas legacy de la OLA 3 y las 215 de la OLA 9 |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-25

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-25 la aprobación de C1. Claude Code la transcribió aquí por su instrucción. El SQL no se modificó: la firma cubre exactamente la huella citada en §2.

## 5. Ejecución tras la firma

```powershell
Set-Location C:\Users\fredy\maya-lex-pinel-deploy
pwsh -File docs\corpus\staging\2026-11-25-correccion-marca-legacy\ejecutar_prod.ps1
```

El envoltorio pide el project ref, la frase `MARCAR LEGACY OLA3 OLA9 EN PROD` y la `DATABASE_URL` oculta, y la borra al terminar. El ejecutor (`scripts/olas/ejecutar-sql.ts`) verifica, antes de conectar:
- la huella del SQL contra `manifiesto.json`;
- la línea **Estado** de este dictamen, que debe decir «C1 FIRMADA»;
- que este dictamen cite la huella completa;
- que la URL apunte a `thgrhueckkjdutjvcufp`.
