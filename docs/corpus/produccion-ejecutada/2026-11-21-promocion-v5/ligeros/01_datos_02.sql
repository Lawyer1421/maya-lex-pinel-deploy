-- 01_datos_02.sql | Solo mayalexhn-prod / thgrhueckkjdutjvcufp.
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
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:2','mayalex_normativos','10_LEYES_REGLAMENTOS','El objetivo general del presente Código es la protección integral de los niños en los términos que consagra la Constitución de la República y la Convención sobre los Derechos del Niño, así como la modernización e integración del ordenamiento jurídico de la República en esta materia.

Por protección integral se entenderá el conjunto de medidas encaminadas a proteger a los niños individualmente considerados y los derechos resultantes de las relaciones que mantengan entre sí y con los adultos.

Con tal fin, el presente Código consagra los derechos y libertades fundamentales de los niños; establece y regula el régimen de prevención y protección que el Estado les garantiza para asegurar su desarrollo integral, crea los organismos y procedimientos necesarios para ofrecerles la protección que necesitan; facilita y garantiza su acceso a la justicia y define los principios que deberán orientar las políticas nacionales relacionadas con los mismos.','2','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":2,"article_sha256":"edd675e73eb9064732cdc0fa1194c3e3774d985df5c4eae3485a6121019ea4cf","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','2','a0749de9a21bd27b9d645ac50ca53e70396189ccd9309c4f4f9af810b6df6f18','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:5','mayalex_normativos','10_LEYES_REGLAMENTOS','Las disposiciones de este Código se interpretarán y aplicarán siempre de manera que aseguren una eficaz protección a los derechos de los niños, niñas y su superior interés.

En todas las medidas que tomen las instituciones públicas o privadas, los tribunales, las autoridades administrativas o los órganos legislativos, la consideración primordial que se atenderá será la del interés superior del niño.

Se interpretarán y aplicarán, además, teniendo en cuenta los Tratados y Convenios sobre los derechos de la niñez, aprobados y ratificados por Honduras, los que prevalecen sobre el Derecho Interno.

Debiéndose respetar:

1) Su condición de sujeto de derecho; 2) El derecho de los niños y niñas a ser oídos y que su opinión sea tenida en cuenta; 3) El respeto al pleno desarrollo personal de sus derechos en su medio familiar, social y cultural; 4) Su edad, grado de madurez, capacidad de discernimiento y demás condiciones personales: 5) El equilibrio entre los derechos y garantías de los niños y niñas y las exigencias del bien común; y, 6) Su centro de vida. Se entiende por centro de vida el lugar donde los niños y niñas han transcurrido en condiciones legítimas la mayor parte de su existencia.

Cuando exista conflicto entre los derechos e intereses de los niños y niñas frente a otros derechos e intereses igualmente legítimos, prevalecerán los primeros.','5','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":5,"article_sha256":"cb8a0be2d6a2124aaa04ce68bd01fe2d4f454f8e1147cbcd3baf682c01541ac7","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','5','901cf245f92b7aeb2e05099481a8b84d3ac06e07e070625e42231b96ff288c7b','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:10','mayalex_normativos','10_LEYES_REGLAMENTOS','La autoridades administrativas y judiciales resolverán con preferencia a cualesquiera otros los asuntos relacionados con la niñez, excepto, en el caso de las segundas, los que tengan que ver con la acción de exhibición personal o habeas corpus.','10','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":10,"article_sha256":"f35a0acb8cf230b23d6f7e869cd9f31efe84d0500a1ffb47300c80d50bb52c56","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','10','02be3cf666b30d9ebc0893d4bdfc1ddefee97cbb425f0abc55e4c171aa18f6de','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:11','mayalex_normativos','10_LEYES_REGLAMENTOS','Los niños tienen derecho a la vida, a la salud, a la seguridad social, a la dignidad, a la libertad personal, a la de expresar sus opiniones, a la nacionalidad, a la identidad, al nombre y a la propia imagen, a la educación, a la cultura, al deporte, a la recreación y al tiempo libre, al medio ambiente y los recursos naturales, a la familia, y a los demás que señale la Convención sobre los Derechos del Niño, el presente Código y demás leyes generales o especiales.','11','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":11,"article_sha256":"706b808091a706b5487ad738214ce4040349ee38855a3f557c564f99ab880ea9","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','11','840169bbb233d9e29ad978e14388cfd28615ba69dc03a6f8aa703bd1129d805f','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:22','mayalex_normativos','10_LEYES_REGLAMENTOS','Los centros de atención de la salud y los hospitales públicos están obligados a prestarle atención inmediata a los niños que la requieran en caso de emergencia, aún sin el consentimiento de sus padres o representantes legales.

Ninguna excusa será válida para no darle cumplimiento a esta disposición. Dicha atención en caso alguno, podrá tener como propósito la ejecución de un acto considerado por el derecho vigente como doloso o culposo.

Los representantes de los centros y hospitales a que este artículo se refiere adoptarán las medidas necesarias para informar a los padres o representantes legales, en el menor tiempo posible del tratamiento dispensado a los niños.','22','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":22,"article_sha256":"567ba9e8e4297a1b265f5e7d237187574be15513bd1b4d8126b7de2bfcf055d0","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','22','870df0731f57f705b6069f33c8772c44323a7ceba8261ceffc99127e6d685ee1','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:26','mayalex_normativos','10_LEYES_REGLAMENTOS','Los derechos patrimoniales de los niños, incluidas la propiedad intelectual y los derechos de autor, gozan de la protección del Estado. Las leyes especiales regularán esta materia.','26','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":26,"article_sha256":"d4e81f79e7d04a1ea830626c2b72538e087b3fd915e059c560c36f97cea951c4","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','26','bf3dfeb144af1a07d7ac5c7064e39c9f90391df45fad3f19b5dc7cc66152d44b','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:69','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','69','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":71,"article_sha256":"06a64bfa2a1225f3e515aebf2c64735c7501638f0d91b83fa3e4a6399f8f83ad","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','69','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:76','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','76','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":78,"article_sha256":"62b69cb52d19006f2b7423e2cd21d1231890463f607fa4fc9a461396f2d46319","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','76','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:81','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','81','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":83,"article_sha256":"6f6c24594fad2cfccc87d1913215dce612e82f814b75549bceb9551d6ef24104","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','81','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:104','mayalex_normativos','10_LEYES_REGLAMENTOS','La solicitud de autorización o impedimento de salida del país, deberá contener:

a) El nombre y apellidos del niño o niña; b) . Los nombres y demás generales de los padres, o representante legal; c) El nombre completo y generales de la persona que acompañará al niño o niña; y, d) La relación de los hechos en que se funda la solicitud, con la cual se acompañará la certificación de partida de nacimiento y demás pruebas pertinentes.','104','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":108,"article_sha256":"d160643ce293bc97d31d6cb55106de9199d0fd417da69154f96895c1262d64dd","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','104','98283be6a59eb7cd64e2c6f88a2d0f3f00112fcee454364b4855b224f8e56517','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:106','mayalex_normativos','10_LEYES_REGLAMENTOS','Las autoridades de migración no permitirán la salida del territorio nacional de un menor respecto del cual no se haya cumplido los requisitos señalados en los artículos precedentes. Tampoco permitirán que una autorización se utilice más de una vez.','106','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":111,"article_sha256":"d6294aecb689c03f1a0e8156ead953e0995b65ce733e781f25d805af00e6c498","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','106','a66daa55879689cb66ca85a1205f0ae94e5c770e4c904e66acebf148e5df7d54','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:109','mayalex_normativos','10_LEYES_REGLAMENTOS','Es deber del Estado promover, desarrollar y coordinar programas de prevención, tratamiento y rehabilitación para los niños discapacitados. Con tal fin, creará y fomentará servicios especializados que atiendan, evalúen periódicamente y aseguren el acceso efectivo de aquellos a la educación, a los servicios de salud y de rehabilitación, a la capacitación para el trabajo, al esparcimiento y a los deportes.

El padre, la madre o los representantes legales de un niño discapacitado tienen la obligación de someter a éste a los tratamientos adecuados y de integrarse activamente a los procesos de rehabilitación.

La renuencia u oposición injustificada de los padres o representantes legales a cumplir las obligaciones señaladas en este artículo dará derecho al Instituto Hondureño de la Niñez y la Familia a adoptar las medidas de protección que estime apropiadas.','109','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":114,"article_sha256":"691b31caa4f4b6c0178db2cf404a4e465b4bbb5949719e1763cc568a3e96cfd3","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','109','60a64d4174ffd5ef170e0af7caab39ba5224efb3531d1ef15b071b78c7edbf0e','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:119','mayalex_normativos','10_LEYES_REGLAMENTOS','El empleo de niños en cualquier actividad retribuida estará sujeto a lo prescrito por el artículo 128 numeral 7 de la Constitución de la República y requerirá de la autorización previa de la Secretaría de Estado en los Despachos de Trabajo y Seguridad Social a solicitud de los padres, de los hermanos o del representante legal. Igual autorización requerirán los niños que se propongan realizar trabajos independientes, esto es, aquellos en que no medie una remuneración ni un contrato o relación de trabajo.

