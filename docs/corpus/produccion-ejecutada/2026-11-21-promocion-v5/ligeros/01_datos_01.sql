-- 01_datos_01.sql | Solo mayalexhn-prod / thgrhueckkjdutjvcufp.
-- Ejecutar secuencialmente 01_datos_01..08 después de 00a y 00. Cada archivo se puede reintentar.
-- Mantiene las filas ocultas; el vector cero es temporal hasta ejecutar todos los 02_emb.
BEGIN;
DO $precheck$
BEGIN
 IF to_regclass('public.biblioteca_vectores_v5_20261121_backup') IS NULL THEN RAISE EXCEPTION 'Falta el respaldo; ejecute 00_precheck_y_respaldo_prod.sql'; END IF;
 IF EXISTS (SELECT 1 FROM public.biblioteca_vectores WHERE ingest_batch IN ('A03_CODIGO_NINEZ_01','A04_D35_2013_01','PILOTO_D284_2013_01') AND metadata->>'estado_v'='V5' AND revision_pendiente=false) THEN RAISE EXCEPTION 'Ya hay filas V5 visibles; detener la carga.'; END IF;
END
$precheck$;
INSERT INTO public.biblioteca_vectores (id,coleccion,materia,contenido,num_articulo,fuente,metadata,embedding,jurisdiccion,fuente_tipo,es_norma_vigente,revision_pendiente,instrumento_id,num_articulo_norm,hash_contenido,ingest_batch,ingested_at) VALUES
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:13','mayalex_normativos','10_LEYES_REGLAMENTOS','Corresponde al Estado, por medio de las entidades de salud pública, brindarle a la madre y al niño, en las etapas prenatal, natal y postnatal, atención médica especializada y, en caso de necesidad, apoyo alimentario.','13','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":13,"article_sha256":"e5343facbfc41298dc89edf3fcf8dbf686f05859ff809515692c6cbd30322e4b","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','13','68b7ac07c940308ae60402a1440f247c1397fbbc6f380405b1f3311e865eabf9','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:15','mayalex_normativos','10_LEYES_REGLAMENTOS','Se prohíbe la experimentación o manipulación genética, contrarias a la dignidad, integridad y al desarrollo físico, mental o moral del ser humano.','15','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":15,"article_sha256":"cbb013bc3341a40e85484185ec5f839386e6127cc085cf02b69749a9d8ae0e2a","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','15','2ce7ecd9b296a725021c3ae9fa3c6ef802b3112c5aed1dcc37dd5c2e048de3dd','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:38','mayalex_normativos','10_LEYES_REGLAMENTOS','El padre y la madre, así como los representantes legales de los niños y sus maestros, son responsables de su educación.','38','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":40,"article_sha256":"a53031481023124dee81324844ddc3277a68c92212bf14a415c16e857976822c","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','38','9fed95e9fd5ed3147226ee746bcc782b12cdb380d9831f2065e3c13cb5548d18','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:63','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','63','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":65,"article_sha256":"f818840dabf9a3f1862658650ac4b69411092002f516c38dd3e9f2f4842d52e9","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','63','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:71','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','71','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":73,"article_sha256":"6b483d1a469e76d45c890e78a212142df7703a3691d95d65ef3b865a57f86606","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','71','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:77','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','77','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":79,"article_sha256":"131326b28d334c2f14d56a9f1096a755bf65327ecb6f9ac2960f92d07828dcf6","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','77','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:82','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','82','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":84,"article_sha256":"94a9bf2352b036ce0b89289579e4eb8357bf3efdb5734093694e83c8978e00d0","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','82','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:90','mayalex_normativos','10_LEYES_REGLAMENTOS','No se permitirá ningún perdón, expreso o tácito, de parte del agraviado o de sus padres o representantes legales, para los transgresores de los derechos de un niño.','90','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":92,"article_sha256":"93a64f25e85c0c23023a664dd0d4ff369f0140b97dbcd18c5b869321ee164669","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','90','09a20578a48a2c8a72a0e8205934a915c592065faa73666bb6c834e657e11cbe','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:117','mayalex_normativos','10_LEYES_REGLAMENTOS','El trabajo de los niños, además de retributivo deberá ser formativo y orientador.','117','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":122,"article_sha256":"347ff8e719c41a870e5e821cf751b7623bf5bdc8d3858d0acbb8b206820a0005","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','117','1b8dc48ead71929bfac6e43786183249ec91fccd3f4626a38b43485e133e9250','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:136','mayalex_normativos','10_LEYES_REGLAMENTOS','Las corporaciones municipales y las organizaciones comunitarias y docentes cooperarán con la Secretaría de Estado en los Despachos de Trabajo y Seguridad Social en el cumplimiento de las obligaciones derivadas de este Código.','136','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":141,"article_sha256":"097649542077e10477c26586391cb41cd5aaf04a0f1d03eea761daca4698f9e1","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','136','e72feea6414ce2d1313d58553ae0707cd9ed2a5740a819061dae3fb8eab458b7','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:189','mayalex_normativos','10_LEYES_REGLAMENTOS','Solamente se podrá aplicar Medidas Cautelares a El Niño(a), con el objetivo de:

a) Asegurar y garantizar su presencia en el Proceso; b) Asegurar las pruebas; y, c) Proteger a la víctima, denunciante o testigo.','189','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":202,"article_sha256":"9862865ec2d4702d7172fc4bf2196243e60fbd7c14ebb901eeea8d1f6115aa7b","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','189','6cc959d30e833d7b390683b7409fa79b18f808d31bce6aac52739979bab6a055','A03_CODIGO_NINEZ_01',now()),
('A04_D35_2013_01:DECRETO_35_2013:1','mayalex_normativos','10_LEYES_REGLAMENTOS','Reformar los Artículos 1,5,20,21,32,
96, 97, 98, 99, 102, 104, 105, 113, 128, 139, 140, 141, 142,
143, 145,146, 147, 148, 149,150, 152, 154, 162, 163, 164,
165, 166,167,168,169,173,180, 181,182,183, 184,185,
186, 187,188, 189, 190, 191, 192, 193, 194, 195, 196, 197,
198, 199,200, 201, 202, 203,204; 205, 206, 207, 208, 209,
210, 211, 212, 213, 214, 215,216, 217, 218, 219, 220, 221,

222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233,
234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245,
246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257,
258, 259, 260, 261, 262, 263, 264, 265 y 282,del Decreto
No.73-96 de fecha 30 de mayo de 1996, contentivo del
CÓDIGO DE LA NIÑEZ Y LA ADOLESCENCIA, los que
en adelante se leerán así:

"ARTÍCULO 1.- Para todos los efectos de este Código,
se entenderá por niño o niña a todas las personas hasta los
dieciocho (18) años de edad.

Las disposiciones contenidas en este Código son de orden
público y los derechos que establecen en favor de los niños
y niñas son irrenunciables, intransigibles y de aplicación
obligatoria en todo acto, decisión o medida administrativa,
judicial o de cualquier naturaleza que se adopte respecto de
las personas hasta los dieciocho (18) años de edad, las que
para todos los efectos legales se considerarán como niños y
niñas.

En caso de duda sobre la edad de un niño o niña, se
presumirá mientras se establece su edad legal efectiva, que
es menor de dieciocho (18) años."

"ARTÍCULO 5.- Las disposiciones de este Código se
interpretarán y aplicarán siempre de manera que aseguren
una eficaz protección a los derechos de los niños, niñas y su
superior interés.

En todas las medidas que tomen las instituciones públicas o
privadas, los tribunales, las autoridades administrativas o los
órganos legislativos, la consideración primordial que se
atenderá será la del interés superior del niño.

Se interpretarán y aplicarán, además, teniendo en cuenta los
Tratados y Convenios sobre los derechos de la niñez,
aprobados y ratificados por Honduras, los que prevalecen
sobre el Derecho Interno.

Debiéndose respetar:

1) Su condición de sujeto de derecho;
2) El derecho de los niños y niñas a ser oídos y que su
opinión sea tenida en cuenta;
3) El respeto al pleno desarrollo personal de sus
derechos en su medio familiar, social y cultural;
4) Su edad, grado de madurez, capacidad de
discernimiento y demás condiciones personales:
5) El equilibrio entre los derechos y garantías de los niños
y niñas y las exigencias del bien común; y,
6) Su centro de vida. Se entiende por centro de vida el
lugar donde los niños y niñas han transcurrido en
condiciones legítimas la mayor parte de su existencia.

Cuando exista conflicto entre los derechos e intereses de
los niños y niñas frente a otros derechos e intereses igualmente
legítimos, prevalecerán los primeros."

"ARTÍCULO 20.- Se prohíbe la extracción de órganos,
tejidos, fluidos o células a los niños o niñas, para ser utilizados
con fines ilícitos. Quienes infrinjan esta disposición serán
sancionados de conformidad con lo prescrito por el Código
Penal o ley especial respectiva."

"ARTÍCULO 21.- Quien venda o proporcione a los niños
y niñas cigarrillos, licores, sustancias estupefacientes,
pegamentos que contengan sustancias tóxicas o volátiles o
cualquier otro producto que pueda provocarle daño a su
salud o desarrollo integral, o los induzca a su uso y consumo,
será sancionado con multa de diez (10) a treinta (30) salarios
mínimos, en su valor más alto. Dicha sanción se aplicará sin
perjuicio de las demás que establezcan el Código Penal u
otras leyes especiales."

"ARTÍCULO 32.- Ningún niño o niña será objeto de
injerencias arbitrarias o ilegales en su vida, dignidad y honor,
así como en su domicilio, correspondencia y demás datos
personales. En consecuencia, se prohíbe:
1) Exponer, difundir o divulgar sus nombres y apellidos
u otros datos personales, informaciones o imágenes
en los medios de comunicación masiva o electrónica,
. que les identifiquen, directa o indirectamente, así como
cuando se le considere responsable o víctima de una
infracción de La Ley; y,

2) La publicación, reproducción, exposición, venta o
distribución y la utilización en cualquier otra forma de
sus expresiones e imágenes de niños y niñas
presuntamente infractores de La Ley.

Quien autorice, facilite o permita la publicación,
reproducción, exposición, venta, distribución o utilización
de cualquier información que violente lo dispuesto por esta
norma, será sancionado con una multa de diez (10) a veinte
(20) salarios mínimos en su valor más alto, atendida la
gravedad de la infracción. Sin perjuicio de la responsabilidad
civil y penal a que hubiere lugar en Derecho."

"ARTÍCULO 96.- Ninguna persona natural o jurídica
podrá vender o proporcionar a un niño o niña menores de
dieciocho (18) años a cualquier título:

1. Armas, municiones, explosivos y pólvora en general;
2. - Juegos artificiales salvo aquellos que carezcan de
poder explosivo;
3. - Material pornográficos o cuyo contenido induzca a la
violencia o a la pretensión o a la degradación de la
persona por actos de delincuencia; y,
4.- La venta de pastillas que sirven para curar frijoles y
maíz.

El incumplimiento de estas disposiciones será sancionado
con multa de treinta (30) a cincuenta (50) salarios mínimos
en su valor más alto, sin perjuicio de la responsabilidad civil,
administrativa y penal a que hubiere lugar en Derecho."

"ARTÍCULO 97.- Se prohíbe al propietario, gerente o
encargado de establecimientos que expendan bebidas
alcohólicas como actividad principal, casas de juego y
apuestas, clubes nocturnos y similares permitir el ingreso y
permanencia de niños y niñas.

Los propietarios(as) de dichos establecimientos, están
obligados a dar a conocer esta prohibición, mediante avisos
que colocarán en la entrada y en otros lugares visibles de su
negocio.

Las autoridades competentes, velarán por el estricto
cumplimiento de este Artículo.

Lo establecido en este Artículo será aplicable a cualquier
persona que realice actividades ilícitas, sin perjuicio de la
responsabilidad penal correspondiente."

"ARTÍCULO 98.- Se prohíbe a los propietarios,
representantes o administradores permitir el ingreso y
permanencia de niños y niñas en moteles, pensiones y
establecimientos similares, salvo si se encuentran
acompañados por su padre, madre o representante legal,
en defecto de estos últimos la persona responsable del niño
o niña que le acompañe, deberá portar autorización por
escrito, debidamente autenticada.

En el caso de los hoteles y complejos turísticos se prohíbe el
ingreso y acceso de niños y niñas al área de habitaciones
salvo que sean acompañados de sus padres, madres o
representantes legales y en su defecto deberán acompañar
la autorización debidamente legalizada.

Los(as) propietarios(as) de dichos establecimientos, están
obligados(as) a dar a conocer esta prohibición, mediante
avisos que colocarán en lugares visibles de su negocio."

"ARTÍCULO 99.- Quien contravenga lo dispuesto en los
artículos 97 y 98 de este Código, será sancionado de
acuerdo a las reglas siguientes:

1. Multa de veinte (20) a treinta (30) salarios mínimos
en su valor más alto, en la categoría que determine la
Ley de Salario Mínimo, si es por primera vez;
2. Suspensión de su permiso de operaciones hasta por
dos (2) semanas, si es por segunda vez; y,
3. Cancelación de su permiso de operaciones, si es por
tercer vez.

Tales sanciones serán impuestas por la autoridad que haya
expedido los permisos de operación.

El importe de las multas establecidas en este Artículo será
enterado en la Tesorería de las Alcaldías Municipales, dentro
de los cinco (5) días hábiles siguientes al de su notificación
quedando obligado el(a) infractor(a) a presentar el recibo
de pago a la autoridad que le impuso la sanción, dentro de
los tres (3) días siguientes. La Municipalidad respectiva debí

de utilizar estos fondos en programas y proyectos destinados
a la niñez."

"ARTÍCULO 102.- El padre o madre que haya sido
suspendido(a) o privado del ejercicio de la patria potestad,
solo podrá trasladar a sus hijos menores de dieciocho (18)
años, dentro o fuera del país, previa autorización escrita de
quien la deba otorgar.

En caso de no portar la referida autorización, el(la) Juez
Competente, a petición de parte interesada, ordenará a las
autoridades de policía se le requiera para que dentro de las
veinticuatro (24) horas siguientes proceda a entregarlo(a)."

"ARTÍCULO 104.- La solicitud de autorización o
impedimento de salida del país, deberá contener:

a) El nombre y apellidos del niño o niña;
b) . Los nombres y demás generales de los padres, o
representante legal;
c) El nombre completo y generales de la persona que
acompañará al niño o niña; y,
d) La relación de los hechos en que se funda la solicitud,
con la cual se acompañará la certificación de partida
de nacimiento y demás pruebas pertinentes."

"ARTÍCULO 105.- Quien tenga a su cuidado un niño o
una niña, estando fuera del país por cualquier causa y no
ejerza la Patria Potestad sobre él o ella, necesitará
autorización de quien la ejerza o en su defecto del(la) Juez
de Letras de la Niñez o quien haga sus veces. Igualmente
podrá acudir al(la) Juez(a) para que le autorice la salida en
el caso de que quien ejerza la Patria Potestad le niegue la
respectiva autorización.

Cualquier autoridad o persona particular que tenga
conocimiento de que se trata de sacar un(a) niño(a) en
violación de lo contenido en el párrafo precedente está en la
obligación de poner en conocimiento de la autoridad
correspondiente tal situación de acuerdo a las reglas
siguientes:

1) Ante el(la) Juez de Letras de la Niñez o quien haga
sus veces en el caso de que no se haya llegado al
control migratorio; y,

2) Ante la autoridad migratoria cuando se detecte la
supuesta intención de sacar al niño(a) del país, en el
control migratorio.

En el caso del numeral 2) precedente la autoridad
competente deberá poner en conocimiento, del(la) Juez de
la Niñez o quien haga sus veces y del Ministerio Público tal
situación, para los efectos legales correspondientes, de
conformidad al Convenio de La Haya relativo a Cooperación
Internacional en Materia de Sustracción de Menores.

En el caso que ya se haya producido la sustracción
internacional, se deberá poner en conocimiento ante el
Instituto Hondureño de la Niñez y la Familia (IHNFA) o la
institución en la que se delegue."

"ARTÍCULO 113.- Las Secretarías de Estado en los ramos
de Salud, Educación e Interior y Población conjuntamente
con el Instituto Hondureño de la Niñez y la Familia (IHNFA),
la Dirección General de las Personas con Discapacidad
(DIGEDEPDI) y otras instituciones públicas, privadas y
asociaciones civiles vinculadas, formularán, coordinarán y
desarrollarán políticas, programas, planes y actividades
encaminadas a garantizar los derechos de los niños y niñas
con discapacidad.

Cuando las personas de quienes el niño(a) dependa,
incumplan o vulneren sus derechos, o se opongan a que
reciban atención, serán denunciados ante el Instituto
Hondureño de la Niñez y la Familia (IHNFA), Policía,
Ministerio Público, y en su defecto ante los Juzgados de
Paz, Comisionados Municipales de Derechos Humanos,
Defensorías de la Niñez, Mujer, por cualquier persona o
institución que tenga conocimiento de dicha situación, para
asegurar las medidas urgentes de protección."

"ARTÍCULO 128.- La Secretaría de Estado en los
Despachos de Trabajo y Seguridad Social inspeccionará
regular y periódicamente a las empresas, centros y lugares
de trabajo y casas de habitación y en este último caso, previa
autorización judicial cuando éste sea su centro de trabajo,
para verificar si tienen a su servicio niños y niñas y si están
cumpliendo las normas que los protegen.

Quién transgreda dichas normas será sancionado(a) con multa
de cinco (5) a quince (15) salarios mínimos en su valor más
alto. La reincidencia será sancionada con el doble de la multa
anterior.

Cuando se haya puesto en peligro la vida de un niño o niña
o se haya atentado contra su dignidad, integridad física,
psíquica o intelectual, además de la multa prevista se le
aplicarán las sanciones civiles y penales a que haya lugar."

"ARTÍCULO 139.- Un niño(a) es particularmente
vulnerable al incumplimiento y a la violación de sus derechos,
cuando se encuentra o se ve afectado(a) por situaciones,
tales como:

a. Que se encuentre en estado de abandono;
b. Carezca de atención suficiente para la satisfacción de
sus necesidades básicas;
c. Su patrimonio se encuentre amenazado por quienes
lo administran;
ch. Carezca de representante legal;
d. Sea objeto de maltratos o de corrupción;
e. Se encuentre en una situación especial que atente
contra sus derechos o su integridad; y,
f Sea adicto(a) a sustancias que produzcan
dependencia o se encuentre expuesto a caer en la
adicción."

"ARTÍCULO 140.- Los niños y niñas cuyos derechos son
vulnerados, quedan sujetos(as) a las medidas de protección
consagradas en el presente Título."

"ARTÍCULO 141.- Un niño o niña se encuentra en
situación de abandono, cuando:

a) Fuere abandonado en lugares públicos;
b) Falten en forma absoluta las personas que conforme
a la Ley, tienen el cuidado personal de su crianza
educación; y,
c) No sea reclamado por sus padres o representantes
legales al ser dado de alta, en establecimientos
hospitalarios o de asistencia social."

"ARTÍCULO 142.- Toda persona o institución que tenga
conocimiento de la situación de abandono de un niño o niña,
deberá denunciarlo al Instituto Hondureño de la Niñez y La
Familia (IHNFA), Policía, Ministerio Público, Juzgados de
Paz, Comisionados Municipales de Derechos Humanos,
Defensorías de la Niñez y Mujer, para asegurar las medidas
urgentes de protección e interponer la denuncia para el
ejercicio de la acción penal."

"ARTÍCULO 143.- Los(as) Directores(as) de los
hospitales públicos y privados y de los demás Centros
Asistenciales, están obligados a informar sobre los niños y
niñas abandonados en sus dependencias y a entregarlos al
Instituto Hondureño de la Niñez y la Familia (IHNFA), dentro
de las veinticuatro (24) horas siguientes a la ocurrencia de
hecho."

"ARTÍCULO 145.- Los(as) jefes de las misiones
diplomáticas y consulares de Honduras que tengan
conocimiento que un niño o niña hondureño(a) ha sido
privado de su derecho a la familia o que ha sido internado
en una institución pública o privada del país en el que estén
acreditados, investigarán las causas de los hechos y le
brindarán el auxilio legal y económico que necesite. El costo
de este auxilio será reembolsado por el Estado de Honduras
previa prueba.

De inmediato, informarán del hecho al Instituto Hondureño
de la Niñez y La Familia (IHNFA), además le enviarán
informe sobre los cambios que se hayan producido y en su
caso el IHNFA realizará las gestiones necesarias a fin de
lograr su repatriación."

"ARTÍCULO 146.- A los(as) responsables de
incumplimiento de lo establecido en los artículos 143, 144 y
145 precedentes se les sancionará con multa de cinco (5) a
quince (15) salarios mínimos en su valor más alto, la que
impondrá el titular de la institución a quien corresponda. La
indicada multa se aplicará sin perjuicio de la responsabilidad
civil y penal a que hubiere lugar en Derecho.

Para la deducción de estas responsabilidades, se informará
y al Ministerio Público sobre los hechos de que se trate, cuando
éstos sean constitutivos de delito."

"ARTÍCULO 147.- Corresponde al Instituto Hondureño
de la Niñez y la Familia (IHNFA), conocer, investigar y
determinar la existencia de causales de las situaciones de
abandono y de incumplimiento de derechos de la niñez en
sede administrativa.
El Instituto Hondureño de la Niñez y la Familia (IHNFA)
actuará de oficio o a petición de cualquier persona, debiendo
emitir auto motivado con las pruebas y argumentos
presentados, en el que declarará admitida o desestimada la
solicitud o archivadas las diligencias, según sea el caso.

Si admite la solicitud o actúa de oficio, adoptará las medidas
de protección que sean necesarias y citará a una audiencia
con la participación del padre, madre o representante legal,
si se conociera su paradero, en su defecto citará a cualquier
persona bajo cuyo cuidado haya estado el niño o niña de
que se trate. Tal audiencia se realizará en el término de cinco
(5) días contados a partir de la fecha del auto en que se dio
inicio el procedimiento. Si se desconoce el paradero de los
padres o representantes legales el término será de ocho (8)
días, ordenándose en el auto con que se dio inicio el proceso
que se realicen tres (3) publicaciones en dos (2) diarios
escritos, hablados o televisivos de circulación nacional,
incluyendo la fotografía del niño o niña o señas particulares,
según el caso.

La denuncia de abandono podrá ser presentada verbalmente
o por escrito, por cualquier persona natural o jurídica,
debiendo contenerlo siguiente:

1) Nombre del niño o niña si se supiere y en su defecto
señas particulares del(a) mismo(a);
2) Nombre de los padres o representantes legales o de
la persona a cuyo cargo estaba o está el niño o niña,
si se supiere y en su defecto señas particulares del
mismo;
3) Lugar en que se encontró o se encuentra el niño o
niña; y,
4) Otro dato que sea de interés para la protección del
niño o niña."

"ARTÍCULO 148.- En los asuntos a que se refiere esta
Sección el Instituto Hondureño de la Niñez y la Familia
(IHNFA) procederá de conformidad con la Ley de
Procedimiento Administrativo. La correspondiente resolución
que emita siempre será motivada y contra ella cabrán los
recursos de reposición y apelación subsidiaria ante el órgano
superior jerárquico."

"ARTÍCULO 149.- La declaratoria de que un(a) niño(a)
se encuentra en situación de abandono o de vulnerabilidad
de sus derechos obliga al Instituto Hondureño de la Niñez y
la Familia (IHNFA) a proceder de inmediato a brindarle la
protección que necesite. Cuando las circunstancias lo exijan,
el Juzgado de Letras de la Niñez competente, o el que haga
sus veces, a petición del IHNFA, ordenará el allanamiento
del sitio donde el niño o niña se encuentre.

Durante todo el tiempo en que se mantenga vigente la
declaración del niño(a) en situación de vulneración de
derechos, el Poder Ejecutivo, por intermedio de Instituto
Hondureño de la Niñez y la Familia (IHNFA), dispondrá un
programa de seguimiento, incluyendo atención médica,
psicológica o psiquiátrica del niño o niña, o de su padre,
madres, responsable o representantes legales."

"ARTÍCULO 150.- Los niños y niñas declarados(as) en
situación de abandono o vulnerados en sus derechos, serán
protegidos con las medidas siguientes:

a) Prevención o amonestación a los padres, madres o
representantes legales;
b) Atribución de su custodia o cuidado personal al
pariente por consanguinidad más próximo que se
encuentre en condiciones de ejercerlos o en su defecto
por afinidad;
c) Ingreso en familia sustituta o solidaria;
d) Como última alternativa, su ingreso en un centro de
protección, ya sea este del (IHNFA) o privado
debidamente autorizado por éste; y,
e) Cualquier otra medida, cuya finalidad sea la de
asegurar el cuidado personal del niño o niña, atender
sus necesidades básicas o poner fin a los peligros
que amenacen su salud, su dignidad o su formación
moral.

En los casos de los literales b), c), d); y, e), las medidas
serán siempre excepcionales y provisionales, debiéndose
tomar en cuenta el Interés Superior del Niño o Niña.

Si los padres, o representantes legales del niño o niña cuentan
con los medios necesarios, el Instituto Hondureño de la Niñez
y la Familia (IHNFA) podrá fijarles una cuota mensual para
que contribuyan a su sostenimiento mientras se encuentre
bajo una medida de protección."

"ARTÍCULO 152.- Quien ejerza la Patria Potestad sobre
el niño o niña, o su representante legal, podrá solicitar la
terminación de los efectos de la declaración de abandono,
cuando se demuestre que se han superado las circunstancias
que le dieron lugar y que hay razonables motivos para esperar
que no volverán a producirse.

Lo dispuesto en este Artículo no será aplicable cuando el
niño o niña haya sido dado(a) en adopción o cuando quien
ejerza la Patria Potestad sea reincidente.

El Juzgado de Letras de la Niñez accederá a lo pedido si,
después de efectuadas las investigaciones pertinentes,
considera probado lo argumentado por los(las)
peticionarios."

"ARTÍCULO 154.- Se entenderá que un niño o niña carece
de la atención suficiente para la satisfacción de sus
necesidades básicas, cuando carece de medios para atender
su subsistencia, o cuando las personas encargadas de su
cuidado se niegan a suministrárselo o lo hagan de manera
insuficiente."

"ARTÍCULO 162.- Se prohíbe el maltrato de niños o niñas,
considerándose maltrato toda acción u omisión que violente
los derechos y el bienestar de éstos, afectando su salud física,
mental o emocional.

Se consideran víctimas de maltrato, los niños y niñas que
han sufrido daños o perjuicios en su salud física, mental o
emocional o de su bienestar personal, por acciones u
omisiones de su padre, madre, representante legal,
maestros(as) u otras personas con las que guarde relación.

El maltrato puede ser por:

1) Omisión;
2) Supresión; y,
3) Por Trasgresión".

"ARTÍCULO 163.- El maltrato por Omisión es aquel que
se da por el incumplimiento de los deberes de los padres,
representantes legales o cualquier otra persona que esté a
cargo del niño o niña, éste puede ser físico, intelectual o
emocional.

El maltrato Físico por Omisión, comprende aquellos casos
en que el niño o niña es dejado solo o sola en imposibilidad
de acceder con un mínimo grado de seguridad a un techo,
vestimenta, alimentación o cuidados físicos y médicos
necesarios u otros análogos.

El maltrato Intelectual por Omisión, comprende aquellos
casos en que no se le presta la atención debida al niño o
niña, en los procesos educativos, formativos y recreativos.

El maltrato Emocional por Omisión, comprende aquellos
casos en que se deja de proveer al niño o niña, el afecto y
cariño que necesita para su sano desarrollo.

Las acciones de violencia en el núcleo familiar, aunque no
afecten directamente al niño o niña, serán consideradas como
maltrato por omisión."

"ARTÍCULO 164.- El maltrato por Supresión implica todo
aquel trato, disimulado o no, como medidas disciplinarias o
correctivas, que tiendan a negar al niño o niña el goce de sus
derechos.