Para extender tal autorización dicha Secretaría de Estado deberá realizar un estudio socio-económico y del estado físico y mental de los niños de que se trate.

La autorización se concederá cuando, a juicio de la mencionada Secretaría de Estado, el niño no sufrirá perjuicio aparente, físico, moral o educativo por el ejercicio de la actividad de que se trate.

Concedida la autorización, el niño podrá recibir directamente el salario y, llegado el caso, a ejercitar, con el auxilio de un apoderado legal, las acciones pertinentes.','119','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":124,"article_sha256":"743f85b253b2da9d9e5ddd0fdab73d19618be7c05f281442156821b5080e95d0","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','119','e5a5858597ce16d1ab6cce06eda8e65635e1bd64e2ea3a5afed3f96a24f5e7ea','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:121','mayalex_normativos','10_LEYES_REGLAMENTOS','Se considerará trabajo educativo la actividad laboral en la que las exigencias pedagógicas prevalezcan sobre el aspecto productivo. La remuneración que se pague al estudiante no desvirtuará el carácter educativo de la labor.

Los centros de trabajo que utilicen a estudiantes que realizan su práctica educativa social no podrán destinar al educando a labores distintas de aquellas a que está orientada la práctica.

No obstante, la temporalidad del trabajo educativo social, al estudiante deberá ofrecérsele condiciones adecuadas para la realización de su trabajo, incluso en lo relacionado con la retribución de sus servicios.','121','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":126,"article_sha256":"20570d30951eff0b4cbc30d88e7753d185bb84219bc706b2a25ed5f7349759f6","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','121','99afa08efeb16b1d9af19f96d7c97257ba772ab948f6bc8a37407b0e6a5c9441','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:127','mayalex_normativos','10_LEYES_REGLAMENTOS','La aptitud para el trabajo de los niños trabajadores será objeto de control médico cada seis (6) meses, o antes si las circunstancias lo exigen.','127','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":132,"article_sha256":"5bfd4697ad5d188fcd3bcec45cb5fb533a15fba82eae1057e01b3626fe3f4d2f","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','127','668e01e057fa21b28fcdc0bdff887ead178f6bd7452989e4d372be9ce41899d4','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:134','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','134','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":139,"article_sha256":"ec58292777a8b59ce054af3859469165e4535c9c50cdf4ada0bdf79d97ea957d","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO_INTEGRO","fuente_canonica":"D35_2013_ART_11","observaciones_canonicas":["Derogado íntegro (resolución del CLO 2026-11-18, PASAJES_134_141.md §6); el tipo pasa al art. 179-F del Código Penal (art. 8 del D.35-2013). A03 conservaba a)–c): no se adopta."]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','134','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:139','mayalex_normativos','10_LEYES_REGLAMENTOS','Un niño(a) es particularmente vulnerable al incumplimiento y a la violación de sus derechos, cuando se encuentra o se ve afectado(a) por situaciones, tales como:

a. Que se encuentre en estado de abandono; b. Carezca de atención suficiente para la satisfacción de sus necesidades básicas; c. Su patrimonio se encuentre amenazado por quienes lo administran; ch. Carezca de representante legal; d. Sea objeto de maltratos o de corrupción; e. Se encuentre en una situación especial que atente contra sus derechos o su integridad; y, f Sea adicto(a) a sustancias que produzcan dependencia o se encuentre expuesto a caer en la adicción.','139','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":144,"article_sha256":"511e4b6ad7849bf769d16626ef04dbd2b59f45d6596e5742243680ec42e748e1","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','139','cd7b218f2ad5abc34e7c349e6042be437fda013c91e53a4cd1a9038ff0fc38a8','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:147-C','mayalex_normativos','10_LEYES_REGLAMENTOS','En todos los procedimientos aquí indicados se garantizará al niño o niña todos los derechos establecidos en el presente Código, en particular su derecho a ser oído(a) y que su opinión sea tenida en cuenta durante todo el proceso considerando su edad y grado de madurez así como a ser asistido por un(a) abogado(a). En todo caso, se procurará la permanencia del niño o niña en su medio familiar y en su centro de vida.

Durante todo el procedimiento se garantizará el cumplimiento del derecho de confidencialidad.','147-C','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":155,"article_sha256":"545fd887a66e1020d818e9c6cba36425e5ce8aa21ff26b0c69294ff042170380","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3_ADICIONADO","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','147-C','4c181d07ff4d5a258654661e4a11b9227fa3190c2c9610258dc6a11eb4614a3d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:147-E','mayalex_normativos','10_LEYES_REGLAMENTOS','Si como resultado de la investigación se establece que el niño o niña ha sido víctima de un delito, el Instituto Hondureño de la Niñez y la Familia (IHNFA) testimoniará las actuaciones y las remitirá al Ministerio Público, a efecto de promoverse las diligencias necesarias para sancionar al(a) responsable.','147-E','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":157,"article_sha256":"fe6aa540ee90bcbd5fe340b4c2f33ecd2228157d86d83f823f0f318a05fadb10","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3_ADICIONADO","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','147-E','dfcb916aca33d99a8165e07e2dc0f2f34ebb07cff19f0bddfd4adc6ce1a98e79','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:159','mayalex_normativos','10_LEYES_REGLAMENTOS','Cuando el peligro para los intereses económicos del niño provenga del desacuerdo de los padres acerca de los actos de administración de sus bienes, el Instituto Hondureño de la Niñez y la Familia o el Ministerio Público ejercitarán las acciones necesarias para que se actúe conforme lo dispuesto en el artículo 59, precedente.','159','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":169,"article_sha256":"1a8dbfefa5afcb83406add727e48918c93992a92e1763b539489542c008d1977","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','159','3fcfa6a790c9a53f3971e69e9a1c55557c259f1e1d3a67b09f467f2b51cfb356','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:166','mayalex_normativos','10_LEYES_REGLAMENTOS','Sin perjuicio de la responsabilidad Civil, Administrativa y Penal a que hubiera lugar en Derecho, el maltrato será sancionado administrativamente por el Instituto Hondureño de la Niñez y la Familia (IHNFA), con multa de uno (1) a dos (2) salarios mínimos en su valor más alto. Asimismo el(la) infractor(a) deberá asistir a los programas de tratamiento y rehabilitación, así como de consejería familiar que tendrá el Instituto Hondureño de la Niñez y la Familia (IHNFA), los que incluirán orientación psicológica y social.

En la aplicación de esta norma, el Instituto Hondureño de la Niñez y la Familia (IHNFA), procurará que las sanciones no menoscaben el legítimo ejercicio de los derechos a que da origen la patria potestad o tutela, en su caso.','166','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":176,"article_sha256":"7dcdce5d6f83b3cd28a4d5f2b7739bf7631ef7ba29ffecda06fbb566abe7fb76","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','166','a3a525f61db78dbdb8cedcd122eb544d85032b3d4b733e238d6f33aa7efdbec7','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:169','mayalex_normativos','10_LEYES_REGLAMENTOS','Incurre en responsabilidad Civil, Penal y Administrativa, el(la'') funcionario(a) o empleado(a) del Instituto Hondureño de la Niñez y la Familia (IHNFA) bajo cuyo cuidado se encuentre un niño o niña, cuando incida en la misma situación a la que se refiere el Artículo precedente, en cuanto a sus autoridades superiores.','169','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":179,"article_sha256":"c882c3717cad3103962a53ee0d5f152529d8f79f9fabf48bd6fe8e37b10360fc","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','169','1d7c40c2b70f0683c59ea839f03f016a230b8b7120c304b15db1017ceca0a994','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:172','mayalex_normativos','10_LEYES_REGLAMENTOS','Cuando el delito de negación de asistencia familiar se cometa contra un niño, se sancionará al responsable con reclusión de uno (1) a dos (2) años y multa de un mil (L. 1,000.00) a cinco mil (L. 5,000.00) lempiras.','172','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":182,"article_sha256":"2d229ba5716a13f4847ce5d4310772b220f02ab6215f72720f71cc3c83f61b4d","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','172','f782464f9b3df2033887eead7b20a39dd460b2925e5d802a19556a70da656c3b','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:175','mayalex_normativos','10_LEYES_REGLAMENTOS','Es obligación del Estado, de la familia y de la comunidad proteger a los niños contra el uso de sustancias que producen dependencia o adicción.

El padre, la madre y los representantes legales de un niño tienen la responsabilidad de orientarlo respecto de la drogadicción. Están obligados, asimismo, a participar en los programas de prevención y tratamiento de tal adicción que lleven a la práctica entidades públicas o privadas y a velar porque el tiempo libre de los niños sea aprovechado en actividades educativas, recreativas, deportivas o artísticas.','175','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":185,"article_sha256":"00685378712263a5a980889ea658ae6b448b38454ae777d282200611783036f2","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','175','f56c9d91da06479085d88efa9d435f74213d66547a3ec3a570a02d82f5fac6dd','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:182','mayalex_normativos','10_LEYES_REGLAMENTOS','Corresponde al Ministerio Público el ejercicio de la acción penal contra Los Niños(as), sin perjuicio de la participación que este Código y el Código Procesal Penal conceden al ofendido, tratándose de Falta e Infracciones de acción privada y de acción pública instancia privada.

La acción penal prescribe en un término equivalente al máximo de duración de la pena señalada en la Ley para la infracción que se le atribuya a El Niño(a), sin embargo, éste en ningún caso podrá ser superior a ocho (8) años, plazo que cuando se trate de Faltas, será de noventa (90) días.

Los plazos señalados para la prescripción de la acción, se contarán a partir del día en que se cometió el Hecho Delictivo o Falta o, desde el día en que se decretó la Suspensión del Proceso, según corresponda.

Las sanciones prescribirán en un término igual al ordenado para cumplirlas, el cual empezará a contarse desde que se encuentre firme la resolución que la imponga; o bien, desde que se compruebe que comenzó el incumplimiento.

El cumplimiento de la sanción impuesta de conformidad con lo previsto por este Título, extingue la responsabilidad derivada del Hecho Delictivo o Falta.','182','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":194,"article_sha256":"f7e1c78d77a5bfb47ece41780c5678bee39b5c7e24f064dc88a6cd0611fa77fe","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','182','9d13a0a443a48facf56515606e1086beed7e0104fc1ad11c1d35f0167ab5c61b','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:184','mayalex_normativos','10_LEYES_REGLAMENTOS','Las acciones civiles para el pago de perjuicios ocasionados por la infracción cometida por un Niño(a), deberá promoverse ante la jurisdicción civil, de acuerdo con las normas generales.

Con tal fin y conforme a las previsiones legales respectivas, los juzgados ordinarios podrán solicitar al Juez competente certificación de la sentencia condenatoria, con el sólo objeto de fundamentar la acción civil correspondiente.','184','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":196,"article_sha256":"1027dd7c454aaee2ed420538927ac1ee04d702dc16dc1a7eb68733902946382f","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','184','e88454daf8ee129eb0f49fd4eff33839fbd229ef13229eab58db5102c21cb54f','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:187-A','mayalex_normativos','10_LEYES_REGLAMENTOS','Son Medidas Cautelares las que tienen como finalidad asegurar la eficacia del Proceso, garantizando la presencia de El Niño(a) durante el mismo y la regulación de la obtención y conservación de las fuentes de prueba.

Son Sanciones las que impone el Juez, declarando responsable a un Niño(a) de una infracción penal.','187-A','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":200,"article_sha256":"4e3ff4d913a5fc0651e8ea72f24efec9c69fdc83275668d2933047034cd1eaf0","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3_ADICIONADO","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','187-A','0a95ba02d1a4289e2128ce5c5dd0ab5e4be7bdbe31d6b6c8ed8eff588d680eed','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:192','mayalex_normativos','10_LEYES_REGLAMENTOS','Para los efectos de éste Código, la medida prevista en el numeral 3 del Artículo 173 del Código Procesal Penal, se denomina Detención Cautelar y se regirá de conformidad a este Título.

La Detención Cautelar tiene carácter excepcional, por lo que exclusivamente se aplicará si no fuere posible decretar otra Medida Cautelar menos gravosa y solamente podrá imponerse en los supuestos siguientes:

a) Que la infracción supuestamente cometida, haya producido daño a la vida, la integridad personal, la libertad personal o sexual de las personas o implique grave violencia contra de otro u otros seres humanos b) Que El Niño(a) haya rechazado expresa, reiterada e injustificadamente el cumplimiento de otras Medidas Cautelares o Sanciones impuestas por la autoridad competente; o, c) Que exista peligro de fuga u obstrucción de la investigación.

En todos los casos, el Fiscal fundamentará la solicitud de Medidas y, mediante auto motivado, el Juez resolverá lo procedente conforme a Derecho.

A fin que la Detención Cautelar sea lo más breve posible, los tribunales y los órganos de investigación deberán considerar de máxima prioridad la tramitación efectiva de los casos en que un Nino(a) se encuentre detenido.

La Detención Cautelar se cumplirá en los centros especializados que al efecto tenga el Instituto Hondureño de la Niñez y la Familia (IHNFA) o institución que corresponda. Quienes cumplan esta medida deberán estar separados de aquellos que hayan sido sentenciados con el internamiento.

En los centros de privación de libertad no se admitirá el ingreso de Niños(as) sin orden previa y escrita de Juez competente.','192','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":205,"article_sha256":"28ec8b41ecb77aa71adfecd3f924df58c836a4539cc28c4dbc0b28ec6988939e","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','192','5e9300300bb102f89bccd2fe87e8b22d4919f19430ac179c78c83a56ae2abfe0','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:218','mayalex_normativos','10_LEYES_REGLAMENTOS','Procederá la Conciliación entre la víctima y El Niño(a), en todo momento y hasta antes de dictarse el auto de Apertura a Juicio.

Podrán solicitarla tanto el Ministerio Público o las partes, igualmente en el caso de las Faltas, los Hechos Delictivos de acción privada, de acción pública dependientes de instancia particular como en los que admitan la Suspensión del Proceso a Prueba, a cuyo efecto el Juez les hará saber que cuentan con la posibilidad de conciliar y si están de acuerdo y preparados, practicará la Conciliación.

La conciliación se rige por los principios de: voluntariedad de las partes, confidencialidad, flexibilidad, neutralidad, imparcialidad, equidad, legalidad y honestidad.

La información que se genere en los procedimientos respectivos no podrá ser utilizada en perjuicio de las partes dentro del Proceso o del Proceso Penal, en su caso.

Para los efectos de la Conciliación el Juez podrá aprobar el asesoramiento y el auxilio de personas o entidades especializadas en la materia.

No se aprobará la conciliación cuando se tengan fundados motivos para estimar que alguno de los intervinientes no se encontraba en condiciones de igualdad para negociar o hubiera actuado bajo coacción o amenaza.

Una vez propuesta la Conciliación, el Juez señalará la audiencia respectiva dentro de un plazo que no podrá exceder los veinte (20) días.

El plazo fijado para el cumplimiento de las obligaciones pactadas no podrá ser superior a tres (3) meses; durante el cual se suspenderá el trámite del Proceso y de la prescripción de la acción penal. Comenzará a contarse a partir del día siguiente de la homologación del acuerdo.

No se podrá conciliar cuando se trate de los Hechos Delictivos siguientes:

a) De naturaleza dolosa contra la vida y las lesiones graves; b) Contra la libertad e integridad física, psicológica y sexual; c) Cuando el Sujeto Pasivo sea menor de dieciocho (18) años de edad; y, d) Sea producto de redes de crimen organizado.','218','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":231,"article_sha256":"dc6a3a74f754854f79644a3303925756048f06c620c8ff6f89d1e64dcd0d83b8","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','218','7314fc18862a36ab02d251ce0f8b1cbece9e7e02eb6230bbf66d4448ec67ae40','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:219','mayalex_normativos','10_LEYES_REGLAMENTOS','Procederá la Suspensión del Proceso a Prueba en los casos en que el máximo de la pena aplicable al Hecho Delictivo de que se trate no exceda de nueve (9) años y siempre que no se encuentre o haya gozado de este beneficio en otro Proceso.

La solicitud podrá ser presentada por El Niño(a) o por el Fiscal, en cualquier momento hasta antes del auto de Apertura a Juicio.','219','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":232,"article_sha256":"c1dbb228f34e919bad5fd01d2a2e4a3f5761cb5435f33a0e98166ec6f843b562","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','219','fdd5dd749795b9e45997554fae6aae535fd747aeff826f20bce2e1b0460c275b','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:232','mayalex_normativos','10_LEYES_REGLAMENTOS','La Fase Intermedia se desarrollará en una audiencia a celebrarse el día y hora señalados, la cual comprenderá los actos siguientes:

a) Interposición de incidentes, excepciones y nulidades; b) Solicitud de sobreseimiento provisional o definitivo; c) Formalización de la acusación y contestación de cargos; y d) Auto de apertura a debate.

La acusación deberá contener: a) Una breve y precisa relación de los Hechos Delictivos imputados; b) La calificación legal de los hechos, conforme lo dispuesto en la Ley; c) El grado de participación que supuestamente tuvo El Niño(a); y, d) La Sanción que considera debe aplicarse.