Este maltrato comprende toda supresión o discriminación
que conlleve perjuicio al niño o niña, incluida la exclusión del
hogar y la negación del goce y ejercicio de sus libertades; el
derecho a la asistencia familiar, a la atención médica y a los
medicamentos que requiera, el acceso a un ambiente infantil
y a actividades y áreas recreativas o a recibir visitas de otros
niños o niñas respecto de los cuales no hay causa justa para
considerarlas perjudiciales."

"ARTÍCULO 165.- El maltrato por Trasgresión tendrá lugar
cada vez que se produzcan acciones o conductas hostiles,
rechazantes o destructivas hacia el niño o niña, tales como
hacerlo objeto de malos tratos físicos; proporcionarle drogas
o medicamentos que no sean necesarios para su salud o que
la perjudiquen; someterle a procedimientos médicos o
quirúrgicos innecesarios que pongan en riesgo su salud física,
mental o emocional; obligarle a alimentarse en exceso, hacerlo
víctima de agresiones emocionales o de palabra, incluyendo
la ofensa y la humillación; la incomunicación rechazante; y el
castigo por medio de labores pesadas.
Cuando el Instituto Hondureño de la Niñez y la Familia
(IHNFA) tenga conocimiento de maltratos por trasgresión,
presentará inmediatamente la correspondiente denuncia al
Ministerio Público, para que se proceda conforme a
Derecho."

"ARTÍCULO 166.- Sin perjuicio de la responsabilidad Civil,
Administrativa y Penal a que hubiera lugar en Derecho, el
maltrato será sancionado administrativamente por el Instituto
Hondureño de la Niñez y la Familia (IHNFA), con multa de
uno (1) a dos (2) salarios mínimos en su valor más alto.
Asimismo el(la) infractor(a) deberá asistir a los programas
de tratamiento y rehabilitación, así como de consejería
familiar que tendrá el Instituto Hondureño de la Niñez y la
Familia (IHNFA), los que incluirán orientación psicológica
y social.

En la aplicación de esta norma, el Instituto Hondureño de la
Niñez y la Familia (IHNFA), procurará que las sanciones
no menoscaben el legítimo ejercicio de los derechos a que
da origen la patria potestad o tutela, en su caso."

"ARTÍCULO 167.- El Estado, por medio del Instituto
Hondureño de la Niñez y la Familia (IHNFA) formulará y
pondrá en práctica programas de detección, registro y
seguimiento de los niños y niñas que hayan sido maltratados,
así como de quienes hayan sido agresores y demás víctimas."

"ARTÍCULO 168.- Los(las) Directores(as) de los
hospitales públicos y privados y de los demás centros
asistenciales, informarán en un plazo máximo de veinticuatro
(24) horas al Instituto Hondureño de la Niñez y la Familia
(IHNFA) y al Ministerio Público, sobre los niños y niñas
que muestren signos evidentes de agresión y sobre aquellos
cuyos exámenes revelen que han sido víctimas de malos
tratos.

En la misma obligación incurrirán los(las) Directores(as) de
Centros Educativos y Centros de Cuidado, así como
los(las) responsables directos de los niños y niñas, en esos
centros.

La omisión de estos informes se sancionará con multa de
dos (2) a cinco (5) salarios mínimos en su valor más alto, sin
perjuicio del cumplimiento de la obligación."

"ARTÍCULO 169.- Incurre en responsabilidad Civil, Penal
y Administrativa, el(la'') funcionario(a) o empleado(a) del
Instituto Hondureño de la Niñez y la Familia (IHNFA) bajo
cuyo cuidado se encuentre un niño o niña, cuando incida en
la misma situación a la que se refiere el Artículo precedente,
en cuanto a sus autoridades superiores."

"ARTÍCULO 173.- Quien cause maltrato a un(a) niño(a)
sin llegar a incurrir en los delitos o faltas previstas por el
Código Penal, será sancionado(a) con multa que oscilará
entre medio (112) a dos (2) salarios mínimos en su valor más
alto, sin perjuicio de las medidas de protección que adopte
él Instituto Hondureño de la Niñez y la Familia (IHNFA).

Para los efectos de este Artículo, se considera maltrato a un
niño cuando se le hace víctima de violencia física o psíquica,
explotación, o cuando se le obliga a cumplir actividades
que impliquen riesgos para su salud física o mental o para su
condición moral o que impidan su concurrencia a los

establecimientos educativos y/o interfieran o amenacen su
desarrollo físico, psíquico y social.

Sin perjuicio de las penalidades establecidas para el(la)
autor(a) de maltrato infantil y las impuestas por el Código
Penal, todo niño o niña que resultare víctima de abuso sexual,
explotación sexual en espectáculos pornográficos, turismo
sexual, trata de personas, u otras prácticas sexuales ilegales,
recibirá atención médica, psicológica y/o psiquiátrica por
parte del Estado, a través del Instituto Hondureño de la Niñez
y la Familia (INHFA), en el marco de un Programa orientado
a lograr la prevención y rehabilitación de niños(as) víctimas."

"ARTÍCULO 180.- Créase el Sistema Especial de Justicia
para la Niñez Infractora, cuyo objeto es la rehabilitación
integral y reinserción a la familia y la comunidad, al cual
estarán sujetos los niños y niñas cuyas edades oscilen en el
rango de doce (12) hasta antes que cumplan los dieciochos
(18) años, a quienes se les suponga o sean declarados
Infractores de la Ley.

Los menores de doce (12) años de edad no delinquen, si se
les supone responsable de un Hecho Delictivo o Falta,
solamente se les brindará la protección especial que su caso
requiera, procurándose su formación integral por medio del
Instituto Hondureño la Niñez y la Familia (IHNFA).

El Sistema comprende el proceso para determinar la
existencia de la comisión de una infracción penal, la
identificación de su autor, el grado de su participación, la
aplicación de medidas alternativas o de simplificación
procesal, las sanciones y las reglas de aplicación de las
mismas.

El Instituto Hondureño de la Niñez y la Familia (IHNFA),
desarrollará un sistema de programas descentralizados y de
atención especializada, centrada en aspectos que promueven
su desarrollo integral. Para ello, se garantizará no trasladar a
quienes se les ha impuesto una medida o sanción, fuera de
su residencia habitual, habilitando programas locales tanto
de medidas no privativas de la libertad como de las que
impliquen privación de la misma. Se auxiliará de los gobiernos
municipales u organizaciones de la sociedad civil con quienes
suscribirá convenios de cooperación técnica y financiera y,
será co-responsable de su administración y supervisión.

El cumplimiento de los dieciocho (18) años de edad no
afectará la sujeción al Proceso de El Niño(a), ni a las
medidas o tratamientos y sanciones decretados por la
autoridad competente. No obstante, si estando sujeto a una
de ellas, comete éste un nuevo Hecho Delictivo, el Juez
competente lo pasará a la jurisdicción de los tribunales
comunes.

Para los efectos de este Título, se entenderá por "El Sistema":
El Sistema Especial de Justicia para Niñez Infractora y por
"El Niño(a)": el niño o niña que se encuentre en Proceso de
investigación por atribuírsele la comisión de un Hecho
Delictivo o haya sido Sancionado."

"ARTÍCULO 181.- Se garantiza que todo Niño(a) gozará
del pleno respeto de los derechos y garantías establecidas
en la Constitución de la República, los Tratados y Convenios
internacionales vigentes en Honduras, este Código y demás
leyes relacionadas con la materia.
Especialmente los siguientes:

a) No ser aprehendido, sino en virtud de orden de Juez
competente, salvo los casos de flagrancia dispuestos
por la Ley, conforme a las disposiciones especiales
de este Código; ser informado directamente, sin
demora y en forma clara y precisa sobre la causa de
su aprehensión, la autoridad que la ordenó y solicitar
la presencia inmediata de sus padres, tutores o
representantes legales;
b) Contar con la asistencia técnica de un Profesional del
Derecho, desde su aprehensión o presentación
voluntaria, al momento de rendir la respectiva
declaración, en su caso, y en cualquier etapa del
Proceso, hasta que la sentencia haya sido plenamente
ejecutada;
c) Comunicación efectiva inmediatamente a su
aprehensión, vía telefónica o por cualquier otro medio,
con su familia, referente afectivo, defensor o a quien
éste desee informar sobre tal hecho y, en su defecto,
se informe al Instituto Hondureño de la Niñez y la
Familia (IHNFA) para que tutele sus derechos;
d) Ser presentado al Ministerio Público o en su caso al
Juez competente, sin demora y en él plazo legal
establecido, así como a no ser conducido o
aprehendido en forma que dañe su dignidad o se le
exponga al uso de la fuerza, salvo que exista peligro
inminente de fuga o riesgo de daño a la integridad de
terceros;

e) Participar en el Proceso, ser oído y a que su opinión
sea tomada en cuenta en cualquier fase del mismo;
que se permita la plena participación de sus padres,
representantes legales o el que haga sus veces, salvo
que sea contrario a su Interés Superior. Para tales
efectos, de no poderse comunicar por sí mismo, a
que se le nombre traductor o intérprete idóneo;
f) Tener identificación personal o a que se le provea
una, en caso de faltarle;
g) Ser juzgado por un Juez natural, imparcial,
independiente, especializado y, que el Proceso sea
conocido por Jueces diferentes, de conformidad a
este Título;
h) Se respete, en todo procedimiento, los principios de
oralidad, contradicción, concentración, continuidad,
celeridad y reserva;
i) Solicitar al Ministerio Público, por medio de sus
representantes, que ejercite las acciones pertinentes
para deducir responsabilidad a los funcionarios y
empleados judiciales, administrativos o de cualquier
otro orden, que hayan abusado de su autoridad o
vulnerado sus derechos;
j) Impugnar cualquier resolución provisional o definitiva
que le afecte, conforme a este Código;
k) Se garantice la confidencialidad y uso de los registros
administrativos y judiciales que se lleven sobre su
sujeción a El Sistema. En consecuencia, queda
prohibida la emisión de certificados o constancias de
registros policiales o judiciales penales relacionados
con las denuncias y los procedimientos en trámite o
sobre la ejecución de sanciones, salvo los necesarios
para los fines del Proceso; y,
1) En el caso de las mujeres embarazadas y lactantes
que se les brinde la atención especial que requiere tal
condición."

"ARTÍCULO 182.- Corresponde al Ministerio Público el
ejercicio de la acción penal contra Los Niños(as), sin
perjuicio de la participación que este Código y el Código
Procesal Penal conceden al ofendido, tratándose de Falta
e Infracciones de acción privada y de acción pública
instancia privada.

La acción penal prescribe en un término equivalente al
máximo de duración de la pena señalada en la Ley para la
infracción que se le atribuya a El Niño(a), sin embargo, éste
en ningún caso podrá ser superior a ocho (8) años, plazo
que cuando se trate de Faltas, será de noventa (90) días.

Los plazos señalados para la prescripción de la acción, se
contarán a partir del día en que se cometió el Hecho Delictivo
o Falta o, desde el día en que se decretó la Suspensión del
Proceso, según corresponda.

Las sanciones prescribirán en un término igual al ordenado
para cumplirlas, el cual empezará a contarse desde que se
encuentre firme la resolución que la imponga; o bien, desde
que se compruebe que comenzó el incumplimiento.

El cumplimiento de la sanción impuesta de conformidad con
lo previsto por este Título, extingue la responsabilidad
derivada del Hecho Delictivo o Falta."

"ARTÍCULO 183.- Cuando en un proceso de jurisdicción
ordinaria, resulte implicado un Niño(a), el Juez se declarará
incompetente y sin tardanza lo pondrá a la orden del Juez de
la Niñez competente o al que haga sus veces, con el testimonio
del respectivo expediente.

De igual forma procederá El Juez de la Niñez, si en el
transcurso de un Proceso, se comprobare que la persona a
quien se le imputa el Hecho Delictivo excede la edad
establecida para el mismo, al momento de su comisión.

Si se tratara de un menor de doce (12) años de edad, el
Ministerio Público o el Juez, según el caso, lo pondrá
inmediatamente en libertad, entregándoselo a sus padres o
responsables. En ausencia de éstos o en caso que resulte
notoriamente perjudicial entregárselo a ellos, quedará a
disposición del Juez competente para que adopte las medidas
de protección que correspondan.

La violación de lo establecido en este Artículo dará lugar a
que se aplique al responsable la medida disciplinaria
correspondiente."

"ARTÍCULO 184.- Las acciones civiles para el pago de
perjuicios ocasionados por la infracción cometida por un
Niño(a), deberá promoverse ante la jurisdicción civil, de
acuerdo con las normas generales.

Con tal fin y conforme a las previsiones legales respectivas,
los juzgados ordinarios podrán solicitar al Juez competente
certificación de la sentencia condenatoria, con el sólo objeto
de fundamentar la acción civil correspondiente."

"ARTÍCULO 185.- Desde la vinculación al Proceso hasta
dictada la sentencia, no podrá transcurrir un plazo mayor de

seis (6) meses. Ante su vencimiento, sin que se haya emitida
la resolución definitiva del Proceso, el Juez ordenará el cese
de las Medidas Cautelares impuestas."

"ARTÍCULO 186.- Para los efectos de El Sistema, todos
los días y horas son hábiles y comenzarán a correr al día
siguiente de su notificación.

Las partes a cuyo favor se ha señalado un plazo o término
legal o judicial, sean éstos individuales o comunes, podrán
renunciarlo o abreviarlo mediante la expresa manifestación
de voluntad ante la autoridad competente.

Cuando el plazo sea común, se reputará que existe renuncia
o abreviación, mediante la expresa manifestación de voluntad
de las partes.

La renuncia de los plazos, no implicará una extensión del
plazo máximo de que se trate.

Las autoridades que sin causa justificada desatiendan los
asuntos que se sometan a su conocimiento incurrirán en
responsabilidad civil, penal y administrativa."