En caso de duda, la calificación podrá recaer alternativamente sobre tipos delictivos que se excluyan entre sí.','232','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":245,"article_sha256":"cc8cb82961ed5de2f415220566ac5338aa14c0cc7f14c92fb0f2c5a192870ad2","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','232','f71cf71d48af385a71da715869a07596d4b69b4de4158cef2f7c09578239ad4d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:259','mayalex_normativos','10_LEYES_REGLAMENTOS','El funcionamiento de los centros de internamiento o de privación de libertad estará regulado por un Reglamento Interno que dispondrá sobre la organización, deberes y prohibiciones de los servidores, deberes y derechos de los Niños (as) privados de libertad, las medidas de seguridad, la atención terapéutica, la orientación psicosocial, las actividades educativas y recreativas, así como las medidas disciplinarias y los procedimientos para su aplicación, que deberán garantizar el debido proceso.

Su contenido asegurará el cumplimiento de lo dispuesto en este Título.','259','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":272,"article_sha256":"ac1b0a6fc448d002e684ec7079ced6f094a200756d1810575885d429cf7c9536","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','259','f2a158b9f31c266e8010e5fe61b3ea610971574b4c4d9ae4acab1b99757015b2','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:260','mayalex_normativos','10_LEYES_REGLAMENTOS','En los centros de privación de libertad se llevará un registro integrado y un expediente por cada Niño(a) que ingrese, los que serán reservados.

El registro deberá ser foliado, sellado y autorizado por la institución de la que dependa el centro, donde se consignarán los datos personales, día y hora de ingreso, motivo del internamiento, traslados, salidas, liberación y entrega del Sancionado a sus padres o representantes legales, registro médico, así como cualquier otra información que se considere pertinente.','260','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":273,"article_sha256":"3a583329dc7f3383569975d0f8412cfa565f30f26aceb40da4af3810ecc127ab","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','260','eb55476fb87e172cf9e8afed56ff7d5a99309004e35e9b6d02b20b320009c5fb','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:285','mayalex_normativos','10_LEYES_REGLAMENTOS','Reformase el Artículo 4 de la Ley del Fondo Hondureño de Inversión Social, contenida en el Decreto número 12-90 del 22 de febrero de 1990, que en lo sucesivo se leerá así:

"Artículo 4. El Fondo, para los efectos del Artículo anterior, podrá: a)...; b)...; c)...; ch)...; d)...; e) Promover y financiar programas y proyectos de generación de empleo temporal y estacional para grupos urbanos y rurales afectados por situaciones de emergencia o por su difícil inserción en el mercado de trabajo o para mejorar las condiciones de vida y de trabajo de los niños que, conforme el Código de la Niñez y de la Adolescencia, pueden realizar labores remuneradas; f)...; g)...; y, h)...".','285','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":299,"article_sha256":"2cee3b44965ac45ef99c473278d9c93d756a2aac2c1fb6d35e3a4f083f493f9f","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','285','717c605a72d32a2ce79e2b675c12b078221fdf2e09eb3421fe9280ea90b1cfc5','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:288','mayalex_normativos','10_LEYES_REGLAMENTOS','El presente Código entrará en vigencia el día de su publicación en el Diario Oficial la Gaceta.

Dado en la ciudad de Tegucigalpa, Municipio del Distrito Central, en el Salón de Sesiones del Congreso Nacional, a los treinta días del mes de mayo de mil novecientos noventa y seis.

CARLOS ROBERTO FLORES FACUSSE Presidente ROBERTO MICHELETTI BAIN Secretario SALOMON SORTO DEL CID Secretario Al Poder Ejecutivo.

Por Tanto: Ejecútese.

Tegucigalpa, M.D.C., 17 de junio de 1996 CARLOS ROBERTO REINA IDIAQUEZ Presidente Constitucional de la República.

El Secretario de Estado en los Despachos de Gobernación y Justicia, por ley.

RAMON IZAGUIRRE','288','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":302,"article_sha256":"f989747eaac1e8ff72283eac7d94b8bdf86dad52e6a1a5f41794402983f8fa7b","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','288','6c4cfe95abaf9369ae0a8aa0fb77f4827aea1e08136b41e276bb34abb6832d8a','A03_CODIGO_NINEZ_01',now()),
('A04_D35_2013_01:DECRETO_35_2013:5','mayalex_normativos','10_LEYES_REGLAMENTOS','Adicionar al Decreto No. 76-84 de fecha
16 de Agosto de 1984, contentivo del CÓDIGO DE FAMILIA,
treinta y seis (36) nuevos Artículos bajo las denominaciones de:
119-A, 119-B, 120-A, 120-B, 120-C, 120-D, 122-A, 123-C,
123-D, 123-E, 123-F, 123-G, 123-H, 197-A, 197-B, 197-C,
197-D, 197-E, 198-A, 198-B, 198-C, 207-A, 207-B, 207-C,
207-D, 207-E, 207-F 207-G, 210-A, 216-A, 216-B, 226-A,
242-A y 332-A, cuyo texto y denominaciones serán las siguientes:

"ARTÍCULO 119-A.- La madre tendrá derecho para que
los bienes que han de corresponder al postumo, si nace vivo
y en el tiempo debido, se le asigne lo necesario para su
subsistencia, atención prenatal y postnatal."

"ARTÍCULO 119-B- La adopción es una institución
jurídica de protección que tiene por finalidad incorporar en
la familia, en condiciones iguales a las de un hijo(a)
nacido(a) de una relación conyugal, a una persona que
biológicamente no es nacido del adoptante, a fin de que
pueda alcanzar su pleno desarrollo físico, mental, espiritual,
moral y social.

Se prohíbe la adopción del(la) niño(a) que está por nacer."

"ARTÍCULO 120-A.- Cuando la o las personas
adoptantes sean extranjeras con permiso especial de
permanencia en el país, además de los requisitos indicados
en el Artículo precedente deberán acreditar su permanencia
continua en el país con un mínimo de tres (3) años y el
compromiso de seguimiento por parte de la institución a la
que se refiere el Artículo 120-B de este Código."

"ARTÍCULO 120-B.- Cuando la o las personas
adoptantes sean extranjeras no residentes en el país, además
de los requisitos indicados en el Artículo precedente,
acreditarán los extremos siguientes:

1) La institución gubernamental o privada, de servicios
sociales que en el país de su residencia habitual,
ejercerá control y supervisión acerca del cumplimiento
de las obligaciones legales derivadas de la adopción;

2) Que la institución a la que se refiere el numeral
precedente esté reconocida por el Estado extranjero
correspondiente, con al menos cinco (5) años de
funcionamiento continuo; y,
3) Que la institución a la que se refiere el Numeral 1) de
este Artículo esté acreditada ante el Estado de
Honduras.

Para efectos de dar cumplimiento a lo establecido en el
numeral 3) precedente, la institución deberá registrarse ante
el Instituto Hondureño de la Niñez y la Familia (IHNFA).

Para acreditar la referida supervisión, la Institución de
Servicios Sociales deberá remitir al Instituto Hondureño de
la Niñez y la Familia (IHNFA) una carta de obligatoriedad,
donde señalará fielmente el compromiso de dar cumplimiento
a las obligaciones anteriormente indicadas."

"ARTÍCULO 120-C- Créase bajo la responsabilidad del
Instituto Hondureño de la Niñez y la Familia (IHNFA) el
Registro de Adoptado(a), cuyo propósito será sistematizar
la información sobre los(las) niños(as) hondureños(as)
adoptados(as), hasta que éstos(as) cumplan la mayoría de
edad de acuerdo a la legislación del país.

Harán parte del Registro al que se refiere el párrafo
precedente los Subregistros de:

Registro de adoptadoras);
2) Registro de adoptantes;
3) Registro de instituciones de servicios sociales
extranjeras que ejerzan supervisión sobre niños o niñas
hondureñas dados en adopción; y,
4) Registro de instituciones o agencias de adopciones
extranjeras.

La información de este registro será de carácter reservado;
para su organización y funcionamiento el Instituto Hondureño
de la Niñez y la Familia (IHNFA) emitirá el reglamento
especial correspondiente."

"ARTÍCULO 120-D.- Para el cumplimiento de las
obligaciones de supervisión establecidas en el Artículo 120-
B de este Código, la institución obligada remitirá al Instituto
Hondureño de la Niñez y la Familia (IHNFA) informes
evaluadores del desarrollo integral del niño o niña, conforme
al siguiente cronograma:

1) Trimestralmente durante el primer año de la adopción
2) Semestralmente el segundo año; y,
3) Anualmente a partir del tercer año, hasta que la o la
personas adoptadas cumplan la mayoría de edad
conforme a la legislación del país del, la o los
adoptantes."

"ARTÍCULO 122-A.- En el caso de los(as) niños(as)
indígenas y afro descendientes(as) se preferirá para su
adopción a personas que sean parte de su comunidad étnica

En todo caso, se respetarán los usos y costumbres de su
identidad, en cuanto no perjudiquen el Interés Superior del(la)
Niño(a)."

"ARTÍCULO 123-C- Todo padre o madre que desee
dar a sus hijos(as) en adopción, se abocarán al Instituto
Hondureño de la Niñez y la Familia (IHNFA) a fin de que se
les informe de las consecuencia sociales, psicológicas y legales
de la adopción; y una vez que tengan ese conocimiento, si
persisten en su decisión, se les remitirá al Juzgado de Letras
de Familia respectivo para que den su consentimiento de
dar a sus hijos o hijas en adopción.

En el caso que la Patria Potestad sea exclusiva de uno de
los padres, bastará con el consentimiento de éste(a).

Cuando el Juez lo considere oportuno se ordenará la prueba
científica de paternidad o maternidad del hijo o hija.

En lo referente a este Artículo, mientras no se cumpla lo
establecido en el mismo, no se dará trámite a la respectiva
adopción."

"ARTÍCULO 123-D.- El(la) Juez de Letras de Familia o
quien haga sus veces, donde se otorgue el consentimiento
librará comunicación al Instituto Hondureño de la Niñez y la
Familia (IHNFA) ordenando el ingreso de niño(s) o niña(s)
por adoptar, al Programa de Familias Solidarias.

El Instituto Hondureño de la Niñez y la Familia (IHNFA)
podrá asignar en familia temporal al niño o niña, mientras
dure el proceso de adopción, la cual será supervisada y
controlada periódicamente, por el personal técnico y
profesional de la institución.

Lo establecido en este Artículo será aplicable únicamente a
adoptantes hondureños y extranjeros residentes en el país

"ARTÍCULO 123-E.-Ninguna persona natural o jurídica,
nacional o extranjera podrá ejecutar en el territorio nacional
actividades que tengan como finalidad la crianza de niños(as)
con el propósito de entregarlos en adopción o bajo cualquier
concepto análogo a terceras personas."

"ARTÍCULO 123-F.- Se prohíbe a toda autoridad, permitir
o promover:

1) El desarrollo de programas de adopción franca o
encubierta quien quiera sea la persona interesada;
2) La recompensa a los padres o representantes legales,
por la entrega que hagan de sus hijos(as) o
representados a un(a) adoptante; y,
3) Que se ejerza sobre los padres o representantes
legales, presión alguna para obtener su consentimiento.

El incumplimiento de esta disposición será justa causa de
despido del(a) empleado(a) o funcionario(a) infractor(a)."

"ARTÍCULO 123-G- El Instituto Hondureño de la Niñez
y la Familia (IHNFA), en coordinación con otras autoridades
competentes, velará por el estricto cumplimiento de lo
prescrito en el presente Título.

Asimismo, impondrá a quien contravenga lo establecido en
los Artículos 123-A y 123-E una multa de trece (13) a
veintiocho (28) salarios mínimos vigentes en su valor más
alto, sin perjuicio de lo que sobre el particular disponga el
Código Penal."

"ARTÍCULO 123-H.- Si la o las personas adoptadas fueren
niños o niñas o mayores de edad que no puedan valerse por
sí mismas y tuvieren bienes, quienes les adopten quedarán
sujetos(as) a los regímenes establecidos para la tutela en
cuanto a su administración."

"ARTÍCULO 197-A.- El padre y la madre gozan del
usufructo de todos los bienes de su hijo o hija, exceptuados
los siguientes:

1) Los bienes adquiridos por el(la) hijo(a) en el ejercicio
de todo empleo, profesión, arte u oficio;

2) Los bienes adquiridos por el(la) hijo(a) a título de
donación, herencia o legado, cuando el(la) donante o
testador ha dispuesto expresamente que tenga el

usufructo de esos bienes el(la) hijo(a) y no el padre o
madre; y,

3) Las herencias o legados que hayan pasado al(la)
hijo(a) por incapacidad o indignidad de los padres.

Los bienes comprendidos bajo el numeral 1) forman el
peculio profesional o industrial del(la) hijo(a); aquellos en
que el(la) hijo(a) tiene la propiedad y los padres el derecho
de usufructo, forman el peculio adventicio ordinario; y los
comprendidos bajo los numerales 2) y 3), el peculio
adventicio extraordinario.

Se llama usufructo legal del padre o de la madre el que le
concede la Ley.

La condición de no administrar el padre o la madre impuesta
por el donante o testador(a) no se entiende que le priva del
usufructo, ni la que le priva del usufructo se entiende que le
quita la administración a menos de expresarse lo uno o lo
otro por el(la) donante o testador(a)."

"ARTÍCULO 197-B.- El padre o la madre no goza del
usufructo legal sino hasta la emancipación de el(la) hijo(a).

El(la) hijo(a) se mirará como emancipado y habilitado de
edad para la administración y goce de su peculio profesional
e industrial."

"ARTÍCULO 197-C- No teniendo el padre o la madre la
administración de todo o parte del peculio adventicio
ordinario o extraordinario, se dará al(la) hijo(a) un(a)
curador(a) para la administración, pero quitada al padre la
administración de aquellos bienes del hijo(a) en que la Ley
le da el usufructo no dejará por esto, de tener derecho a los
frutos líquidos deducidos de éstos los gastos de
administración."

"ARTÍCULO 197-D.- Los actos y contratos celebrados
por el (la) hijo (a) fuera de su peculio profesional o industrial,
que los padres o quien ejerza la Patria Potestad autoricen y
ratifiquen por escrito, obligan directamente a los(as)
autorizantes y subsidiariamente al(la) hijo(a), hasta la
concurrencia del beneficio que haya reportado de dichos
actos y contratos.

Los(as) no autorizados(as) por los padres o quien ejerza la
Patria Potestad, en el caso del Artículo 197C, le obligarán
exclusivamente en su peculio profesional o industrial.

Pero no podrá tomar dinero a interés ni comprar al crédito,
excepto en el giro ordinario de dicho peculio, sin autorización
de los padres o representantes legales en instrumento público
o interviniendo el mismo expresa y directamente en el acto.
Y si lo hiciere, no será obligado(a) por estos contratos, sino
hasta la concurrencia del beneficio que haya reportado de
ellos."

"ARTÍCULO 197-E.- El(la) hijo(a) no necesita de la
autorización paterna o materna para disponer de sus bienes
por acto testamentario que haya de tener efecto después de
su muerte."

"ARTÍCULO 198-A.- Podrá el(la) Juez(a), en caso de
inhabilidad física de ambos padres, confiar el cuidado
personal de los hijos(as) a otra persona o personas
competentes.

En la selección de esta persona se preferirá a los
consanguíneos más próximos y sobre todo a los
ascendientes."

"ARTÍCULO 198-B- Las resoluciones de el(la) juez(a)
con relación al Artículo precedente se sustanciarán,.revocarán
o modificarán por la cesación de la causa que haya dado
motivo a ellas, mediante resolución de el(la) Juez(a) de Letras
de Familia competente, en todo caso y tiempo, si sobreviene
motivo justo.

El(la) Juez(a) procederá para todas estas disposiciones
sumariamente oyendo a los(as) parientes."

"ARTÍCULO 198-C- El(la) Juez(a) procederá para todas
estas resoluciones sumariamente, oyendo a los(as) parientes."

"ARTÍCULO 207-A. Se entenderá por alimentos todo lo
que sea indispensable para el desarrollo integral de una
persona, como ser el sustento, habitación, vestido, asistencia
médica, formación integral y educación o instrucción."

"ARTÍCULO 207-B.- Los alimentos comprenden la
obligación de proporcionar a la madre los gastos ocasionados
por el embarazo, el parto o sus consecuencias inmediatas.

Se entenderá cumplida la obligación de cubrir los gastos pre
y postnatales y del parto, si la madre está cubierta por un
seguro médico ya sea público o privado, salvo que sea
requerida atención no cubierta.

En el caso que no esté acreditado el parentesco, el padre
está obligado a someterse a la prueba del marcador genético
o ADN y la madre a devolver la cantidad recibida por este
concepto si se comprueba no ser el padre.

Mientras no se acredite la paternidad, el(la) Juez(a) no dictará
sentencia en materia de alimentos."

"ARTÍCULO 207-C- La Demanda de Alimentos y la
contestación podrán presentarse verbalmente o por escrito
ante el Juzgado competente.

En la demanda verbal se levantará acta que firmarán el(la)
Secretario(a) del respectivo juzgado y el(la) demandante y
demandado(a), en su caso.

La demanda escrita que adolezca de defectos será corregida
en el acto por el(la) Secretario(a), salvando lo enmendado
con firma y sello.

Si la condición económica de ell(la) demandante lo requiere
y falta algún documento que no esté en posibilidad de
presentar con la demanda, el(la) Juez (a), a solicitud de parte
o de oficio, y previo informe de la Secretaría del Juzgado,
ordenará a la autoridad correspondiente que gratuitamente
lo expida y lo remita a su despacho.