"ARTÍCULO 187.- Para los efectos de este Código, se
tendrá como representante legal de El Niño(a), a quién lo
sea de acuerdo con el Derecho vigente y, en su defecto, a la
persona que lo tenga bajo su cuidado en forma temporal o
permanente o, conforme a las disposiciones legales
aplicables, el Instituto Hondureño de la Niñez y la Familia
(IHNFA).

El Juez podrá, mediante resolución motivada, separar a unos
u otros del Proceso, si su participación resulta perjudicial."

"ARTÍCULO 188.- Serán de aplicación al Proceso, las
Medidas Cautelares previstas en el Artículo 173 del Código
Procesal Penal, con excepción de las reguladas en los
numerales 1), 2), 10) y 12), en todo cuanto no esté regulado
en este Título.

Las Medidas Cautelares serán impuestas mediante resolución
judicial motivada, deberán ser proporcionales a la infracción
y adecuadas a las circunstancias en que se encuentre El
Niño(a). Estas serán aplicadas por los períodos más breves
posibles, pero no excederán los seis (6) meses.

En todos los casos, el Fiscal fundamentará la solicitud de
Medidas y, mediante auto motivado, el Juez resolverá lo
procedente conforme a Derecho."

"ARTÍCULO 189. Solamente se podrá aplicar Medidas
Cautelares a El Niño(a), con el objetivo de:

a) Asegurar y garantizar su presencia en el Proceso;
b) Asegurar las pruebas; y,
c) Proteger a la víctima, denunciante o testigo."

"ARTÍCULO 190. La aprehensión de El Niño(a) será hecha
de conformidad con las disposiciones, principios, derechos
y procedimientos consignados en la Constitución de la
República, el presente Código y demás leyes aplicables.

Ningún Niño(a) podrá ser aprehendido sin orden escrita de
Juez competente, salvo el caso de flagrancia o fuga de un
centro especializado de internamiento en el que estuviera
cumpliendo una Medida Cautelar o Sanción.

El Ministerio Público lo pondrá a la orden del Juez
competente, dentro de las veinticuatro (24) horas siguientes
a su detención.

Quienes realicen la aprehensión deberán identificarse y
mostrar la orden judicial que los autoriza para ejecutarla, en
su caso, además deberán reducir al mínimo el uso de la fuerza
u otro medio que pueda ocasionarle daño.

El uso de la fuerza, así como de cualquier otro medio para la
aprehensión serán los adecuados a su condición y no podrán
atentar contra su dignidad. Queda prohibido el uso de
esposas, ataduras o medios de sujeción que atenten contra
su dignidad, salvo que exista peligro inminente de fuga o que
se cause daño o se le pueda causar a otras personas. Si es
necesario el uso de armas, deberá preferirse la incapacitantes
no letales."

"ARTÍCULO 191.- Se entenderá por flagrancia, cuando
El Niño(a) sea sorprendido:

a) En la comisión del Hecho Delictivo; o,
b) Inmediatamente después de cometerlo, es perseguido
materialmente.

En este caso, la detención se notificará inmediatamente a
sus padres, responsable o al Instituto Hondureño de la Niñez

y la Familia (IHNFA); cuando ello no sea factible, se les
notificará en el plazo más breve posible.

Se entenderá por responsables a las personas que lo tengan
bajo su cuidado en forma temporal o permanente.

Si es extranjero, se le asegurará la inmediata comunicación
con la autoridad consular de su país, de conformidad con
los Tratados y Convenios Internacionales vigentes en
Honduras.

Si la detención en flagrancia fuere realizada por agentes
policiales, éstos deben presentarlo inmediatamente ante el
Ministerio Público. Si es practicada por cualquier otra
persona, ésta debe entregarlo de inmediato a la autoridad
policial más próxima, la que procederá en la forma señalada
en este párrafo.

Si muestra señales de maltrato físico o psicológico,
inmediatamente el Ministerio Público dispondrá su evaluación
psico-fisica, quien de verificar las agresiones, abrirá la
investigación para determinar la causa y tipo de las lesiones.
así como sus responsables."

"ARTÍCULO 192.- Para los efectos de éste Código, la
medida prevista en el numeral 3 del Artículo 173 del Código
Procesal Penal, se denomina Detención Cautelar y se regirá
de conformidad a este Título.

La Detención Cautelar tiene carácter excepcional, por lo
que exclusivamente se aplicará si no fuere posible decretar
otra Medida Cautelar menos gravosa y solamente podrá
imponerse en los supuestos siguientes:

a) Que la infracción supuestamente cometida, haya
producido daño a la vida, la integridad personal, la
libertad personal o sexual de las personas o implique
grave violencia contra de otro u otros seres humanos
b) Que El Niño(a) haya rechazado expresa, reiterada e
injustificadamente el cumplimiento de otras Medidas
Cautelares o Sanciones impuestas por la autoridad
competente; o,
c) Que exista peligro de fuga u obstrucción de la
investigación.

En todos los casos, el Fiscal fundamentará la solicitud de
Medidas y, mediante auto motivado, el Juez resolverá lo
procedente conforme a Derecho.

A fin que la Detención Cautelar sea lo más breve posible,
los tribunales y los órganos de investigación deberán
considerar de máxima prioridad la tramitación efectiva de
los casos en que un Nino(a) se encuentre detenido.

La Detención Cautelar se cumplirá en los centros
especializados que al efecto tenga el Instituto Hondureño de
la Niñez y la Familia (IHNFA) o institución que corresponda.
Quienes cumplan esta medida deberán estar separados de
aquellos que hayan sido sentenciados con el internamiento.

En los centros de privación de libertad no se admitirá el
ingreso de Niños(as) sin orden previa y escrita de Juez
competente."

"ARTÍCULO 193.- No procederá la Detención Cautelar
contra Niños(as), cuando:

a) Estén en estado de embarazo;
b) Madres durante la lactancia de sus hijos; y,

c) Adolezcan de una enfermedad en su fase terminal o
degenerativa del sistema nervioso, de conformidad al
Decreto No.5-2007 de fecha 13 de marzo de 2007.

En tales casos, la Detención Cautelar se sustituirá por arresto
domiciliario o internamiento en un centro especializado
adecuado, según sean las circunstancias."

"ARTÍCULO 194.- Las partes podrán solicitar en cualquier
momento del Proceso hasta antes que quede firme la
sentencia, audiencia para la revocación o sustitución de la
Detención Cautelar por otra Medida menos gravosa, la cual
tramitará conforme al Artículo 188 del Código Procesal
Penal.

Dicha audiencia tendrá lugar dentro de las veinticuatro (24)
horas siguientes a la fecha en que se haya presentado la
respectiva petición, debiéndose celebrar con la
comparecencia de las partes y resolverse en la misma."

"ARTÍCULO 195.- Las Sanciones a los Niños(as) tienen
por objeto su incorporación a un proceso reeducativo, por
medio de,su formación integral y familiar, para lograr su
reinserción social y el pleno desarrollo de sus capacidades,
mediante su orientación y tratamiento.

El Juez podrá ordenar que su ejecución se realice en forma
simultánea o sucesiva, verificando que las mismas no sean
incompatibles entre sí.

Son sanciones aplicables las siguientes:

a) Sanciones no privativas de libertad:

1) Amonestación;
2) Libertad asistida;
3) Prestación de servicios a la comunidad; y,
4) Reparación del daño a la víctima.

b) Sanciones de orientación y supervisión:

1) Residir en un lugar determinado o cambiarse
de él;
2) Frecuentar o dejar de frecuentar determinados
lugares o personas;
3) Abstenerse de consumir drogas, otros
estupefacientes o bebidas alcohólicas, que
produzcan adicción o hábito;
4) Participar en programas especiales para la
prevención y tratamiento de adicciones;
5) Someterse a programas educativos con el fin
de comenzar o finalizar la escolaridad básica,
si no la ha cumplido, aprender una profesión u
oficio o seguir cursos de capacitación en el lugar
o la institución que determine el Juez;
6) Someterse, si es necesario, a tratamiento
médico o psicológico, de preferencia en
instituciones públicas; y,
7) Asistir o integrarse a los correspondientes
sistemas o centros educativos.

c) Sanciones privativas de libertad:
1) La privación de libertad domiciliaria;
2) Régimen de Semi-libertad; y,
3) La privación de libertad en centros certificados
o especializados del Instituto Hondureño de la
Niñez y la Familia (IHNFA) para Sancionados.

"ARTÍCULO 196.- La Amonestación es el llamado de
atención al Sancionado, que el Juez le hará en audiencia
oral, exhortándolo para que en lo sucesivo se acoja a las
normas familiares y de convivencia social que éste establezca
expresamente. Cuando corresponda, deberá advertir a los

padres, representantes legales o responsables, sobre la
conducta infractora de El Niño(a) y les solicitará intervenir
para que el amonestado respete las normas legales y sociales
de convivencia.

La Amonestación deberá ser clara y directa, de manera que
tanto El Niño(a) como sus representantes legales o
responsables, comprendan la ilicitud de los hechos cometidos
así como la responsabilidad de los padres, representantes o
responsables en el cuidado de sus hijos o representados."

"ARTÍCULO 197.- Libertad Asistida es la medida
educativa, socializadora e individualizada, que consiste en
otorgar libertad al Sancionado, bajo la supervisión y
orientación de personal especializado del Instituto Hondureño
de la Niñez y la Familia (IHNFA), con la finalidad de
desarrollar sus habilidades, destrezas, capacidades y
aptitudes, especialmente en áreas educativas y de formación
laboral, para lograr su desarrollo personal y su reinserción
familiar y social.

Esta medida no podrá ser inferior a seis (6) meses ni superior
a dos (2) años."

"ARTÍCULO 198.- La Prestación de Servicios a la
Comunidad consiste en la realización de tareas de interés
general por parte del Sancionado, la cual se prestará de
modo gratuito en entidades de asistencia pública o privada
sin fines de lucro, orientadas a la asistencia social, tales como
hospitales, escuelas, iglesias, municipalidades, cuerpos de
bomberos, cruz roja y otras instituciones similares, siempre
y cuando éstas tareas no atenten contra su salud, o integridad
física y psicológica, no interfieran con sus estudios o su trabajo
y sean compatibles con la ley que regule la respectiva
actividad.

Las actividades asignadas deberán guardar proporción con
las aptitudes del Sancionado y con su nivel de desarrollo,
tomando en cuenta el estudio técnico correspondiente.
Podrán ser cumplidas durante una jornada mínima de seis
(6) y máxima de ocho (8) horas semanales, en los días que
goce de tiempo libre, o en días inhábiles. La prestación de
servicio a la comunidad no podrá ser inferior a seis (6) meses
ni superior a un (1) año."

"ARTÍCULO 199.- La Reparación del Daño a la Víctima
tiene por finalidad resarcir el daño causado, asignando al

Sancionado una obligación de dar o de restituir la cosa
dañada por su conducta o entregar un valor sustituto.

Solamente podrá imponerse, si la víctima y el Sancionado
hayan manifestado su acuerdo.

Si ambas partes acuerdan sustituir la obligación de hacer
por una suma de dinero, el Juez procederá a fijar la cuantía
que considere equivalente a los daños y perjuicios
ocasionados por el Hecho Delictivo.

En la Resolución respectiva deberá estipularse el plazo de
cumplimiento, el cual no podrá ser mayor a un (1) año.

El Juez a cargo de la Ejecución declarará que la Sanción se
encuentra cumplida, cuando el daño haya sido reparado en
la forma acordada."

"ARTÍCULO 200.- Las Órdenes de Orientación y
Supervisión consisten en reglas de conducta o prohibiciones
impuestas por el Juez y supervisadas por el Instituto
Hondureño de la Niñez y la Familia (IHNFA), para promover
y asegurar la formación integral y reinserción social de El
Niño(a).

Su duración no será menor de tres (3) meses ni superior a
dos (2) años.

El Juez de Ejecución podrá modificar las órdenes impuestas
en caso de incumplimiento."

"ARTÍCULO 201.- La Privación de Libertad es de
carácter excepcional, la cual deberá utilizarse cuando no
sea posible aplicar ninguna otra Sanción, en los casos en los
que el Sancionado sea declarado responsable por un Hecho
Delictivo grave, en los términos que establecen los Artículos
204 y 205 y demás disposiciones aplicables de este Título."

"ARTÍCULO 202.- La Privación de Libertad Domiciliaria
consiste en el arraigo del Sancionado a su domicilio y con su
familia.

De no poder cumplirse en su domicilio, se practicará en la
casa de cualquier familiar y, en su defecto, podrá ordenarse
en una vivienda o en centro estatal, de comprobada
idoneidad.

Esta no debe afectar el cumplimiento del trabajo, ni la
asistencia al centro educativo a que concurra el Sancionado.

No será menor a uno (1) ni superior a nueve (9) meses."

"ARTÍCULO 203.- El Régimen de Semi-Libertad
consistirá en que El Niño(a) deberá cumplir la sanción
privativa de libertad durante días inhábiles, en el centro
especializado que determine la respectiva Sentencia, sin
perjuicio de poder realizar actividades fuera del mismo.

Esta no debe afectar el cumplimiento del trabajo, ni la
asistencia al centro educativo al que concurra el Sancionado.

Esta Sanción no podrá dictarse por un plazo inferior a dos
(2) ni superior a ocho (8) meses."

"ARTÍCULO 204.- La Privación de Libertad en un Centro
Estatal Especializado o certificado por el Instituto Hondureño
de la Niñez y la Familia (IHNFA), es de carácter excepcional,
podrá ser aplicada cuando:

a) Se trate de una conducta realizada mediante grave
amenaza o violencia hacia las personas, la vida, la
libertad individual, la libertad sexual, robo agravado
y tráfico de estupefacientes; y,
b) Se trate de delitos dolosos y graves, sancionados por
la Ley, con una pena mínima superior a ocho (8) años.

"ARTÍCULO 205.- La Privación de Libertad en un Centro
Estatal Especializado o certificado por el Instituto Hondureño
de la Niñez y la Familia (IHNFA), se ajustará a las reglas
especiales siguientes:

a) Cuando la edad del infractor oscile entre dieciséis
(16) y los dieciocho (18) años no cumplidos, la
privación de libertad no podrá ser inferior a seis (6)
meses ni exceder los ocho (8) años;
b) Cuando la edad del infractor oscile entre catorce (14)
y quince (15) años, la privación de libertad no podrá
ser inferior a cuatro (4) meses ni exceder los cinco
(5) años; y,
c) Cuando la edad del infractor oscile entre doce (12) y
trece (13) años, la privación de libertad no podrá ser
inferior a un.(1) mes ni superior a tres (3) años.

El cumplimiento de esta Sanción se llevará a cabo de
acuerdo al régimen que el Juez señale, tomando en cuenta

sus circunstancias personales, familiares, sociales y
educativas.
Para la individualización de la sanción, el Juez, deberá
considerar el período de Detención Cautelar al que hubiera
sido sometido."

"ARTÍCULO 206.- El Juez podrá ordenar la Suspensión
de la Ejecución Condicional de la sanción privativa de
libertad, por un período de prueba de tres (3) años, tomando
en cuenta los supuestos siguientes:

a) La sanción no exceda de dos (2) años;
b) Sean notorios los esfuerzos de El Niño (a) por reparar
el daño causado;
c) La menor gravedad de los hechos cometidos; y,
d) La conveniencia para su desarrollo educativo o
laboral.

Si durante la Suspensión de la Ejecución Condicional fuere
encontrado responsable de cometer un nuevo Hecho
Delictivo, se le revocará el beneficio y cumplirá con la Sanción
impuesta originalmente. Si no incurriera en un nuevo Hecho
Delictivo durante el período de prueba y cumpliere sus
condiciones, se tendrá por extinta la Sanción.

"ARTÍCULO 207.- Al menos cada tres (3) meses, el Juez
de Ejecución deberá revisar de oficio o a solicitud de parte,
o por recomendación técnica del equipo multidisciplinario
que supervisa la ejecución de la Sanción, la posibilidad de
sustituirla por otra menos gravosa, de conformidad con el
desenvolvimiento de El Niño(a) durante el cumplimiento de
su Sanción.

Este período no será tomado en cuenta, cuando las
circunstancias del infractor ameriten la revisión inmediata de
la Sanción."

"ARTÍCULO 208.- No podrá atribuirse al Sancionado el
incumplimiento de las sanciones que se le hayan impuesto,
cuando sea el Estado quien haya incumplido en la creación
y organización de los programas para el seguimiento,
supervisión y atención integral de éstos. Caso en el cual, se
deducirá la responsabilidad administrativa, civil o penal que
corresponda."

"ARTÍCULO 209.- El Proceso Para la Niñez Infractora
de La Ley tiene como objetivo establecer la existencia jurídica
de una conducta tipificada como Hecho Delictivo o Falta,

quién es su autor, el grado de responsabilidad de éste y, en
su caso, determinar la aplicación de las sanciones que
correspondan.

Este se llevará a cabo de acuerdo a lo dispuesto en este
Código y, supletoriamente, conforme al Código Procesal
Penal, orientándose por los principios rectores y demás
disposiciones de especialidad establecidas en este Título.

Comprenderá las Fases: Preparatoria, Intermedia y de
Juicio, así como las Formas Alternativas o Simplificadas del
Proceso y los presupuestos de procedibilidad y aplicación
de los recursos.

No se aplicará la figura de procedimiento abreviado en
materia penal para Niños(as)."

"ARTÍCULO 210.- El Estado creará progresivamente la
Jurisdicción Especial de la Niñez Infractora de La Ley, la
que estará integrada por:

a) Jueces de Garantías;
b) Jueces de Juicio;
c) Jueces de Ej ecución; y,
d) Tribunales de Apelaciones.

En tanto ésta se crea, el Estado garantizará que al funcionario
que haya ejercido la función de Juez de Garantías en un
determinado Proceso, no se le asigne el conocimiento de su
juzgamiento ni su ejecución.

Para tales efectos, por medio de las instancias respectivas,
adoptará las medidas generales y particulares que aseguren
una adecuada distribución de competencias entre los Jueces
de Letras de Niñez y los Jueces de Letras Seccionales."

"ARTÍCULO 211. Corresponde al Juez de Garantías:

a) Conocer de las Fases Preparatoria e Intermedia, de
conformidad a lo establecido en este Título;
b) Velar por el respeto de los derechos fundamentales
de los Niños(as) en Proceso;
c) Dictar, en los plazos y términos previstos, la
Vinculación al Proceso y las Medidas Cautelares
aplicables, cuando correspondiere;
d) Llamar y presidir la audiencia intermedia y dictar el
auto de Apertura a Juicio;

e) Aprobar la solicitud de Suspensión del Proceso a
Prueba y sus condiciones, así como resolver sobre la
revocación de la misma y la reanudación del Proceso
cuando procediere;
f) Ordenar, cuando proceda, la evacuación de elementos
de prueba con las formalidades de prueba anticipada
g) Declarar la extinción de la acción penal o la
reanudación del Proceso por incumplimiento de la
Conciliación;
h) Decidir sobre el uso de las formas alternativas de
solución de conflictos establecidas en este Título; e,
i) Las demás que se disponen en este Código."

"ARTÍCULO 212.- Corresponde al Juez de Juicio:

a) Presidir la Audiencia de Juicio y resolver los asuntos
sometidos a su conocimiento, conforme a los plazos
y términos previstos;
b) Declarar la responsabilidad penal o inocencia de
Niños(as) en Proceso;
c) Imponer las sanciones, atendiendo a los principios
rectores descritos en este Código, la proporcionalidad
y racionalidad de la conducta, así como a la
circunstancias de gravedad de la conducta
características y necesidades de los Niños(as); y,
d) Las demás responsabilidades que se disponen en este
Código."

"ARTÍCULO 213.- Corresponde al Juez de Ejecución:

a) Controlar que la ejecución de toda Sanción se
conforme con la sentencia que la impuso, garantizando
la legalidad y demás derechos y garantías que asisten
al Sancionado;
b) Revisar las sanciones de oficio o a solicitud de parte
al menos cada tres (3) meses, para cesarlas
modificarlas o sustituirlas por otras menos gravosas
cuando no cumplan con los objetivos para los que
fueron impuestas o por ser contrarias al proceso de
reinserción social;
c) La vigilancia y control de la ejecución de las sanciones
así como velar por la correcta aplicación de las normas
que regulan el régimen de privación de libertad;
d) Controlar el otorgamiento o denegación de cualquier
beneficio relacionado con las sanciones impuestas;
e) Ordenar la cesación de la sanción una vez transcurrido
el plazo o condición fijado por la sentencia y enviar

las comunicaciones a la institución estatal responsable
de la Ejecución;
f) Atender las solicitudes que hagan los Sancionados,
dar curso a sus quejas cuando así lo amerite la
situación y resolver lo que corresponda;
g) Corregir los abusos y desviaciones que puedan
producirse en el cumplimiento de los preceptos
contenidos en este Código, relacionados con sus
competencias;
h) Visitar los centros de Ejecución o cumplimiento de la
sanción privativa de libertad, al menos una (1) vez al
mes y formular las recomendaciones necesarias;
i) Conocer y resolver los reclamos sobre las decisiones
de los órganos directivos, administrativos y técnicos
de los Centros Especializados de Privación de
Libertad; y,
j) Las demás responsabilidades que éste Código y las
leyes le atribuyan."

"ARTÍCULO 214.- Los Tribunales de Apelaciones,
resolverán los recursos de apelación en esta materia, en el
término territorial que les corresponda, conforme a lo
dispuesto en el Código Procesal Penal y las disposiciones
especiales previstas en este Título.

Mientras se crean estas instancias, la Corte de Apelaciones
Ordinaria respectiva conocerá de la vía recursiva en esta
materia, conforme a la competencia por razón del territorio."

"ARTÍCULO 215.- El Ministerio Público, la Defensa
Pública, La Policía Nacional y otros funcionarios intervinientes
en el Proceso, tendrán en materia de la Jurisdicción Especial
de la Niñez Infractora de la Ley, los deberes, facultades y
atribuciones que en este Título, en el Código Procesal Penal
y en sus regulaciones propias se disponga."

"ARTÍCULO 216.- Son Formas Alternativas o
Simplificadas de Solución de los Conflictos sometidos a la
Jurisdicción Especial de la Niñez, las siguientes:

a) Criterio de Oportunidad;
b) Conciliación; y,
c) Suspensión del Proceso a Prueba".

"ARTÍCULO 217.- El representante del Ministerio Público
deberá ejercer la acción penal en todos los casos en que
sea procedente, con arreglo a las disposiciones de este
Código. No obstante, podrá solicitar que se prescinda, total

o parcialmente de la persecución penal, que se limite a alguno
o a varios hechos o a solamente alguno de los Niños(as)
que supuestamente participaron en su realización, en los
casos siguientes:

a) Cuando la pena aplicable al Hecho Delictivo no
exceda de cinco (5) años, la afectación del interés
público sea mínima y, de los antecedentes y
circunstancias personales de los Niños(as), se infiera
su falta de peligrosidad;
b) Se trate de un hecho insignificante, de mínima
culpabilidad del supuesto autor o partícipe o ínfima
contribución de éste, salvo que afecte seriamente un
interés público;
c) El Niño(a) haya sufrido a consecuencia del hecho,
grave daño físico o psíquico que torne
desproporcionada la aplicación de una Sanción o
cuando en ocasión de una infracción culposa haya
sufrido un daño moral de difícil superación;
d) El Niño(a), hubiera hecho cuanto estaba a su alcance
para impedir los efectos de la consumación del Hecho
Delictivo;
e) Cuando la pena a aplicar por un delito, sea de menor
importancia, en comparación con la que se le impuso
o se le debe imponer a la misma persona por otro
Hecho delictivo conexo; y,
f) Cuando se trate de Hechos Delictivos de delincuencia
organizada, criminalidad violenta protagonizada por
grupos o bandas de delincuentes, otros delitos graves
de realización compleja que dificulte su investigación
y persecución, y colabore eficazmente con la
investigación, brinde información especial para evitar
que continúe el Hecho Delictivo o se perpetren otros
o ayude a esclarecer el hecho investigado u otros
conexos o proporcione información útil para probar
la participación de terceras personas, siempre que la
acción penal de la cual se trate resulte más leve que
los hechos punibles cuya persecución facilite o cuya
continuación evite.

El Fiscal del caso deberá aplicar el Criterio de Oportunidad
sobre la base de razones objetivas y sin discriminación,
valorando las pautas descritas en cada caso individual, salvo
en el supuesto contemplado por el inciso f) donde se
procederá conforme las reglas generales que al efecto haya
dictado el Ministerio Público.

El Ministerio Público velará que el daño causado sea
razonablemente reparado.

Para la tramitación del Criterio de Oportunidad, se estará a
lo dispuesto en el Código Procesal Penal."

"ARTÍCULO 218.- Procederá la Conciliación entre la
víctima y El Niño(a), en todo momento y hasta antes de
dictarse el auto de Apertura a Juicio.

Podrán solicitarla tanto el Ministerio Público o las partes,
igualmente en el caso de las Faltas, los Hechos Delictivos
de acción privada, de acción pública dependientes de
instancia particular como en los que admitan la Suspensión
del Proceso a Prueba, a cuyo efecto el Juez les hará saber
que cuentan con la posibilidad de conciliar y si están de
acuerdo y preparados, practicará la Conciliación.

La conciliación se rige por los principios de: voluntariedad
de las partes, confidencialidad, flexibilidad, neutralidad,
imparcialidad, equidad, legalidad y honestidad.

La información que se genere en los procedimientos
respectivos no podrá ser utilizada en perjuicio de las partes
dentro del Proceso o del Proceso Penal, en su caso.

Para los efectos de la Conciliación el Juez podrá aprobar el
asesoramiento y el auxilio de personas o entidades
especializadas en la materia.

No se aprobará la conciliación cuando se tengan fundados
motivos para estimar que alguno de los intervinientes no se
encontraba en condiciones de igualdad para negociar o
hubiera actuado bajo coacción o amenaza.

Una vez propuesta la Conciliación, el Juez señalará la
audiencia respectiva dentro de un plazo que no podrá
exceder los veinte (20) días.

El plazo fijado para el cumplimiento de las obligaciones
pactadas no podrá ser superior a tres (3) meses; durante el
cual se suspenderá el trámite del Proceso y de la prescripción
de la acción penal. Comenzará a contarse a partir del día
siguiente de la homologación del acuerdo.

No se podrá conciliar cuando se trate de los Hechos
Delictivos siguientes:

a) De naturaleza dolosa contra la vida y las lesiones
graves;
b) Contra la libertad e integridad física, psicológica y
sexual;
c) Cuando el Sujeto Pasivo sea menor de dieciocho (18)
años de edad; y,
d) Sea producto de redes de crimen organizado."

"ARTÍCULO 219.- Procederá la Suspensión del Proceso
a Prueba en los casos en que el máximo de la pena aplicable
al Hecho Delictivo de que se trate no exceda de nueve (9)
años y siempre que no se encuentre o haya gozado de este
beneficio en otro Proceso.

La solicitud podrá ser presentada por El Niño(a) o por el
Fiscal, en cualquier momento hasta antes del auto de
Apertura a Juicio."

"ARTÍCULO 220.- La solicitud de Suspensión del Proceso
a Prueba deberá contener un Plan de Reparación del Daño
causado por el Hecho Delictivo y un detalle de las
condiciones que El Niño(a) estaría dispuesto a cumplir. Este
podrá consistir en una indemnización equivalente a la
reparación del daño que, en su caso, pudiera llegar a
imponerse o una reparación simbólica, inmediata o por
cumplir a plazos.

Para el otorgamiento de la suspensión será condición
indispensable que El Niño(a) admita el hecho que se le
atribuye.
El trámite no podrá exceder de veinte (20) días, contados a
partir de la solicitud.

La resolución que declare inadmisible la solicitud de
Suspensión del Proceso a Prueba será recurrible".

"ARTÍCULO 221.- El Juez oirá en audiencia al peticionario
sobre la solicitud de Suspensión del Proceso a Prueba, así
mismo a las partes, debiendo resolver de inmediato, salvo
que difiera su decisión para nueva audiencia, la que se realizará
dentro de un plazo no mayor de diez (10) días.

La resolución fijará las condiciones bajo las cuales se
suspende el proceso o se rechaza la solicitud; en el primer
caso aprobará o modificará el plan de reparación con el
acuerdo entre las partes. La sola falta de recursos de El
Niño(a) no podrá aducirse para rechazar la solicitud.

Si se rechaza la solicitud, la admisión de los hechos por
parte de El Niño(a) no tendrá valor probatorio alguno."

"ARTÍCULO 222.- El Juez fijará el plazo de Suspensión
del Proceso a Prueba, el cual no podrá ser inferior a seis (6)
meses ni mayor a un (1) año, asimismo, determinará la
imposición de una o varias reglas de cumplimiento, entre
ellas las siguientes:

a) Residir en un lugar determinado;
b) Frecuentar o dejar de frecuentar determinados lugares
o personas;
c) Abstenerse de consumir drogas, otros estupefacientes
o bebidas alcohólicas;
d) Participar en programas especiales para la prevención
y tratamiento de adicciones;
e) Comenzar o finalizar la escolaridad básica si no la ha
cumplido, aprender una profesión u oficio o seguir
cursos de capacitación en el lugar o la institución que
determine el Juez;
f) Prestar servicio social comunitario a favor del Estado
o de instituciones públicas de servicio;
g) Someterse a tratamiento médico o psicológico, de
preferencia en instituciones públicas;
h) Permanecer en un trabajo o empleo, o adquirir, en el
plazo que el Juez determine, el entrenamiento en un
oficio, industria o profesión, si no tiene medios propios
de subsistencia;
i) Someterse a la vigilancia que determine el Juez;
j) No conducir vehículos automotores o de otra índole;
k) Abstenerse de viajar al extranjero; y,
I) Cumplir con los deberes de deudor alimentario.

Cuando se acredite plenamente que El Niño(a) no puede
cumplir con alguna de las reglas anteriores, por ser contrarias
a su salud, sus creencias religiosas o alguna otra causa de
especial relevancia, el Juez podrá sustituirlas fundada y
motivadamente, por el cumplimiento de otra u otras análogas
que resulten razonables.

El Juez prevendrá a El Niño(a) sobre las reglas de conducta
impuestas y las consecuencias de su inobservancia.

Contra la resolución que deniegue la Suspensión del Proceso
a Prueba, procederá el recurso de Apelación. La resolución
que admita esta figura, sólo será apelable, cuando las reglas
fijadas resulten manifiestamente excesivas o que el Juez se
haya excedido en sus facultades.

En ningún caso el Juez podrá imponer reglas más gravosas
que las solicitadas por el Fiscal."

"ARTÍCULO 223.- Ante el incumplimiento injustificado del
plan de reparación o las reglas impuestas, de oficio o a petición
de parte, el Juez llamará a una audiencia en la que se resolverá
fundada y motivadamente sobre la revocación de la
Suspensión del Proceso a Prueba.

Si mediara justificación válida, podrá reprogramar el plazo
con la finalidad de asegurar el cumplimiento del término
decretado, no obstante, esta no excederá los tres (3) meses
adicionales, y solo podrá concederse por una vez."

"ARTÍCULO 224.- En los asuntos suspendidos en virtud
de las disposiciones correspondientes a esta Sección, el Fiscal
tomará las medidas necesarias para evitar la pérdida,
destrucción o ineficacia de los medios de prueba conocidos y
las que soliciten las partes."

"ARTÍCULO 225.- Los efectos de la Suspensión del
Proceso a Prueba cesarán mientras El Niño(a) esté privado
de su libertad por otro Proceso, pero si goza de libertad, el
plazo seguirá su curso, no obstante no podrá decretarse la
extinción de la acción penal sino cuando quede firme la
resolución que lo exime de responsabilidad por el nuevo
hecho.

La revocatoria de la Suspensión del Proceso a Prueba no
impedirá el pronunciamiento de una sentencia absolutoria ni
la concesión de algunas de las medidas sustitutivas a la
privación de libertad, cuando fueren procedentes."

"ARTÍCULO 226.- La Suspensión del Proceso a Prueba
no extingue las acciones civiles de la víctima o de terceros.
Sin embargo, si la víctima recibe pagos en virtud de la
procedencia de la suspensión, ellos se destinarán a cuenta de
la indemnización por daños y perjuicios que le pudiere
corresponder.

Transcurrido el plazo que se fije sin que la suspensión fuere
revocada y cumplido el plan de reparación, se extinguirá la
acción penal y el Juez deberá dictar de oficio o a petición de
parte, el sobreseimiento definitivo.

Durante el período de Suspensión del Proceso a Prueba de
que tratan los artículos precedentes, quedará suspendida la
prescripción de la acción penal."

"ARTÍCULO 227.- El Proceso Para la Niñez Infractora de
Ley, estará compuesto por las fases siguientes:

a) Preparatoria;
b) Intermedia; y,
c) Juicio.

La Fase Preparatoria comprenderá los actos siguientes:

a) Denuncia;
b) Investigación;
c) Acusación; y,
d) Vinculación al proceso.

La Fase Intermedia comprenderá los actos siguientes:

a) Interposición de incidentes, excepciones y nulidades;
b) Formalización de la acusación y contestación de
cargos; y,
c) Auto de apertura a Debate.

La Fase de Juicio integra los actos siguientes:

a) Preparación del Debate;
b) Audiencia de Debate;
c) Individualización de la Sanción; y,
d) Sentencia."

"ARTÍCULO 228.- La Fase Preparatoria del Proceso Para
la Niñez Infractora de Ley iniciará a través de la denuncia,
siéndole aplicables las disposiciones conducentes del Código
Procesal Penal.

De igual manera serán aplicables tales disposiciones, con
respecto a la investigación de los Hechos Delictivos atribuidos
a El Niño(a).

En ambos casos, siempre y cuando no contravengan los
principios y derechos inherentes de esta materia."

"ARTÍCULO 229.- Concluidas las investigaciones iniciales,
el Ministerio Público podrá:

a) Ordenar el archivo del respectivo expediente;
b) Formular por escrito al Juez, la solicitud para que le
autorice la Suspensión del Proceso a Prueba;
c) Solicitar sobreseimiento definitivo; o,
d) Presentar la respectiva Acusación.

En el caso previsto en el inciso b) de este Artículo, el Juez
resolverá sin más trámite la solicitud correspondiente."

"ARTÍCULO 230.- En caso que el Ministerio Público
decida presentar Acusación, si El Niño(a) se encuentra
detenido por flagrancia será puesto a la orden del Juez
competente dentro de las veinticuatro (24) horas siguientes
a su detención; en caso de ser detenido por orden de captura
emitida por autoridad judicial deberá ser puesto
inmediatamente a la orden del Juez de la Niñez o el que
haga sus veces.

Una vez que El Niño(a) se encuentre a disposición del Juez
competente, inmediatamente se celebrará audiencia de
vinculación al proceso, en la que el Ministerio Público
formulará su acusación, solicitará su vinculación a proceso
o la solicitud de aplicación de las medidas de simplificación
en su caso y las Medidas Cautelares que considere
procedentes. Asimismo de ser menor de doce (12) años
actuará de conformidad a Ley.

El Ministerio Publico en esta audiencia deberá acreditar
mínimamente, la existencia del Hecho Delictivo y de la
probable participación de El Niño(a) en éste.

En la misma audiencia, si El Niño(a) desea hacerlo, se le
recibirá su declaración inicial.

Esta audiencia se realizará con la presencia de El Niño(a)
su Defensor, el Fiscal y el acusador privado, la ausencia de
este último no impedirá la realización de esta audiencia.

Con anterioridad a la audiencia o durante el transcurso de
ella, El Niño(a) o su defensor podrán solicitar la suspensión
de la audiencia de vinculación, por un plazo de hasta setenta
y dos (72) horas para aportar elementos de convicción antes
de que se resuelva su situación jurídica o se pronuncie el
Juez sobre la Medida Cautelar.

La prolongación de la detención en su perjuicio será
sancionada por la ley Penal.

Finalizada la intervención de las partes y con base en los
elementos de prueba desarrollados, de inmediato el Juez
resolverá, dictando:

a) Sobreseimiento provisional;
b) Sobreseimiento definitivo;
c) Con lugar la vinculación al Proceso; o
d) La imposición o no de las Medidas Cautelares
procedentes.

En el caso del literal a) el plazo para que el Ministerio Público
pueda promover la persecución del Proceso será de dos
(2) años seis (6) meses.

Resuelta la vinculación al Proceso, el Juez ordenará la
celebración de la Audiencia Intermedia, fijando su fecha en
un plazo no mayor a treinta (30) días, quedando al efecto,
las partes debidamente citadas.

No obstante, en los casos complejos, a petición del
Ministerio Público ese plazo podrá prorrogarse hasta treinta
(30) días adicionales, por una sola vez. Se entenderán por
casos complejos aquéllos que involucren: múltiples hechos,
imputados o víctimas y los que en cuanto a las investigaciones
"requieran el cumplimiento de actuaciones en el exterior o la
producción de prueba de difícil realización. En este último
caso, el Fiscal deberá detallarlas diligencias de investigación
pendientes de finalizar, a efecto que el Juez valore el tiempo
necesario de la prórroga, el que en ningún caso excederá el
tiempo máximo establecido.

Si considera que la Vinculación al Proceso es improcedente,
ordenará de inmediato la libertad de El Niño(a)."

"ARTÍCULO 231.- Los Procesos contra Niños(as) son
de alta prioridad y especial interés público, con plena
salvaguarda del derecho que tienen a ser escuchados. Bajo
pena de nulidad, su declaración debe ser rendida conforme
a las reglas siguientes:

a) Únicamente ante Juez competente;
b) Voluntariamente, de manera que sólo se puede tomar,
cuando lo haya consultado con su Defensor;
c) Asistida, de modo que se realice con la asistencia de
su Defensor;
d) Se dará prioridad a la declaración, procurando que
el tiempo entre la presentación y la declaración sea el
menor posible;
e) Será breve, de modo que la comparecencia ante el
Juez tome estrictamente el tiempo requerido,
considerando inclusive períodos de descanso para El
Niño(a);

f) Será eficiente, por lo que la autoridad tendrá que
preparar la comparecencia con antelación a fin de
obtener la información que requiera para el ejercicio
de sus funciones, en el menor número de sesiones
que sea posible; y,
g) Se evacuará en presencia de sus padres, responsables
o funcionarios competentes del Instituto Hondureño
de la Niñez y la Familia (IHNFA), a cargo de la
protección a los niños y niñas, siempre que éste o su
defensor lo soliciten y el Juez lo estime conveniente.

Las mismas reglas se observarán, en lo aplicable, en las
entrevistas que voluntariamente tenga un Niño(a), con el
Ministerio Público."

"ARTÍCULO 232.- La Fase Intermedia se desarrollará en
una audiencia a celebrarse el día y hora señalados, la cual
comprenderá los actos siguientes:

a) Interposición de incidentes, excepciones y nulidades;
b) Solicitud de sobreseimiento provisional o definitivo;
c) Formalización de la acusación y contestación de
cargos; y
d) Auto de apertura a debate.

La acusación deberá contener:
a) Una breve y precisa relación de los Hechos Delictivos
imputados;
b) La calificación legal de los hechos, conforme lo
dispuesto en la Ley;
c) El grado de participación que supuestamente tuvo El
Niño(a); y,
d) La Sanción que considera debe aplicarse.

En caso de duda, la calificación podrá recaer
alternativamente sobre tipos delictivos que se excluyan entre
sí."

"ARTÍCULO 233.- El Juez notificará, a las partes su
resolución sobre los puntos planteados, en audiencia que se
celebrará dentro de los tres (3) días siguientes a la Audiencia
Intermedia.

De resultar procedente la acusación, dictará Auto de
Apertura a Juicio, caso contrario dictará sobreseimiento
provisional o definitivo, según sea el caso, de conformidad
con las reglas establecidas en el Código Procesal Penal.

De decretarse el Auto de Apertura, dentro de las veinticuatro
(24) horas siguientes, el Juez ordenará la remisión de las
diligencias al Juez que deba conocer la Fase de Juicio."

"ARTÍCULO 234.- La Fase de Juicio integra los actos
siguientes:

a) Preparación del Debate;
b) Audiencia de Debate;
c) Individualización de la Sanción; y,
d) Sentencia."

"ARTÍCULO 235.- Recibidas las diligencias, el Juez de
Juicio señalará audiencia de proposición de prueba, dentro
de los cinco (5) días siguientes, citando a las partes para tal
efecto. Los medios de prueba serán propuestos con
indicación de los hechos o circunstancias que se pretenda
probar.

En esta audiencia, las partes presentarán la lista de los testigos
y peritos con indicación de sus nombres y apellidos, profesión
u oficio y dirección exacta, señalando los hechos sobre los
cuales deberán ser examinados durante el debate.

Asimismo propondrán los documentos y demás medios con
los que pretenda probar las pretensiones deducidas en el
Juicio y señalarán en su caso, el lugar en que se encuentran.

Propuestas las pruebas y oídas las alegaciones que al
respecto hagan las partes, el Juez resolverá mediante auto
motivado sobre su admisión, en la misma audiencia o en el
plazo de los tres (3) días.

Solamente podrán ser rechazados los medios de prueba
manifiestamente impertinentes, inútiles o desproporcionados
en relación con la finalidad probatoria que se pretende, así
como los meramente dilatorios o, cuando se trate de prueba
ilícita.

En el acto que notifique la resolución, el Juez señalará fecha
y hora para la Audiencia de Debate, la que tendrá lugar
dentro de los quince (15) días siguientes a la misma."

"ARTÍCULO 236.- Sin perjuicio de lo previsto en este
Título, la Audiencia de Debate se regirá por lo prescrito por
los artículos 319a 346 del Código Procesal Penal, excepto
los artículos 335,336 y 338 del mismo.

La Audiencia de Debate no puede suspenderse por más de
diez (10) días, debiendo procederse conforme lo dispuesto
en el Artículo 312 del Código Procesal Penal.