En el juicio de alimentos no podrán proponerse excepciones
dilatorias."

"ARTÍCULO 207-D.- Para los efectos de fijar pensión de
alimentos en el proceso, el (la) Juez(a), a petición de parte
interesada o de oficio, podrá ordenar al respectivo patrono
extienda certificación de los ingresos del demandado(a),
quedando obligados a remitirla a estas autoridades en el
plazo de dos (2) días hábiles, so pena de incurrir en la
responsabilidad penal correspondiente. Esta circunstancia
será insertada en el oficio para dar conocimiento a quien lo
reciba.

El(la) Juez(a) podrá asimismo ordenar a la Dirección
Ejecutiva de Ingresos que le emita constancia de la última
declaración del demandado(a) en concepto de ingresos.

Cuando no sea posible acreditar los ingresos del
demandado(a), el(la) Juez(a) podrá establecerlo mediante
un estudio socioeconómico tomando en cuenta su patrimonio,
posición social, costumbres y en general, todos los

antecedentes y circunstancias que sirvan para evaluar su
capacidad económica. En todo caso, se presumirá que
devenga al menos el salario mínimo promedio vigente para
el trabajo o actividad a la que se dedique."

"ARTÍCULO 207-E.- Si los bienes o los ingresos de la
persona obligada a suministrar alimentos se hallaren
embargados en virtud de una acción anterior fundada en
alimentos o se encontraren afectos al cumplimiento de una
sentencia de alimentos, el(la) Juez(a), de oficio o a solicitud
de parte, al tener conocimiento del hecho en un proceso
concurrente, asumirá el conocimiento de los distintos
procesos para el solo efecto de señalar la cuantía de las
varias pensiones alimenticias y las necesidades de los
diferentes beneficiarios(as).

Ya sea que medie demanda de alimentos, actuación oficiosa
del(la) Juez(a) o petición de el(la) demandado(a), éste
acreditará la necesidad de proveer los alimentos a los(as)
otros(as) beneficiarios(as) y el cumplimiento para con todos
ellos.

Las sumas percibidas por este concepto no deberán ser
devueltas, por el hecho de que el Tribunal de Alzada revoque
el auto en que dio con lugar la misma."

"ARTÍCULO 207-F.- Mientras el(la) deudor(a) no cumpla
o se allane a cumplir la obligación alimentaria que tenga
respecto de un(a) niño(a), no será escuchado en la
reclamación sobre su custodia y cuidado personal ni en el
ejercicio de sus derechos sobre aquel o aquella.

El (la) Juez(a) dispondrá, cuando fuere necesario, la custodia
y cuidado de el(la) niño(a) en cuyo nombre se inició el
proceso, sin perjuicio de las acciones judiciales pertinentes."

"ARTÍCULO 207-G- Cuando a los padres se les imponga
la sanción de suspensión o pérdida de la Patria Potestad, no
por ello cesará la obligación alimentaria. Sin embargo, esa
obligación termina cuando el(la) niño(a) es adoptado(a) por
otra persona."

"ARTÍCULO 210-A.- El (la) Juez(a) podrá, a solicitud de
parte o de oficio, ordenar que se den alimentos provisionales
desde la admisión de la demanda si aparece prueba siquiera.
sumaria de la capacidad económica de el(la) demandado(a)
y de la existencia de la obligación alimentaria. Dará inmediato
aviso, además, a las autoridades migratorias para que el(la)

demandado(a) no pueda ausentarse del país, sin prestar
garantía suficiente que respalde el cumplimiento de la señalada
obligación.

Los alimentos provisionales se concederán sin perjuicio del
reembolso de su valor, si el(la) demandado(a) prueba que
no está obligado a proveerlos."

"ARTÍCULO 216-A.- Solamente se podrá demandar
alimentos a los demás parientes, cuando se acredite que la
persona a la que le corresponda, carezca de capacidad para
proveerlos, debiéndose en función de los grados de
parentesco por consanguinidad.

El(la) Juez regulará la contribución, tomadas en consideración
las facultades de los(as) alimentantes, y podrá, de tiempo en
tiempo, modificarla según las circunstancias que
sobrevengan."

"ARTÍCULO 216-B.- Si el(la) hijo(a) abandonado(a) por
sus padres hubiese sido alimentado y criado por otra persona,
que hayan actuado de buena fe, y quisieran sus padres sacarle
del poder de ellos, deberán pagar los costos de su crianza y
educación tasados por el(la) Juez(a) de Letras de Familia
competente."

"ARTÍCULO 226-A.- En el caso del dolo para obtener
alimentos, serán obligados solidariamente a la restitución de
los valores suministrados por ese concepto incluyendo la
indemnización de los daños y perjuicios causados, todos(as)
los que hayan participado en el dolo."

"ARTÍCULO 242-A.- La cónyuge que descubriere estar
embarazada, está obligada a comunicarlo por escrito en el
término de siete (7) días contados a partir de la fecha en que
confirmó su estado, a su cónyuge o al(la). Juez(a) si hubiere
juicio pendiente.

Igual comunicación y en el mismo término, hará la Cónyuge,
si hubiere recaído sentencia firme enjuicio de divorcio o de
nulidad del matrimonio ante el(la) Juez(a) que conoció del
mismo.

Si la cónyuge no lo comunicare en el término señalado, se
considerará válida siempre que el(la) Juez(a) considere
probado que el retraso ha sido justificable.

En el caso de no ubicar al cónyuge, para efectos de la
comunicación a la que se refiere éste Artículo, ésta será
hecha a su pariente más cercano o en su defecto a su
representante legal.

Esta disposición será aplicable a la Unión de Hecho
legalmente reconocida."

"ARTÍCULO 332-A.- En los casos en que la Ley dispone
que se oiga a los(as) parientes de una persona, se entenderán
comprendidos(as) en esa denominación su cónyuge o
compañero(a) de hogar en una unión de hecho debidamente
reconocida y sus consanguíneos de uno u otro sexo mayores
de edad. A falta de consanguíneos en suficiente número, serán
oídos sus parientes por afinidad.

Serán preferidos(as) los y las descendientes y ascendientes
a los colaterales, y entre éstos, a los de más cercano
parentesco."

Los parientes serán citados y comparecerán a ser oídos
verbalmente, en la forma prescrita por el Código Procesal
Civil."

CÓDIGO CIVIL','5','Decreto 35-2013, reformas al Código de la Niñez y de la Adolescencia y a otras leyes (La Gaceta 33,222 del 6-sep-2013)','{"bytes_sha256":"fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff","text_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","paquete":"PKG_DECRETO_35_2013_REFORMA_AL_CODIGO_DE_LA_NINEZ@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"35-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v8 (ADJUDICACION_CLO_D35_2013.md §3)","ocr_text_sha256":"f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a","norm_id":"HN:DECRETO_35_2013","instrumento_id":"DECRETO_35_2013","ingest_batch":"A04_D35_2013_01","ordinal":5,"article_sha256":"af0284eb4b9437f7f3a188d646491ce7a36fca063b7e5bb972952719b8f1441b","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_35_2013','5','956d34880ecc762522ee9a66e2b78f979e92e2a28d30e62036003bb1d425bee4','A04_D35_2013_01',now()),
('A04_D35_2013_01:DECRETO_35_2013:15','mayalex_normativos','10_LEYES_REGLAMENTOS','Derogar el Artículo 179-C del Decreto
No. 144-83 de fecha 23 de agosto de 1993, contentivo del
CÓDIGO PENAL.','15','Decreto 35-2013, reformas al Código de la Niñez y de la Adolescencia y a otras leyes (La Gaceta 33,222 del 6-sep-2013)','{"bytes_sha256":"fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff","text_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","paquete":"PKG_DECRETO_35_2013_REFORMA_AL_CODIGO_DE_LA_NINEZ@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"35-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v8 (ADJUDICACION_CLO_D35_2013.md §3)","ocr_text_sha256":"f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a","norm_id":"HN:DECRETO_35_2013","instrumento_id":"DECRETO_35_2013","ingest_batch":"A04_D35_2013_01","ordinal":15,"article_sha256":"582c1958a4c85f7ca300cda54bd8d869a64cd3e87d7c3890a79f1dd8b9cb9c6a","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_35_2013','15','9cdce1d6576f18403a67d75165baa20bf47bac38f6af4adc53b54669f2b88c0c','A04_D35_2013_01',now()),
('A04_D35_2013_01:DECRETO_35_2013:17','mayalex_normativos','10_LEYES_REGLAMENTOS','El Instituto Hondureño de la Niñez y la
Familia, Ministerio Público, Poder Judicial y demás instituciones
cuyas competencias sean afectadas por lo dispuesto en este
Decreto, deberán armonizar sus disposiciones reglamentarias,
programas, planes, proyectos, presupuestos, estructura
organizativa y demás instrumentos pertinentes, a la nueva normativa
vigente, en el término de ciento ochenta (180) días, a partir de la
entrada en vigencia de este Decreto.','17','Decreto 35-2013, reformas al Código de la Niñez y de la Adolescencia y a otras leyes (La Gaceta 33,222 del 6-sep-2013)','{"bytes_sha256":"fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff","text_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","paquete":"PKG_DECRETO_35_2013_REFORMA_AL_CODIGO_DE_LA_NINEZ@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"35-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v8 (ADJUDICACION_CLO_D35_2013.md §3)","ocr_text_sha256":"f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a","norm_id":"HN:DECRETO_35_2013","instrumento_id":"DECRETO_35_2013","ingest_batch":"A04_D35_2013_01","ordinal":17,"article_sha256":"595eb79e859d5fbc0833448f29d3484c758f045d2011589575b5d5962e2ccf06","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_35_2013','17','13e03fed0bb09bff861c802e0e4728cf4812275e926f88d0e942917d3a58d3e0','A04_D35_2013_01',now()),
('A04_D35_2013_01:DECRETO_35_2013:18','mayalex_normativos','10_LEYES_REGLAMENTOS','TRANSITORIO.- A efecto de lograr el
máximo conocimiento social de las presentes reformas. La
Secretaría de Estado en los Despachos de Justicia y Derechos
Humanos en coordinación con el Instituto Hondureño de la Niñez
y la Familia (INHFA), es la institución que a su vez procederá en
un término no mayor a tres (3) meses y a partir de la entrada en
vigencia de esta Ley, a un proceso de divulgación masiva a través
de uno de los medios de comunicación preferentemente del Estado,
sin perjuicio de la publicación en el Diario Oficial "La Gaceta".','18','Decreto 35-2013, reformas al Código de la Niñez y de la Adolescencia y a otras leyes (La Gaceta 33,222 del 6-sep-2013)','{"bytes_sha256":"fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff","text_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","paquete":"PKG_DECRETO_35_2013_REFORMA_AL_CODIGO_DE_LA_NINEZ@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"35-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v8 (ADJUDICACION_CLO_D35_2013.md §3)","ocr_text_sha256":"f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a","norm_id":"HN:DECRETO_35_2013","instrumento_id":"DECRETO_35_2013","ingest_batch":"A04_D35_2013_01","ordinal":18,"article_sha256":"37a98f90e156d238b7a9a623e9413f46a2e6195af1ac9f4ecc07c349d4bc8632","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_35_2013','18','02c444cc1974f40f9046dd84cade80a744c7a12dbf6f3725593a8b55a987e5d2','A04_D35_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:5','mayalex_normativos','10_LEYES_REGLAMENTOS','- Las sociedades mercantiles formadas al
amparo de esta Ley pueden ser creadas con un solo socio. El
establecimiento de capital mínimo al momento de su creación será
de carácter estrictamente voluntario debiendo insertarse en el
documento de su creación como una estipulación de carácter
especial en los casos en que así sea requerido por el o los socios.
Las sociedades creadas sin estipulación de capital mínimo por
más de un socio deben señalar los porcentajes de participación
de cada uno dentro de la misma. La tasa registral a pagar cuando
no se estipule el capital de la sociedad es la establecida para
actos de cuantía indeterminada.

Cuando la sociedad sea por acciones, las mismas pueden constar
en títulos que reúnan los requisitos establecidos en el Código de
Comercio o en anotaciones en cuenta de conformidad con lo
establecido en la Ley de Mercado de Valores.','5','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":5,"article_sha256":"fb2ab402e102bf96f28a74165a7f98eddf02ce4ee42bf09d5001e3b016bf1690","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','5','1f569907b1fc36983af6240fd3887602fed371be5f0b617c672e0d9f3bc0393d','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:9','mayalex_normativos','10_LEYES_REGLAMENTOS','- Las tasas registrales y otros cargos deben
poder cancelarse al momento de la inscripción en la misma
ventanilla del Registro Mercantil o en ventanilla separada de una
institución bancaria, debiendo extenderse el recibo
correspondiente detallando los montos correspondientes a cada
cobro. Dicho recibo constituye prueba suficiente del pago por lo
que no se requiere la imposición de timbres u otra especie fiscal
para acreditarlos. Los montos recaudados deben ser distribuidos
entre las instituciones beneficiarias.','9','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":9,"article_sha256":"6e12f208dc6c487c408a4a40f4d6e864e7f098442ff0338646fd7fbab13580ee","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','9','aace3fa9d9e512f197532ef2ce16968548335382386c95b56cbbcdb447b4f8f1','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:10','mayalex_normativos','10_LEYES_REGLAMENTOS','- Los entes encargados del Registro
Mercantil deben crear los mecanismos para que en un plazo no
mayor de un (1) año a partir de la entrada en vigencia de esta
Ley, la constitución de sociedades mercantiles bajo la modalidad
establecida en la presente Ley, pueda llevarse a cabo
opcionalmente en línea mediante el uso de firmas electrónicas.','10','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":10,"article_sha256":"dea024e129ece17e175047a42c8860170908d49f38ddfe654881cee719b14ddb","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','10','20a3c339603854d0c44654448453fd75aa91906ce4840983b593b6dd04784d8f','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:11','mayalex_normativos','10_LEYES_REGLAMENTOS','- El formulario especial debe contener la
información necesaria para que en el mismo acto de registro se
autorice y haga entrega del Carnet de Registro Tributario Nacional,
también debe habilitarse a quienes lo soliciten para que a través
del mismo formulario se haga la notificación de inicio de
operaciones establecidas en el Artículo 10 de la Ley de Impuestos
Sobre Ventas y la inscripción de una Cámara de Comercio

requerida según el Artículo 384 del Código de Comercio para lo
cual la Dirección Ejecutiva de Ingresos (DEI) y las Cámaras de
Comercio deben hacer las coordinaciones necesarias con los entes
encargados del Registro Mercantil, para delegar en éstos, la
emisión de dichos documentos.

Asimismo debe incorporarse al formulario la opción para que
pueda emitirse a quienes lo soliciten y en el mismo acto del registro,
el permiso de operación municipal respectivo sujeto al pago de
las tasas que correspondan a favor de la municipalidad en la que
la sociedad vaya a operar. La municipalidad respectiva tendrá
reservado el derecho de inspeccionar posteriormente a la empresa
para comprobar la veracidad de lo declarado para este efecto.
Para este fin debe realizarse la coordinación respectiva con las
municipalidades, lo cual puede hacerse por etapas, empezando
por las municipalidades más grandes.','11','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":11,"article_sha256":"397547f2b242b90fd9699ceb371cb9157c12b1058044e4979bd321311b7fec4f","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','11','1f340113fe62601d02d1c9f09120158370adc515a257fe3c0d50357d9112e3ed','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:21','mayalex_normativos','10_LEYES_REGLAMENTOS','- Las normas para determinar la prioridad y
prelación de derechos de los acreedores sobre las garantías son
determinadas por la legislación de derecho privado que
corresponda.','21','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":21,"article_sha256":"7ab991804e2d1357dec7e497303d48a05d41f9445e237eeb8573274e62d4861c","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','21','91cfdf6d3cc4372deea95dd27c95ff6a8334e58020b5ffdbf664c0e16ebcc095','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:28','mayalex_normativos','10_LEYES_REGLAMENTOS','- Interpretar el Artículo 31 de la Ley de
Promoción de la Alianza Público Privada contenida en el Decreto
Legislativo No. 143-2010 y sus reformas, en el sentido de que el
párrafo último del mismo es una autorización para la determinación
de su propia política salarial incluyendo gastos de representación,
bonificaciones, dietas, viáticos y demás estipendios de
conformidad con los Artículos 361 y 362 del Código del Trabajo
contenido en el Decreto Legislativo No. 189 de 1959 y sus
reformas.','28','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":28,"article_sha256":"055defc57a403c445bcbd4db14abafa53ca5b70a473f715328107201551c624e","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','28','2a91f50d450aba00e77a6fd9a9ea90f48cd2e711d80d4417d420339bac3801ee','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:30','mayalex_normativos','10_LEYES_REGLAMENTOS','- En lo procedente, será aplicable al Consejo
Nacional de Inversiones y a otras unidades de la administración
pública que el Presidente de la República autorice lo dispuesto en
los Artículos 29, 31 y 35 de la Ley de Promoción de la Alianza
Público - Privada contenida en el Decreto Legislativo No. 143-2010 y sus reformas.','30','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":30,"article_sha256":"d0aaf24a2120ee1032f32801363bdc2672b9768d8f6a885f03bdd0a86a4634a7","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','30','920e17543962d394df3cbee7dda8c83032c1ab240f9785294a9f95eaa22a7c91','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:32','mayalex_normativos','10_LEYES_REGLAMENTOS','- Las referencias que en la Ley para la
Promoción y Protección de Inversiones se hagan a la Secretaría
Técnica del Consejo Nacional de Inversiones deberán entenderse
como menciones a la Secretaría Ejecutiva del Consejo Nacional
de Inversiones.','32','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":32,"article_sha256":"0a91788fcacaa0f7db7979168ccf8291bae7025d83c4ae7f744c0a082e085560","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','32','f9fa272a447ead9c7ef7dd0715ac16f86306f5567233a65bcd4cfbcca1bc07c5','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:33','mayalex_normativos','10_LEYES_REGLAMENTOS','- A efectos de dar cumplimiento a lo
establecido en los artículos 15, 16 y 29 del Decreto 51-2011
contentivo de la Ley para la Promoción y Protección de
Inversiones, los jueces de letras deberán instruir a quienes
presenten ante los tribunales acciones sobre los asuntos descritos
en el mismo sobre la existencia de esas disposiciones y el derecho
que les asiste para concurrir ante la instancia arbitral como vía de
solución primigenia a la disputa. A partir de la entrada en vigencia
del presente decreto, serán sujetos de nulidad aquellos procesos
que se hubieren seguido sin cumplir con este requisito.

La presente disposición deberá comunicarse al Consejo de la
Judicatura y la Corte Suprema de Justicia a fin de que se libren las
comunicaciones y se dicten las instrucciones que correspondan a
todas las instancias del Poder Judicial.','33','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":33,"article_sha256":"3826e43bbbcb2d2d24bec07d68f4958e47238bbd75879088f4684f7cb7ef64b1","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','33','e1bb23cd986325ecae3f6b27c4573b569440a3780a3b76b0727de718268ec940','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:38','mayalex_normativos','10_LEYES_REGLAMENTOS','- Derogar los Artículos 36, 37, 38, 39 y 54
del Decreto Legislativo No. 51-2011 y sus reformas contentivas
de la Ley para la Promoción y Protección de Inversiones.','38','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":38,"article_sha256":"339b7bbbf8dd0598a462a7c8d018fdacc239dc61d08eaca895f11546f41227c8","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','38','037b0d9e68a1e6ec330e196c74fa30844435e25bc479d9abb03af90623c810a1','PILOTO_D284_2013_01',now())
ON CONFLICT (id) DO NOTHING;
DO $verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM (VALUES
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:2','a0749de9a21bd27b9d645ac50ca53e70396189ccd9309c4f4f9af810b6df6f18'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:5','901cf245f92b7aeb2e05099481a8b84d3ac06e07e070625e42231b96ff288c7b'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:10','02be3cf666b30d9ebc0893d4bdfc1ddefee97cbb425f0abc55e4c171aa18f6de'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:11','840169bbb233d9e29ad978e14388cfd28615ba69dc03a6f8aa703bd1129d805f'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:22','870df0731f57f705b6069f33c8772c44323a7ceba8261ceffc99127e6d685ee1'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:26','bf3dfeb144af1a07d7ac5c7064e39c9f90391df45fad3f19b5dc7cc66152d44b'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:69','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:76','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:81','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:104','98283be6a59eb7cd64e2c6f88a2d0f3f00112fcee454364b4855b224f8e56517'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:106','a66daa55879689cb66ca85a1205f0ae94e5c770e4c904e66acebf148e5df7d54'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:109','60a64d4174ffd5ef170e0af7caab39ba5224efb3531d1ef15b071b78c7edbf0e'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:119','e5a5858597ce16d1ab6cce06eda8e65635e1bd64e2ea3a5afed3f96a24f5e7ea'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:121','99afa08efeb16b1d9af19f96d7c97257ba772ab948f6bc8a37407b0e6a5c9441'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:127','668e01e057fa21b28fcdc0bdff887ead178f6bd7452989e4d372be9ce41899d4'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:134','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:139','cd7b218f2ad5abc34e7c349e6042be437fda013c91e53a4cd1a9038ff0fc38a8'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:147-C','4c181d07ff4d5a258654661e4a11b9227fa3190c2c9610258dc6a11eb4614a3d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:147-E','dfcb916aca33d99a8165e07e2dc0f2f34ebb07cff19f0bddfd4adc6ce1a98e79'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:159','3fcfa6a790c9a53f3971e69e9a1c55557c259f1e1d3a67b09f467f2b51cfb356'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:166','a3a525f61db78dbdb8cedcd122eb544d85032b3d4b733e238d6f33aa7efdbec7'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:169','1d7c40c2b70f0683c59ea839f03f016a230b8b7120c304b15db1017ceca0a994'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:172','f782464f9b3df2033887eead7b20a39dd460b2925e5d802a19556a70da656c3b'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:175','f56c9d91da06479085d88efa9d435f74213d66547a3ec3a570a02d82f5fac6dd'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:182','9d13a0a443a48facf56515606e1086beed7e0104fc1ad11c1d35f0167ab5c61b'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:184','e88454daf8ee129eb0f49fd4eff33839fbd229ef13229eab58db5102c21cb54f'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:187-A','0a95ba02d1a4289e2128ce5c5dd0ab5e4be7bdbe31d6b6c8ed8eff588d680eed'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:192','5e9300300bb102f89bccd2fe87e8b22d4919f19430ac179c78c83a56ae2abfe0'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:218','7314fc18862a36ab02d251ce0f8b1cbece9e7e02eb6230bbf66d4448ec67ae40'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:219','fdd5dd749795b9e45997554fae6aae535fd747aeff826f20bce2e1b0460c275b'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:232','f71cf71d48af385a71da715869a07596d4b69b4de4158cef2f7c09578239ad4d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:259','f2a158b9f31c266e8010e5fe61b3ea610971574b4c4d9ae4acab1b99757015b2'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:260','eb55476fb87e172cf9e8afed56ff7d5a99309004e35e9b6d02b20b320009c5fb'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:285','717c605a72d32a2ce79e2b675c12b078221fdf2e09eb3421fe9280ea90b1cfc5'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:288','6c4cfe95abaf9369ae0a8aa0fb77f4827aea1e08136b41e276bb34abb6832d8a'),
    ('A04_D35_2013_01:DECRETO_35_2013:5','956d34880ecc762522ee9a66e2b78f979e92e2a28d30e62036003bb1d425bee4'),
    ('A04_D35_2013_01:DECRETO_35_2013:15','9cdce1d6576f18403a67d75165baa20bf47bac38f6af4adc53b54669f2b88c0c'),
    ('A04_D35_2013_01:DECRETO_35_2013:17','13e03fed0bb09bff861c802e0e4728cf4812275e926f88d0e942917d3a58d3e0'),
    ('A04_D35_2013_01:DECRETO_35_2013:18','02c444cc1974f40f9046dd84cade80a744c7a12dbf6f3725593a8b55a987e5d2'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:5','1f569907b1fc36983af6240fd3887602fed371be5f0b617c672e0d9f3bc0393d'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:9','aace3fa9d9e512f197532ef2ce16968548335382386c95b56cbbcdb447b4f8f1'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:10','20a3c339603854d0c44654448453fd75aa91906ce4840983b593b6dd04784d8f'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:11','1f340113fe62601d02d1c9f09120158370adc515a257fe3c0d50357d9112e3ed'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:21','91cfdf6d3cc4372deea95dd27c95ff6a8334e58020b5ffdbf664c0e16ebcc095'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:28','2a91f50d450aba00e77a6fd9a9ea90f48cd2e711d80d4417d420339bac3801ee'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:30','920e17543962d394df3cbee7dda8c83032c1ab240f9785294a9f95eaa22a7c91'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:32','f9fa272a447ead9c7ef7dd0715ac16f86306f5567233a65bcd4cfbcca1bc07c5'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:33','e1bb23cd986325ecae3f6b27c4573b569440a3780a3b76b0727de718268ec940'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:38','037b0d9e68a1e6ec330e196c74fa30844435e25bc479d9abb03af90623c810a1')
 ) AS e(id,hash_contenido) JOIN public.biblioteca_vectores b ON b.id=e.id
 WHERE b.hash_contenido=e.hash_contenido AND b.ingest_batch=split_part(e.id,':',1)
   AND b.instrumento_id=split_part(e.id,':',2) AND b.metadata->>'norm_id'=CASE split_part(e.id,':',1) WHEN 'A03_CODIGO_NINEZ_01' THEN 'HN:CODIGO_NINEZ' WHEN 'A04_D35_2013_01' THEN 'HN:DECRETO_35_2013' WHEN 'PILOTO_D284_2013_01' THEN 'HN:DECRETO_284_2013' END
   AND b.revision_pendiente=true AND b.es_norma_vigente IS NULL AND b.embedding=array_fill(0::real, ARRAY[384])::vector
   AND encode(sha256(convert_to(b.contenido,'UTF8')),'hex')=e.hash_contenido;
 IF n<>49 THEN RAISE EXCEPTION '01_datos_02: % de 49 filas no coinciden con contenido, hash o estado oculto',n; END IF;
END
$verify$;
COMMIT;