Concluidos los alegatos finales y consultado El Niño(a) sobre
si desea agregar algo más o no, el Juez se retirará a fin de
realizar los análisis y valoraciones que considere necesarios
para dictar la Sentencia conforme a Derecho.

La audiencia se reanudará para notificar a las partes la
resolución respectiva, el Juez explicará en forma clara y
sencilla los razonamientos de su decisión.

En caso que El Niño(a) sea declarado absuelto, el Juez
ordenará dejar sin efecto la Medida Cautelar impuesta, una
vez firme la Sentencia.

Si fuere declarado culpable, inmediatamente el Juez cederá
la palabra a las partes, para ofrecer prueba sobre la
individualización de la Sanción a imponer, conforme a las
reglas aplicables a la Audiencia de Debate.

La Sentencia deberá fundamentarse en las pruebas
evacuadas, pero teniendo siempre en consideración el medio
social y las condiciones en que se ha desarrollado la vida de
El Niño(a) y las circunstancias en que se cometió el Hecho
Delictivo. Esta se notificará personalmente a las partes en la
audiencia en que se dicte.

Posteriormente a la reproducción de la prueba admitida para
la individualización de la Sanción, el Juez señalará día y hora
para audiencia de lectura de Sentencia, la que se efectuará
en un plazo no mayor de cinco (5) días."

"ARTÍCULO 237.- Para la determinación de la Sanción y
a fin de lograr su mejor individualización, el Juez debe
considerar:

a) La proporcionalidad con el hecho, las circunstancias
de El Niño(a) y la gravedad de la conducta realizada;
b) Los Principios Rectores y fines establecidos en este
Título;
c) La edad del Sancionado y sus circunstancias
personales, familiares, sociales y culturales;
d) El grado de participación en el hecho;
e) Las características del caso concreto, su gravedad y
las circunstancias en que se hubiese cometido.

tomando especialmente en cuenta aquellas que
atenúen la responsabilidad;
f) La posibilidad de cumplimiento de la Sanción;

g) El daño causado y los esfuerzos de El Niño(a) por
repararlo; y,
h) Cualquier otro supuesto que establezca este Título.

En la Sentencia, el Juez podrá imponer la amonestación y
hasta un máximo de dos (2) sanciones más, compatibles
entre sí, de modo que su Ejecución pueda ser simultánea y
sucesiva, de ser el caso."

"ARTÍCULO 238.- En la Audiencia de Lectura de
Sentencia estarán presentes las partes, El Niño(a), sus
representantes legales o en su caso, el representante del
Instituto Hondureño de la Niñez y la Familia (IHNFA).

En esta audiencia, el Juez explicará con especial atención al
Sancionado, las motivaciones de la imposición, las
características generales de la Ejecución y las consecuencias
de su incumplimiento.

La Sentencia será dictada en nombre del Estado de
Honduras y deberá contener los requisitos siguientes:

a) El nombre y la ubicación del Juzgado de Letras de la
Niñez o el que haga sus veces que dicte la resolución
y la fecha de la misma;
b) Nombre de las partes intervinientes;
c) Los datos personales de El Niño (a) y cualquier otro
dato de identificación relevante;
d) El razonamiento y la decisión del Juez sobre cada
una de las cuestiones planteadas durante el juicio, con
exposición expresa de los motivos de hecho y de
derecho en que se basa;
e) La determinación precisa del hecho o hechos que el
Juez tenga por probado;
f) En su caso, deberá determinarse en forma clara,
precisa y fundamentada la Sanción impuesta y su
duración;
S) El lugar de Ejecución de la Sanción, debiendo notificar
al ente estatal encargado para ejecutar la o las mismas;
h) El destino de las piezas de convicción, instrumentos
y efectos del Hecho Delictivo; e,
i) La firma del Juez y el Secretario."

"ARTÍCULO 239.- En caso que se recurra la Sentencia
Condenatoria, El Niño(a) continuará sometido a las Medidas
Cautelares que establezca el Juez.

Firme la Sentencia condenatoria, el Juez establecerá las
condiciones y la forma en que debe cumplirla. Así mismo el
Instituto Hondureño de la Niñez y la Familia (IHNFA),
formulará el Plan de Atención Individual para la ejecución
de la Sanción, el que estará supeditado a la aprobación del
Juez de Ejecución."

"ARTÍCULO 240.- En el caso de Faltas, si no fuere
aplicable el Criterio de Oportunidad, el Juez competente
señalará audiencia reservada dentro de los cinco (5) días
siguientes a la presentación de la Acusación, en la cual oirá a
El Niño(a), si su madurez lo hace aconsejable, y al ofendido,
recibiendo la prueba que se presente.

Concluida la audiencia, dictará resolución absolviéndole o
imponiéndole lo procedente.

Teniendo en cuenta su gravedad, las Faltas se sancionarán
con:

a) Amonestación verbal o escrita;
b) La imposición de órdenes de orientación y
supervisión, cuya duración máxima será de treinta (30)
días; o,
c) La obligación de reparar el daño."

"ARTÍCULO 241.- Las partes podrán recurrir las
resoluciones del Juzgado de Letras de la Niñez o quien
haga sus veces, mediante los recursos y trámites
establecidos en el Código Procesal Penal, salvo las
disposiciones especiales establecidas en este Título.

Cuando proceda, en aras de la justicia, el Ministerio Público
podrá presentar impugnación a favor de El Niño(a).

Contra las sentencias definitivas pronunciadas por el Juez
de Letras de la Niñez o el que haga sus veces podrá
interponerse el Recurso de Casación.

En la tramitación de los recursos, se observará
irrestrictamente lo establecido en el Artículo 10 de este
Código, so pena de incurrir en la responsabilidad prevista
en la Ley."

"ARTÍCULO 242.- El Recurso de Apelación procederá
contra las resoluciones que:

a) Concedan el sobreseimiento provisional o definitivo;
b) Decidan un incidente o excepción;
c) Vinculen al Proceso;
d) Ordenen la Detención Cautelar o la imposición de
otras Medidas Cautelares y las modificaciones de la
primera o de las segundas;
e) Declaren la extinción de la acción penal o que
Suspenda el Proceso a Prueba;
f) Denieguen la Suspensión Condicional de Ej ecución
de la Sanción;
g) Ordenen una restricción provisional a un derecho
fundamental;
h) Decidan los juicios por Faltas;
i) Modifiquen o sustituyan cualquier tipo de Sanción en
su Ejecución;
. j) Resuelvan la solicitud de revisión de las sanciones
impuestas; y,
k) Las demás expresamente establecidas en este
Código.

La interposición del recurso no suspenderá la continuación
del procedimiento, salvo en los casos en que por su propia
naturaleza no pueda o no deba proseguirse.

Solamente se suspenderá la ejecución de las resoluciones
apeladas en el caso a que se refiere el numeral f), y en los
demás que determine el presente Código.

Las sentencias sobre Faltas, sólo serán apelables cuando
violenten alguno de los derechos que, según el presente
Código, le corresponde a El Niño(a)."

"ARTÍCULO 243.- La Ejecución de las sanciones deberá
procurar que el Sancionado alcance su desarrollo personal
integral, la inserción a su familia y a la sociedad, así como el
desarrollo pleno de sus capacidades y su sentido de
responsabilidad.

Para lograr los objetivos de la Ejecución se promoverá:

a) Satisfacer sus necesidades básicas;
b) Posibilitar su desarrollo personal;
c) Reforzar su sentimiento de dignidad y autoestima;

d) Incorporarle activamente en la elaboración
ejecución de su Plan de Atención Individual;
e) Minimizar los efectos negativos que la Sanción pudiera
tener en su vida futura;
f) Fomentar, cuando sea posible y conveniente, los
vínculos familiares, sociales y culturales que
contribuyan a su desarrollo personal; y,
g) Promover las redes sociales entre el Sancionado, la
familia y la comunidad."

"ARTÍCULO 244.- Son Garantías y Derechos aplicables
a la Ejecución, los siguientes:

a) Se apliquen en todo momento los Principios Rectores
del Sistema, Garantías y Derechos establecidos en
este Código y en especial los de este Título;
b) Solicitar información sobre sus derechos a las
personas o funcionarios bajo cuya responsabilidad
se encuentre;
c) Recibir información sobre los reglamentos internos
de la institución a la que asiste o en la que se encuentre
privado de libertad, especialmente las relativas a la
normas disciplinarias que puedan aplicársele;
d) Tener formas y medios pertinentes de comunicación
con sus padres o responsables, así como con cualquier
persona con quien mantengan un vínculo afectivo;
e) Recibir los servicios de salud, educación y otras
asistencias sociales por profesionales debidamente
capacitados y en condiciones que garanticen su
adecuado desarrollo físico y psicológico;
f) A que a su ingreso y salida de los centros de privación
de libertad, se le practique exámenes médicos
autorizados, a fin de verificar su estado físico y mental
y si han sido objeto de maltrato.
g) Tomar en consideración la opinión del Sancionado
en la implementación del Plan de Atención Individual
de la Sanción;
h) Tener garantizado el derecho a la Defensa Técnica
durante toda la Fase de Ejecución;
i) Presentar peticiones por si o mediante su Defensor
ante cualquier autoridad y que se le garantice una
rápida respuesta;
j) Estar separado de los mayores de dieciocho (18)
años de edad que se encuentren privados de libertad
y preferiblemente estar con quienes formen parte de
su mismo grupo etario;
k) La ejecución de la sanción transcurra en programas
lugares e instituciones lo más cercanos posibles a

lugar de residencia habitual y a no ser trasladado del
centro de internamiento de modo arbitrario, a menos
que sea sobre la base de una orden judicial;
1) Se respete su cultura y costumbres sociales, indígenas
o afro descendientes;
m) En caso de padecer una enfermedad en fase terminal
o degenerativa del sistema nervioso, recibir atención
y tratamiento médico especializado y el beneficio de
excarcelación cuando proceda, debiendo garantizarse
que sus derechos fundamentales les sean respetados
y que no sea objeto de discriminación;
n) No se limite su libertad u otros derechos, sino a
consecuencia directa e inevitable de la Sanción
impuesta;
o) No ser sometido a restricciones o medidas
disciplinarias que no estén debidamente establecidos
en el respectivo Reglamento;
p) No ser incomunicado en ningún caso y a que no se le
imponga castigo físico ni medidas de aislamiento; y,
q) Los demás derechos que sean compatibles con los
principios que rigen este Título y los instrumentos
internacionales sobre la materia."

"ARTÍCULO 245.- Todo Sancionado tendrá un Plan de
Atención Individual, el cual será elaborado por el Instituto
Hondureño de la Niñez y la Familia (IHNFA), con la activa
participación de éste, así como de sus padres o responsables.
En el cual se establecerán objetivos o metas reales para la
Ejecución de la Sanción, debiéndose considerar sus
condiciones y aptitudes personales y familiares.

El Plan de Atención Individual será remitido para su
aprobación al Juez de Ejecución competente, a más tardar
tres (3) semanas después de iniciado el cumplimiento de
ésta. Para su aprobación deberá consultar al respectivo
equipo técnico y tendrá el plazo de tres (3) días hábiles para
resolver sobre si lo aprueba o no."

"ARTÍCULO 246.- El Instituto Hondureño de la Niñez y
la Familia (IHNFA) dará seguimiento y evaluará el Plan de
Atención Individual, debiendo informar trimestralmente al
Juez de Ejecución competente sobre los avances, obstáculos
e incidencias, así como del ambiente familiar y social en que
el Sancionado se desarrolle.

De ser necesario le realizará ajustes, debiendo informar de
inmediato al Juez de Ejecución, para su confirmación,
modificación o revocatoria."

"ARTÍCULO 247.- Para asegurar el correcto cumplimiento
de este Título, el Instituto Hondureño de la Niñez y la Familia
(IHNFA) tendrá las funciones de ejecución siguientes:

a) Formular, promover, ejecutar y fiscalizar, en
coordinación con las instituciones del sector público
y prjvado pertinentes, las políticas de prevención y
protección integral a la Niñez que cumple sanciones;
b) Crear, administrar, sostener, supervisar y dirigir los
programas, centros de rehabilitación u organismos que
requieran los Juzgados de la Niñez, para efectos de
diagnóstico, tratamiento y seguimiento de los
Niños(as) sancionados;
c) Crear y mantener Programas de atención integral, con
equipos multidisciplinarios de especialistas
certificados en trabajo social, psicología, psiquiatría,
medicina, orientación, Derecho, pedagogía y otros
de carácter técnico que se estime conveniente, para
brindar atención integral, supervisión y seguimiento
durante la ejecución de las Sanciones, sin perjuicio
del auxilio de los especialistas de las instituciones
públicas o privadas cuando ello sea necesario;
d) Asegurar el cumplimiento y garantía de los derechos
que asisten a los Niños(as) sancionados;
e) Brindar la información que requieran los Jueces de
Ejecución y acatar las instrucciones de éstos, sobre
la misma, los programas y proyectos, así como el
manejo de los centros privativos de libertad; -
f) Poner en conocimiento del Ministerio Público, los
hechos constitutivos de delito que se susciten en los
centros de privación de libertad;
g) Certificar centros no estatales, para el cumplimiento
de las sanciones privativas de libertad, cuando
cumplan con las condiciones previstas en la Ley;
h) Llevar un registro de las entidades sin fines de lucro
interesadas en colaborar en el apoyo de la Ejecución
de Sanciones No Privativas de Libertad, debiendo
comprobar su idoneidad y la de los programas que
ofrecen antes de darles su aprobación;
i) Velar porque las instituciones coadyuvantes del
proceso de reeducación y reinserción social de los
Sancionados, se desenvuelvan en forma eficaz y

respetuosa de los derechos de éstos, dentro de los
límites establecidos en este Título;
j) Garantizar, coordinar y supervisar la existencia de
programas de atención terapéutica y orientación
psico-social, a quienes estén sancionados, en
coordinación con sus familiares más cercanos;
k) Organizar, supervisar y coordinar la administración
de los centros de privación de libertad, encargados
de la atención integral de los Niños(as) sancionados;
1) Establecer la coordinación a nivel local y con
participación activa de la sociedad civil, las
comunidades, los centros de educación formal y
alternativa, patronatos y redes de apoyo, programas
para el proceso de educación y reinserción social de
los Niños(as) sancionados, así como llevar un registro
de las mismas;
m) Vigilar y asegurar que el Plan de Atención Individual
sea acorde a los objetivos fijados en la sentencia
definitiva respectiva, este Título y demás instrumentos
. - aplicables, incluidos los internacionales;
n) Solicitar al Juez de Ejecución, la modificación de la
Sanción impuesta a un Sancionado, por otra menos
gravosa, cuando lo considere pertinente o, cuando
haya alcanzado los objetivos para los que fue impuesta;
o) Hacer del conocimiento de las autoridades
competentes, las acciones u omisiones que amenacen,
violenten o pongan en peligro efectivo los bienes
jurídicos protegidos de los Sancionados; y,
p) Las demás atribuciones que este Título estipule y las
que se establezcan mediante la respectiva
reglamentación, siempre que garanticen los fines
dispuestos en este Código.

Las autoridades de ejecución y cumplimiento de las sanciones,
deberán orientarse y armonizarse con la Política General en
materia de protección integral a la niñez y adolescencia a
nivel nacional, rectorada por el Instituto Hondureño de la
Niñez y la Familia (IHNFA), la cual deberá contener enfoque
de justicia restaurativa."

"ARTÍCULO 248.- Una vez dictada la Sentencia en la
que se imponga alguna de las sanciones No Privativas de
Libertad, el Juez citará al Sancionado y a sus padres o
responsables a una audiencia, en la que dará a conocer los
alcances de la Sanción impuesta y las consecuencias de su
incumplimiento, de la cual dejará constancia por medio de
un acta y girará comunicación de la misma a la institución
estatal responsable de la Ejecución."

"ARTÍCULO 249.- La Amonestación se ejecutará en una
audiencia en la que estarán presentes: el Sancionado, su
defensor y padres o responsables, así como el representante
del Ministerio Público.

El Juez se dirigirá al Sancionado en forma clara y directa,
indicándole la infracción cometida, previniéndole de que, en
caso de continuar con su conducta, podrían aplicársele
sanciones más severas e invitándolo a aprovechar las
oportunidades que se le conceden con este tipo de sanciones.
También deberá recordar a los padres o responsables, sus
deberes y responsabilidades en la formación, supervisión y
educación del Sancionado."

"ARTÍCULO 250.- Para la ejecución de la Libertad
Asistida, el Instituto Hondureño de la Niñez y la Familia
(IHNFA), elaborará el Plan de Atención Individual, el cual
contendrá los posibles programas educativos o formativos
impuestos, el tipo de orientación requerida y el seguimiento
para el cumplimiento de los fines de El Sistema."

"ARTÍCULO 251.- Para efectos de la Ejecución de la
Prestación de Servicios a la Comunidad, las tareas de interés
general que el Sancionado realice serán gratuitas.

Serán cumplidas en establecimientos públicos o privados
sin fines de lucro, durante horas que no interrumpan sus
estudios y/o el trabajo. Esta Sanción se cumplirá de
preferencia en los programas comunitarios del lugar de origen
o domicilio del Sancionado, respetando su origen étnico,
cultural e ideología.

El Juez citará al Sancionado y a sus padres o responsable
legal, para informarle de los términos en que se deberá cumplir
el servicio comunitario."

"ARTÍCULO 252.- El Instituto Hondureño de la Niñez y
la Familia (IHNFA) formulará el Plan de Atención Individual
para la Prestación de Servicios a la Comunidad, el cual
contendrá al menos los siguientes requisitos específicos:

a) El lugar donde se debe realizar el servicio;
b) El tipo de servicio que se debe prestar;
c) El tiempo, horario y modalidades de prestación; y,
d) La persona encargada del Sancionado, dentro de la
entidad donde se va a prestar el servicio.

En todos los casos, el servicio deberá estar acorde con las
aptitudes y habilidades del Sancionado, así como dirigirse a
fortalecer en él los principios de convivencia social y otros
establecidos por El Sistema. Asimismo se garantizará que
no implique riesgo ni menoscabo de la dignidad de éste.

Tendrán preferencia los programas comunitarios del lugar
de origen o domicilio del Sancionado."

"ARTÍCULO 253.- La Ejecución de la Reparación del
Daño a la Víctima, aplicará cuando resultare afectado el
patrimonio de ésta y se llegare a un adecuado acuerdo para
reparar de inmediato el daño causado. En este caso, el Juez
podrá ordenar:

a) La devolución de la cosa afectada;
b) La reparación de la cosa afectada; o,
c) El pago de una justa indemnización.

Para la sustitución de la reparación del daño a la víctima por
una suma de dinero, se procurará en todo caso que este
provenga del esfuerzo propio del Sancionado, así como que
no provoque un traslado de su responsabilidad personal hacia
sus padres o representantes.

En caso que proceda la sustitución y no esté determinada en
la sentencia, el Juez valorará los daños causados a la víctima,
con el fin de fijar el monto a pagar.

Cuando la reparación no sea inmediata, la sentencia deberá
contener al menos:

a) La forma en la cual se reparará el daño, la que estará
relacionada con el perjuicio causado por la infracción;
b) El lugar donde se debe de cumplir la reparación o
resarcimiento del daño;
c) El plazo en el que se debe reparar el daño; y,
d) Los días y horas dedicados a tal efecto, los cuales no
podrán afectar sus estudios u ocupaciones laborales."

"ARTÍCULO 254.- La Ejecución de las sanciones no
privativas de libertad de Ordenes de Orientación y
Supervisión, consistirá en la incorporación del Sancionado
y su familia al proceso reeducativo.

El Instituto Hondureño de la Niñez y la Familia (IHNFA)
informarán periódicamente al Juez de Ejecución, sobre el
cumplimiento y evaluación de esta Sanción.

En caso de incumplimiento injustificado, el Juez de Ejecución
citará a audiencia en un plazo no mayor de quince (15) días
a partir de la notificación del mismo, para resolver lo
procedente."

"ARTÍCULO 255.- Firme la Sentencia que disponga la
Semi-libertad, el Instituto Hondureño de la Niñez y la Familia
(IHNFA), tendrá un plazo no mayor de quince (15) días
hábiles, para formular y presentar al Juez, el respectivo Plan
de Atención Individual."

"ARTÍCULO 256.- La Privación de Libertad se ejecutará
en centros estatales de internamiento especiales para Niños
(as), que serán diferentes a los destinados para la población
penitenciaria adulta. En ellos no se admitirá a nadie sin orden
previa de autoridad judicial competente.
La población privada de libertad, estará separada por su
sexo y en razón de si su detención es Medida Cautelar o
Sanción. Asimismo de manera progresiva por grupos etarios.

Cuando cumplan los dieciocho (18) años de edad, durante
la Ejecución, éstos serán separados de las personas menores
de esa edad, no obstante no se podrá ubicar con adultos.

La portación y uso de armas letales está terminantemente
prohibida al interior de los centros."

"ARTÍCULO 257.- El Plan de Atención Individual
correspondiente deberá enviarse al Juez de Ejecución
respectivo, en un plazo no mayor a quince (15) días del
ingreso del Sancionado al centro. El Instituto Hondureño de
la Niñez y la Familia (IHNFA) le informará trimestralmente
sobre la situación del mismo y su desarrollo, con
recomendaciones para el cumplimiento de los objetivos de
este Título.

La inobservancia de lo dispuesto en el párrafo precedente,
por parte de los empleados y funcionarios competentes, debe
ser comunicada por el Juez al superior administrativo
correspondiente, sin perjuicio de las sanciones administrativas
y penales que pudieren corresponder."

"ARTÍCULO 258.- Los empleados y funcionarios de los
centros privativos de libertad, serán reclutados, evaluados
y seleccionados por concurso de oposición, los cuales
deberán contar con aptitudes e idoneidad, valores y principios
para ejercer sus funciones. Así como estar especializados
en el trabajo con Niños(as) privados de libertad."

"ARTÍCULO 259.- El funcionamiento de los centros de
internamiento o de privación de libertad estará regulado por
un Reglamento Interno que dispondrá sobre la organización,
deberes y prohibiciones de los servidores, deberes y
derechos de los Niños (as) privados de libertad, las medidas
de seguridad, la atención terapéutica, la orientación psico-
social, las actividades educativas y recreativas, así como las
medidas disciplinarias y los procedimientos para su
aplicación, que deberán garantizar el debido proceso.

Su contenido asegurará el cumplimiento de lo dispuesto en
este Título."

"ARTÍCULO 260.- En los centros de privación de libertad
se llevará un registro integrado y un expediente por cada
Niño(a) que ingrese, los que serán reservados.

El registro deberá ser foliado, sellado y autorizado por la
institución de la que dependa el centro, donde se consignarán
los datos personales, día y hora de ingreso, motivo del
internamiento, traslados, salidas, liberación y entrega del
Sancionado a sus padres o representantes legales, registro
médico, así como cualquier otra información que se considere
pertinente."

"ARTÍCULO 261.- En los centros de privación de libertad
de El Sistema, se mantendrá documentación relacionada con
la Convención Sobre los Derechos del Niño, como ser
ejemplares de la misma y de este Código, así como catálogos
de derechos, cuyo contenido será puesto en conocimiento
de los Niños(as) y del personal a cuyo cargo esté su
funcionamiento y cuidado."

"ARTÍCULO 262.- No serán aplicables la Conmuta y la
Caución, en el caso de las Sanciones establecidas en este
Título."

"ARTÍCULO 263.- A los fines de la aplicación de este
Título se entenderá por delito grave, los delitos cuya sanción
mínima sea de hasta ocho (8) años."

"ARTÍCULO 264.- La Corte Suprema de Justicia
distribuirá las funciones de los Jueces de Garantías, de Juicio
y de Ejecución, de conformidad a lo establecido en este
Código, debiéndoles dotar de los recursos presupuestarios,
materiales, personal y logística necesarios.

No obstante, su creación será progresiva, de conformidad
a los programas, planes y presupuestos de que disponga.

En tanto no se creen, distribuirá las responsabilidades de
éstos, de manera que funcionen de conformidad con los
Principios Rectores y la debida separación de funciones entre
la instrucción, el Juzgamiento y Ejecución."

"ARTÍCULO 265.- Con el propósito de hacer efectiva la
aplicación del principio de justicia restaurativa para la Niñez
Infractora de la Ley, el Estado creará o generará
progresivamente los espacios y programas de justicia
restaurativa que atenderán los casos referidos por las
instancias de investigación o judiciales. En tanto propiciará
la instrucción en esta materia de los funcionarios públicos
vinculados a la administración de la justicia de la niñez
infractora de la Ley, las Organizaciones No Gubernamentales
y otros actores con interés legítimo en la aplicación de ese
principio."

"ARTÍCULO 282.- Los casos de sustracción internacional
de niños y niñas serán sustanciados conforme a este Código,
hasta que se emita la Ley especial sobre la materia."','1','Decreto 35-2013, reformas al Código de la Niñez y de la Adolescencia y a otras leyes (La Gaceta 33,222 del 6-sep-2013)','{"bytes_sha256":"fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff","text_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","paquete":"PKG_DECRETO_35_2013_REFORMA_AL_CODIGO_DE_LA_NINEZ@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"35-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v8 (ADJUDICACION_CLO_D35_2013.md §3)","ocr_text_sha256":"f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a","norm_id":"HN:DECRETO_35_2013","instrumento_id":"DECRETO_35_2013","ingest_batch":"A04_D35_2013_01","ordinal":1,"article_sha256":"1df7a9f8142d8bd557b10be15daeabeed32e3de6b028895dc0f4e0a1eb84debd","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_35_2013','1','a5334ac0d39988cace427aff6267065149f4f8c53a7f3571ec2dc8d2a547f313','A04_D35_2013_01',now())
ON CONFLICT (id) DO NOTHING;
DO $verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM (VALUES
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:13','68b7ac07c940308ae60402a1440f247c1397fbbc6f380405b1f3311e865eabf9'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:15','2ce7ecd9b296a725021c3ae9fa3c6ef802b3112c5aed1dcc37dd5c2e048de3dd'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:38','9fed95e9fd5ed3147226ee746bcc782b12cdb380d9831f2065e3c13cb5548d18'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:63','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:71','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:77','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:82','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:90','09a20578a48a2c8a72a0e8205934a915c592065faa73666bb6c834e657e11cbe'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:117','1b8dc48ead71929bfac6e43786183249ec91fccd3f4626a38b43485e133e9250'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:136','e72feea6414ce2d1313d58553ae0707cd9ed2a5740a819061dae3fb8eab458b7'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:189','6cc959d30e833d7b390683b7409fa79b18f808d31bce6aac52739979bab6a055'),
    ('A04_D35_2013_01:DECRETO_35_2013:1','a5334ac0d39988cace427aff6267065149f4f8c53a7f3571ec2dc8d2a547f313')
 ) AS e(id,hash_contenido) JOIN public.biblioteca_vectores b ON b.id=e.id
 WHERE b.hash_contenido=e.hash_contenido AND b.ingest_batch=split_part(e.id,':',1)
   AND b.instrumento_id=split_part(e.id,':',2) AND b.metadata->>'norm_id'=CASE split_part(e.id,':',1) WHEN 'A03_CODIGO_NINEZ_01' THEN 'HN:CODIGO_NINEZ' WHEN 'A04_D35_2013_01' THEN 'HN:DECRETO_35_2013' WHEN 'PILOTO_D284_2013_01' THEN 'HN:DECRETO_284_2013' END
   AND b.revision_pendiente=true AND b.es_norma_vigente IS NULL AND b.embedding=array_fill(0::real, ARRAY[384])::vector
   AND encode(sha256(convert_to(b.contenido,'UTF8')),'hex')=e.hash_contenido;
 IF n<>12 THEN RAISE EXCEPTION '01_datos_01: % de 12 filas no coinciden con contenido, hash o estado oculto',n; END IF;
END
$verify$;
COMMIT;
