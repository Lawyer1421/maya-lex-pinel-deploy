-- 01_datos_03.sql | Solo mayalexhn-prod / thgrhueckkjdutjvcufp.
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
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:16','mayalex_normativos','10_LEYES_REGLAMENTOS','Todo niño tiene derecho al disfrute del más alto nivel posible de salud.

Corresponde a sus padres o representantes legales, fundamentalmente, velar por el adecuado crecimiento y desarrollo integral de los niños, así como a sus parientes por consanguinidad y afinidad y, en su defecto a la comunidad y al Estado.

Con tal fin, el Estado, por medio de sus instituciones especializadas:

a) Realizará campañas de orientación y educación de los niños en materia de alimentación, nutrición, salud e higiene.

b) Desarrollará programas de educación, orientación, servicio y apoyo a todos los sectores de la sociedad, en particular a los padres y madres o representantes legales de los niños, para que conozcan los principios básicos de la salud, la higiene y la nutrición, las ventajas de la lactancia materna y de los programas de vacunación, prevención de accidentes y de enfermedades.

c) Establecerá servicios médicos adecuados para la prevención, diagnóstico y tratamiento de enfermedades, así como para la rehabilitación y la reincorporación social del niño que ha sufrido algún quebranto de su salud.

ch) Establecerá en forma gradual y progresiva y apoyará el funcionamiento de clínicas de atención integral de la niñez y de bancos de leche materna en todo el territorio nacional.

d) Formulará y ejecutará programas de erradicación de prácticas tradicionales perjudiciales para la salud materna y de los niños.

e) Estimulará la práctica de la medicina alternativa que beneficie la salud materna y de los niños.

f) Procurará la aplicación de la tecnología disponible al suministro de alimentos nutritivos, al agua potable y al saneamiento básico y hará campañas de concientización sobre los riesgos de la contaminación del medio ambiente.

g) Fomentará la creación de servicios de rehabilitación de la niñez discapacitada y reforzará los existentes; y, h) Incentivará la producción nacional de alimentos y velará por la seguridad alimentaria de la niñez.','16','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":16,"article_sha256":"4cb3df6f2b72760f81a835ac074973433a5e70001be3d1b1f7db90870cc7ec6c","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','16','add81b9709f77c8af30f08ac1803a6673d8cd0b613a1219d801636e07a4297ca','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:20','mayalex_normativos','10_LEYES_REGLAMENTOS','Se prohíbe la extracción de órganos, tejidos, fluidos o células a los niños o niñas, para ser utilizados con fines ilícitos. Quienes infrinjan esta disposición serán sancionados de conformidad con lo prescrito por el Código Penal o ley especial respectiva.','20','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":20,"article_sha256":"cb1fe4d64748fdac93a055df77eea0c46bfed3cf176f37c5b1007ac61b50e52c","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','20','a73f0f4711ca1a0deac7037c1359636cfada7daefde210f1d8b93d14a4f306cc','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:30','mayalex_normativos','10_LEYES_REGLAMENTOS','Para los efectos del artículo anterior, es obligación del padre, de la madre o de los representantes legales, inscribir al recién nacido en el Registro Nacional de las Personas, de conformidad con la ley. El incumplimiento de este deber se sancionará de acuerdo con lo que prescriban las leyes especiales.','30','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":30,"article_sha256":"cb3082a087d5ef554b0c47de126a29ad1da5afb25a17cfecb91dc0ae91485797","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','30','a0afe03b1f4ea1f837fb1e90157aa37e57d3a774ee26e958c3403020d89f15ca','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:39','mayalex_normativos','10_LEYES_REGLAMENTOS','Las autoridades escolares, los padres o representantes legales de los niños y los maestros velarán porque el ambiente y tratamiento escolar constituyan un incentivo para evitar la deserción, la repitencia y el ausentismo.

La Secretaría de Estado en el Despacho de Educación Pública adoptará las medidas que sean necesarias para que se cumpla el principio de la educación obligatoria.

Pondrá en práctica, además, programas alternativos de enseñanza adecuada para la niñez que trabaja.','39','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":41,"article_sha256":"50fe0d6f9334aa443adba4c169c151c59c74dafa5fa445051c4324a7e40b6774","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','39','43cb9071d88be4578334e7b0d564b0d44d1cef21e509b50690d880f2efc36998','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:42','mayalex_normativos','10_LEYES_REGLAMENTOS','La Secretaría de Estado en el Despacho de Educación Pública, la Universidad Nacional Autónoma de Honduras, la Universidad Pedagógica Nacional Francisco Morazán y las universidades privadas, sin menoscabo de sus respectivas competencias, realizarán las investigaciones, estudios y trabajos que sean necesarios para renovar la enseñanza tomando como base las necesidades sociales y de la producción, así como las variables culturales, étnicas, lingüísticas y de género, evitando toda forma de discriminación.','42','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":44,"article_sha256":"3db5fa5e787f2da0b3199012a3b9dbf889257b88891a17d61ec5b4db2e24c887","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','42','099297f5ff43ffef311ea4e0091ae1ada4b24f7d0543dab24addd7435b42f7df','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:45','mayalex_normativos','10_LEYES_REGLAMENTOS','Todos los centros de educación preescolar, primaria y secundaria deberán ser previamente autorizados por el Poder Ejecutivo para prestar sus servicios. Dicho Poder, asimismo, a través de las Secretarías de Estado en los Despachos de Educación Pública y de Salud Pública, dentro de la esfera de sus atribuciones, vigilará y fiscalizará el funcionamiento de aquellos.','45','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":47,"article_sha256":"b631e6d1d0a9edef32ba3c82b4838edc981461b2971b124a7dd9dd8fc885f9ce","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','45','e88b6e3b090cb6b6fdb9840ff78db9c8b7bf81c9cd3390cea1960461caab3d4c','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:52','mayalex_normativos','10_LEYES_REGLAMENTOS','Los niños tendrán libre acceso a los campos deportivos, gimnasios y demás infraestructura oficial destinada a la práctica de deportes o de actividades recreativas.

El uso de las instalaciones deportivas y de recreación a que se refiere el párrafo anterior, no se restringirá ni aún en períodos de vacaciones, salvo en los casos que con carácter general determinen los reglamentos.

Los centros de enseñanza privados y semipúblicos pondrán sus instalaciones deportivas o recreativas a disposición de la niñez para coadyuvar a su sano esparcimiento. Las condiciones a que estará sujeto su uso serán determinadas por el respectivo centro.','52','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":54,"article_sha256":"638d45938572908fb2b2a0eeec3487c00c7a2f8eac49c5e0a0a252d381f69ecb","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','52','6e6b4f3d0dcb90a1abad51ffa36d9db18c03f9f83794ef832827dca5e35eecf8','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:55','mayalex_normativos','10_LEYES_REGLAMENTOS','El Estado, en la formulación de la política ambiental, establecerá programas para educar a la niñez en la protección, conservación, restauración y manejo sostenible y racional del medio ambiente y de los recursos naturales.','55','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":57,"article_sha256":"338aab09926b892e1f57181c56dd771b89a5e3897d7802710f21c47642ffe334","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','55','346f5326bfaa20fecb16efe1177a4f7eac3b8664b33ce709f6e6b93cececd0f4','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:66','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','66','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":68,"article_sha256":"909488e441fe19cbfae8cfa6ef4d020139583e1c9db45277493c1d6a9870fae8","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','66','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:74','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','74','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":76,"article_sha256":"40ee99acd907663f17d8c9b9a79a99af1d0f6209a4af0fa19edbd0c652e3a024","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','74','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:80','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','80','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":82,"article_sha256":"9cc2c5953d80a3bd7981d59a37f66d32114c2ec4e2b98d9cda1d9bae83435e26","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','80','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:83','mayalex_normativos','10_LEYES_REGLAMENTOS','La protección de la niñez es responsabilidad de la sociedad en su conjunto, pero su cuidado directo corresponde a los padres o a sus representantes legales y, a falta de ellos, al Estado.

Tal protección se brindará con estricto apego a lo prescrito por este Código, por el Código de Familia y demás disposiciones legales aplicables a la niñez.','83','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":85,"article_sha256":"9970c47768585686bef2d5a32644c2a044a25fc480b185ad21a4387ed668bd90","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','83','fa24b1cce38db2ada7cbc130b59f764eddbeb7073652df51c26c6f350774a4b6','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:91','mayalex_normativos','10_LEYES_REGLAMENTOS','Las medidas de protección de los niños se aplicarán teniendo en cuenta sus necesidades y la conveniencia de fortalecer sus vínculos familiares y comunitarios.','91','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":93,"article_sha256":"34f1a04a7940f5dc6992acee3f2a89332140b3616ffc141dc50b8d17e51128e0","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','91','e3b97025911e0e23d3a32e5d4701ca9668804b26fd191da6446eabd09a9a77dd','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:92','mayalex_normativos','10_LEYES_REGLAMENTOS','Los jueces y demás autoridades que conozcan de asuntos relacionados con los niños adoptarán siempre que su edad y situación lo permitan, las medidas siguientes:

a) Hacer que se inscriban en el Registro Civil.

b) Matricularlos en el sistema educativo nacional, vigilar su asistencia y aprovechamiento escolar e interesarse porque participen y cooperen con asociaciones de alumnos y organizaciones de padres de familia.

c) Velar porque reciban el tratamiento que necesiten. ch) Vigilar a quienes los tienen bajo su cuidado para que actúen correctamente con ellos y les ayuden a enmendar su conducta, en su caso; y, d) Asegurarse de que sus agresores no se mantengan en contacto con ellos.','92','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":94,"article_sha256":"6e709c5c12666fe65c3ab15914461420252c9faf73d34f66b30aecca19d02638","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','92','e040ed8d1dd02cbdee843375ecdc9966d3eabe2db70ed02a0b44cdd421d3c884','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:96','mayalex_normativos','10_LEYES_REGLAMENTOS','Ninguna persona natural o jurídica podrá vender o proporcionar a un niño o niña menores de dieciocho (18) años a cualquier título:

1. Armas, municiones, explosivos y pólvora en general; 2. - Fuegos artificiales salvo aquellos que carezcan de poder explosivo; 3. - Material pornográficos o cuyo contenido induzca a la violencia o a la pretensión o a la degradación de la persona por actos de delincuencia; y, 4.- La venta de pastillas que sirven para curar frijoles y maíz.

El incumplimiento de estas disposiciones será sancionado con multa de treinta (30) a cincuenta (50) salarios mínimos en su valor más alto, sin perjuicio de la responsabilidad civil, administrativa y penal a que hubiere lugar en Derecho.','96','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":98,"article_sha256":"624dc1bac3cd6f9113bb82a815e3f69228d91e4598a07a888970a9fbc9c491fe","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','96','e00164fdce826a4c5fe7761f775e626cc70bf4116033dbdd5f7fc510e21fe2bc','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:98','mayalex_normativos','10_LEYES_REGLAMENTOS','Se prohíbe a los propietarios, representantes o administradores permitir el ingreso y permanencia de niños y niñas en moteles, pensiones y establecimientos similares, salvo si se encuentran acompañados por su padre, madre o representante legal, en defecto de estos últimos la persona responsable del niño o niña que le acompañe, deberá portar autorización por escrito, debidamente autenticada.

En el caso de los hoteles y complejos turísticos se prohíbe el ingreso y acceso de niños y niñas al área de habitaciones salvo que sean acompañados de sus padres, madres o representantes legales y en su defecto deberán acompañar la autorización debidamente legalizada.

Los(as) propietarios(as) de dichos establecimientos, están obligados(as) a dar a conocer esta prohibición, mediante avisos que colocarán en lugares visibles de su negocio.','98','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":100,"article_sha256":"f697a87710fbdd7f598a1ae7d40f6f1f854bd7d12754b73e891aaf348aade3a5","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','98','12e7f2f666cd0886dc729a5083a151ff71854fac815a8b0904376a0fb89883de','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:102','mayalex_normativos','10_LEYES_REGLAMENTOS','El padre o madre que haya sido suspendido(a) o privado del ejercicio de la patria potestad, solo podrá trasladar a sus hijos menores de dieciocho (18) años, dentro o fuera del país, previa autorización escrita de quien la deba otorgar.

En caso de no portar la referida autorización, el(la) Juez Competente, a petición de parte interesada, ordenará a las autoridades de policía se le requiera para que dentro de las veinticuatro (24) horas siguientes proceda a entregarlo(a).','102','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":105,"article_sha256":"235bf60aef4ab4920a4fb94506b7cc4811d55282a6824236c3cd947f3365f95f","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','102','993c5257592ef1f6900b4cd8f90c2f9e0ca470eff37ce370a6b3b77df484e1b6','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:102-A','mayalex_normativos','10_LEYES_REGLAMENTOS','Si la patria potestad es ejercida por ambos padres y si uno de ellos se negare a autorizar la salida del país de su hijo(a), podrá el(la) padre o madre, interesado(a) concurrir al(la) Juez(a) competente a fin de que éste(a) le autorice.

Lo establecido en este Artículo solamente será aplicable en los casos siguientes:

1) Que sea necesaria su atención médica en el extranjero; 2) Estudios, siempre que no haya oportunidades de estudio equivalentes en el país; y, 3) Viajes por motivos académicos, deportivos o artísticos, siempre que sean a cargo de las autoridades educativas, religiosas o federativas correspondientes o análogas debidamente calificadas.

En la autorización judicial deberá establecerse el destino y duración del viaje, así como el nombre de la persona a cuyo cargo estará el niño(a), en el caso de que no viaje con uno(a) de los padres.

Lo dispuesto en este Artículo será aplicable al tutor(a) o al Instituto Hondureño de la Niñez y la Familia (IHNFA), en su caso; y también se aplicará en el caso que sea imposible ubicar al padre o madre del niño o niña.','102-A','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":106,"article_sha256":"9c34537f031a8c4291182e057a565eece8eac397e087b87bff6ce0d5037b9e42","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3_ADICIONADO","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','102-A','0e7fa30a04d5cd5e960a46ca6e54c841f443d27c5f524555352ae87d39c50a6e','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:125','mayalex_normativos','10_LEYES_REGLAMENTOS','La duración máxima de la jornada de trabajo de los niños estará sujeta a las reglas siguientes:

a) El mayor de catorce (14) años y menor de dieciséis (16) sólo podrá realizar trabajos en jornadas que no excedan de cuatro (4) horas diarias.

b) El mayor de dieciséis (16) años y menor de dieciocho (18) sólo podrá trabajar en jornadas que no excedan de seis (6) horas diarias; y, c) Queda prohibido el trabajo nocturno para los niños trabajadores. No obstante, los mayores de dieciséis (16) años y menores de dieciocho (18) podrán ser autorizados para trabajar hasta las ocho (8) de la noche siempre que con ello no se afecte su asistencia regular a un centro docente ni se cause perjuicio a su salud física y moral.','125','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":130,"article_sha256":"25a7856e60598f34c46cf99338cb898516a4a24d6eb63d207455f081e5b0e466","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','125','f32500bbcebc850bb303ac118c04ba4e309597c99e24bbd50189fc3036236bb6','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:130','mayalex_normativos','10_LEYES_REGLAMENTOS','La enseñanza se impartirá conforme a programas aprobados por el Instituto Nacional de Formación Profesional (INFOP). Este organismo, además, vigilará la forma en que se imparta la enseñanza y adoptará las medidas correctivas que considere adecuadas.

Lo dispuesto en este artículo será aplicable a la enseñanza que se imparta en los centros a que sea enviado un niño y en las escuelas de artes, oficios o industrias reconocidas por el Estado.','130','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":135,"article_sha256":"c1b20eea61377c9d72b27404517ff7d2bbf0a2699f0bf0b3051438348fd0cef8","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','130','357817dc3be5d56c761f88ae471731e444c1d8a8d4db3b0bcee4fcc5663c9ea9','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:140','mayalex_normativos','10_LEYES_REGLAMENTOS','Los niños y niñas cuyos derechos son vulnerados, quedan sujetos(as) a las medidas de protección consagradas en el presente Título.','140','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":145,"article_sha256":"e803e512ecf3b402eb10a289f7a40b67d56d4ce5709e45b3a53ebd876feeac41","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','140','3b5a686fcd1b9652777bfbd13509350f175b2926f7497911eb09ff5ac878a71c','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:142','mayalex_normativos','10_LEYES_REGLAMENTOS','Toda persona o institución que tenga conocimiento de la situación de abandono de un niño o niña, deberá denunciarlo al Instituto Hondureño de la Niñez y La Familia (IHNFA), Policía, Ministerio Público, Juzgados de Paz, Comisionados Municipales de Derechos Humanos, Defensorías de la Niñez y Mujer, para asegurar las medidas urgentes de protección e interponer la denuncia para el ejercicio de la acción penal.','142','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":147,"article_sha256":"d91c65861a5a1f061a4f310b0c81387a66d6cbf6f158ec3dbd74ebade3108654","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','142','87ecb3f3fdbcdcddbc5be8dbd011a1201fc2fc32342250ecb0c3ec68d1cf69de','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:148','mayalex_normativos','10_LEYES_REGLAMENTOS','En los asuntos a que se refiere esta Sección el Instituto Hondureño de la Niñez y la Familia (IHNFA) procederá de conformidad con la Ley de Procedimiento Administrativo. La correspondiente resolución que emita siempre será motivada y contra ella cabrán los recursos de reposición y apelación subsidiaria ante el órgano superior jerárquico.','148','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":158,"article_sha256":"7476d2a36319f4c23e8677c2e49894394c59764689a2eb055266a193c16e64d1","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','148','8a2f770876bbf108c52dc54b80d018edd78db9838695a201f4f4796e9274c5cd','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:153','mayalex_normativos','10_LEYES_REGLAMENTOS','El Poder Ejecutivo, por medio de la Secretaría de Estado en los Despachos de Interior y Población, reglamentará a iniciativa del Instituto Hondureño de la Niñez y la Familia, todo lo relacionado con las medidas de protección a que se refiere en la presente Sección.','153','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":163,"article_sha256":"7a5fb68e917419375f7c89aac70d06f8dd1e6bed95f5f46b50981cc77254f766","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','153','34808dc1700175e9861b09de1f1bd3375608396db032bb70396f5c0f49da0213','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:164','mayalex_normativos','10_LEYES_REGLAMENTOS','El maltrato por Supresión implica todo aquel trato, disimulado o no, como medidas disciplinarias o correctivas, que tiendan a negar al niño o niña el goce de sus derechos.

Este maltrato comprende toda supresión o discriminación que conlleve perjuicio al niño o niña, incluida la exclusión del hogar y la negación del goce y ejercicio de sus libertades; el derecho a la asistencia familiar, a la atención médica y a los medicamentos que requiera, el acceso a un ambiente infantil y a actividades y áreas recreativas o a recibir visitas de otros niños o niñas respecto de los cuales no hay causa justa para considerarlas perjudiciales.','164','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":174,"article_sha256":"f3fb5703a24a1b5a0022d9fd3ac118044144e5293b55bf211ce4727f14b88e82","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','164','d0402378d9c7d9c8d55c1597169c01f26a03f37017a8c0844a0e62ea8265f271','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:183','mayalex_normativos','10_LEYES_REGLAMENTOS','Cuando en un proceso de jurisdicción ordinaria, resulte implicado un Niño(a), el Juez se declarará incompetente y sin tardanza lo pondrá a la orden del Juez de la Niñez competente o al que haga sus veces, con el testimonio del respectivo expediente.

De igual forma procederá El Juez de la Niñez, si en el transcurso de un Proceso, se comprobare que la persona a quien se le imputa el Hecho Delictivo excede la edad establecida para el mismo, al momento de su comisión.

Si se tratara de un menor de doce (12) años de edad, el Ministerio Público o el Juez, según el caso, lo pondrá inmediatamente en libertad, entregándoselo a sus padres o responsables. En ausencia de éstos o en caso que resulte notoriamente perjudicial entregárselo a ellos, quedará a disposición del Juez competente para que adopte las medidas de protección que correspondan.

La violación de lo establecido en este Artículo dará lugar a que se aplique al responsable la medida disciplinaria correspondiente.','183','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":195,"article_sha256":"b18804faf17e1c8f4fd57957f899471e7c7e68116f85d18d04130acd6200556e","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','183','daab35f9cd21c9a105f5f9bd03343b3045d4248761a093159458ffdaae7dd089','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:194','mayalex_normativos','10_LEYES_REGLAMENTOS','Las partes podrán solicitar en cualquier momento del Proceso hasta antes que quede firme la sentencia, audiencia para la revocación o sustitución de la Detención Cautelar por otra Medida menos gravosa, la cual tramitará conforme al Artículo 188 del Código Procesal Penal.

Dicha audiencia tendrá lugar dentro de las veinticuatro (24) horas siguientes a la fecha en que se haya presentado la respectiva petición, debiéndose celebrar con la comparecencia de las partes y resolverse en la misma.','194','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":207,"article_sha256":"448db49cc9e9847ae42ef1d5aac3395334c1881a01bdadf02e9dcb3fcf0396b1","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','194','a1608e634a33f2651fa688c7513605f9c75f7fcbae0553208416c2d3c69f2aef','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:210','mayalex_normativos','10_LEYES_REGLAMENTOS','El Estado creará progresivamente la Jurisdicción Especial de la Niñez Infractora de La Ley, la que estará integrada por:

a) Jueces de Garantías; b) Jueces de Juicio; c) Jueces de Ej ecución; y, d) Tribunales de Apelaciones.

En tanto ésta se crea, el Estado garantizará que al funcionario que haya ejercido la función de Juez de Garantías en un determinado Proceso, no se le asigne el conocimiento de su juzgamiento ni su ejecución.

Para tales efectos, por medio de las instancias respectivas, adoptará las medidas generales y particulares que aseguren una adecuada distribución de competencias entre los Jueces de Letras de Niñez y los Jueces de Letras Seccionales.','210','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":223,"article_sha256":"188b26946789cbf202198bae6d7b8a6595d7be59e5f307c867fd43bbfa10b3c2","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','210','898be465bf6ed1290f11a1600cd1b6d45837c331dc4bb95fb3b388483756df83','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:213','mayalex_normativos','10_LEYES_REGLAMENTOS','Corresponde al Juez de Ejecución:

a) Controlar que la ejecución de toda Sanción se conforme con la sentencia que la impuso, garantizando la legalidad y demás derechos y garantías que asisten al Sancionado; b) Revisar las sanciones de oficio o a solicitud de parte al menos cada tres (3) meses, para cesarlas modificarlas o sustituirlas por otras menos gravosas cuando no cumplan con los objetivos para los que fueron impuestas o por ser contrarias al proceso de reinserción social; c) La vigilancia y control de la ejecución de las sanciones así como velar por la correcta aplicación de las normas que regulan el régimen de privación de libertad; d) Controlar el otorgamiento o denegación de cualquier beneficio relacionado con las sanciones impuestas; e) Ordenar la cesación de la sanción una vez transcurrido el plazo o condición fijado por la sentencia y enviar

las comunicaciones a la institución estatal responsable de la Ejecución; f) Atender las solicitudes que hagan los Sancionados, dar curso a sus quejas cuando así lo amerite la situación y resolver lo que corresponda; g) Corregir los abusos y desviaciones que puedan producirse en el cumplimiento de los preceptos contenidos en este Código, relacionados con sus competencias; h) Visitar los centros de Ejecución o cumplimiento de la sanción privativa de libertad, al menos una (1) vez al mes y formular las recomendaciones necesarias; i) Conocer y resolver los reclamos sobre las decisiones de los órganos directivos, administrativos y técnicos de los Centros Especializados de Privación de Libertad; y, j) Las demás responsabilidades que éste Código y las leyes le atribuyan.','213','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":226,"article_sha256":"af64ffc4efbfb7a9bbf96a89561d9813f2ef8b2cfd1385b2a01cdf87d23c9679","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','213','e43b28e88bec684ce348f1ec7ae28da1040f62a7e4d14b7770223d3358594634','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:216','mayalex_normativos','10_LEYES_REGLAMENTOS','Son Formas Alternativas o Simplificadas de Solución de los Conflictos sometidos a la Jurisdicción Especial de la Niñez, las siguientes:

a) Criterio de Oportunidad; b) Conciliación; y, c) Suspensión del Proceso a Prueba".','216','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":229,"article_sha256":"b3e00a784b9107cbd76584aa66d5624fd5493624cab66e798dd4141ceaa0ee60","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','216','34ce94c60fb5bc6be5a997aa9aff141d4e18d11450f2cfdaf714433c78dd9f05','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:235','mayalex_normativos','10_LEYES_REGLAMENTOS','Recibidas las diligencias, el Juez de Juicio señalará audiencia de proposición de prueba, dentro de los cinco (5) días siguientes, citando a las partes para tal efecto. Los medios de prueba serán propuestos con indicación de los hechos o circunstancias que se pretenda probar.

En esta audiencia, las partes presentarán la lista de los testigos y peritos con indicación de sus nombres y apellidos, profesión u oficio y dirección exacta, señalando los hechos sobre los cuales deberán ser examinados durante el debate.

Asimismo propondrán los documentos y demás medios con los que pretenda probar las pretensiones deducidas en el Juicio y señalarán en su caso, el lugar en que se encuentran.

Propuestas las pruebas y oídas las alegaciones que al respecto hagan las partes, el Juez resolverá mediante auto motivado sobre su admisión, en la misma audiencia o en el plazo de los tres (3) días.

Solamente podrán ser rechazados los medios de prueba manifiestamente impertinentes, inútiles o desproporcionados en relación con la finalidad probatoria que se pretende, así como los meramente dilatorios o, cuando se trate de prueba ilícita.

En el acto que notifique la resolución, el Juez señalará fecha y hora para la Audiencia de Debate, la que tendrá lugar dentro de los quince (15) días siguientes a la misma.','235','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":248,"article_sha256":"8ef6ca8c56383e7a05368dd215c2acf191c0bffe583ba8b7287e40ebde8d6f7f","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','235','1488f621b3766f2dcb6539b9595739cbcf27bd853705497bac23beb8ec0f3b85','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:243','mayalex_normativos','10_LEYES_REGLAMENTOS','La Ejecución de las sanciones deberá procurar que el Sancionado alcance su desarrollo personal integral, la inserción a su familia y a la sociedad, así como el desarrollo pleno de sus capacidades y su sentido de responsabilidad.

Para lograr los objetivos de la Ejecución se promoverá:

a) Satisfacer sus necesidades básicas; b) Posibilitar su desarrollo personal; c) Reforzar su sentimiento de dignidad y autoestima;

d) Incorporarle activamente en la elaboración ejecución de su Plan de Atención Individual; e) Minimizar los efectos negativos que la Sanción pudiera tener en su vida futura; f) Fomentar, cuando sea posible y conveniente, los vínculos familiares, sociales y culturales que contribuyan a su desarrollo personal; y, g) Promover las redes sociales entre el Sancionado, la familia y la comunidad.','243','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":256,"article_sha256":"be8b202a6a37c9cf8a4842c49ea7fc721eabfde3dc24e213539d84d964aed53e","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','243','664bbea5e115e9cf6fda9fecc15d83cef468b7f2dcdec6667c13d21825cdc6fe','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:246','mayalex_normativos','10_LEYES_REGLAMENTOS','El Instituto Hondureño de la Niñez y la Familia (IHNFA) dará seguimiento y evaluará el Plan de Atención Individual, debiendo informar trimestralmente al Juez de Ejecución competente sobre los avances, obstáculos e incidencias, así como del ambiente familiar y social en que el Sancionado se desarrolle.

De ser necesario le realizará ajustes, debiendo informar de inmediato al Juez de Ejecución, para su confirmación, modificación o revocatoria.','246','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":259,"article_sha256":"cb8d5b425437507ac50eae576b8c4d590242a911e3bf4ac606b3e64b0c4d4e1c","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','246','1ed40f1804a2ad3aa9d6192430789dccc1ff4f6537b2d89828dbeb5ef09105bc','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:251','mayalex_normativos','10_LEYES_REGLAMENTOS','Para efectos de la Ejecución de la Prestación de Servicios a la Comunidad, las tareas de interés general que el Sancionado realice serán gratuitas.

Serán cumplidas en establecimientos públicos o privados sin fines de lucro, durante horas que no interrumpan sus estudios y/o el trabajo. Esta Sanción se cumplirá de preferencia en los programas comunitarios del lugar de origen o domicilio del Sancionado, respetando su origen étnico, cultural e ideología.

El Juez citará al Sancionado y a sus padres o responsable legal, para informarle de los términos en que se deberá cumplir el servicio comunitario.','251','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":264,"article_sha256":"b66cacbd3222e77a680aab10f0918c148d8836ce695d4d89c7a1804fc1eb7055","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','251','add11388c37759e451f266aab6e81dadacef0482da853eae440a4f57cc934fc4','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:253','mayalex_normativos','10_LEYES_REGLAMENTOS','La Ejecución de la Reparación del Daño a la Víctima, aplicará cuando resultare afectado el patrimonio de ésta y se llegare a un adecuado acuerdo para reparar de inmediato el daño causado. En este caso, el Juez podrá ordenar:

a) La devolución de la cosa afectada; b) La reparación de la cosa afectada; o, c) El pago de una justa indemnización.

Para la sustitución de la reparación del daño a la víctima por una suma de dinero, se procurará en todo caso que este provenga del esfuerzo propio del Sancionado, así como que no provoque un traslado de su responsabilidad personal hacia sus padres o representantes.

En caso que proceda la sustitución y no esté determinada en la sentencia, el Juez valorará los daños causados a la víctima, con el fin de fijar el monto a pagar.

Cuando la reparación no sea inmediata, la sentencia deberá contener al menos:

a) La forma en la cual se reparará el daño, la que estará relacionada con el perjuicio causado por la infracción; b) El lugar donde se debe de cumplir la reparación o resarcimiento del daño; c) El plazo en el que se debe reparar el daño; y, d) Los días y horas dedicados a tal efecto, los cuales no podrán afectar sus estudios u ocupaciones laborales.','253','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":266,"article_sha256":"15a6a529e749e2a0f3650a864f206dbb24fffd2ef687975ce8780d1f4c08d198","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','253','ab442c71b20eb4e8f6a91bd2b633bf0d54a4b96660f11f1c360d1e089c21e8d3','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:266','mayalex_normativos','10_LEYES_REGLAMENTOS','Las acciones que tengan como finalidad restablecer a un niño en el goce de sus derechos serán ejercitadas ante el Juez de la Niñez competente.

Las acciones en esta materia serán públicas.

En los correspondientes juicios se procederá breve y sumariamente.','266','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":279,"article_sha256":"a0aa4745c523ca0bfc37b36b2055dc180eaecd03cccfa09017885faef9b43846","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','266','ea3f778929246de6c8528f2e2fb1d8db7d459a13bf84519d9a789fb12f9a2c09','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:267','mayalex_normativos','10_LEYES_REGLAMENTOS','En el juicio que tenga por objeto una obligación de hacer o no hacer respecto a los derechos sociales y difusos de un niño, el juez ordenará su cumplimiento o dictará providencias que le aseguren su resultado en un plazo razonablemente breve.','267','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":280,"article_sha256":"2c3205529c846c8a667acf58f760ad9342a362e9c0b179895d2ea89ece824015","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','267','86dbd1717a9af98a975d0e90c532d9c631477f38b3b4bc6bf5cd42ca2e18363d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:274','mayalex_normativos','10_LEYES_REGLAMENTOS','El Instituto Hondureño de la Niñez y la Familia creará consejos, procuradurías de niños u otros organismos de carácter local para que colaboren con ella en su labor de protección y promoción de los derechos de los niños y en la detección de amenazas o violaciones de tales derechos.','274','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":287,"article_sha256":"8e5b1617450c490edc966a52ca8d75b5de4be7376dbfd8966a3f5526b719cb2c","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','274','a3acce95ac0e3a8e970888e68e1b8a00ba58620fb5481e4b50a7dd3054618c65','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:281','mayalex_normativos','10_LEYES_REGLAMENTOS','Las multas a que este Código se refiere serán pagadas en la Tesorería General de la República o en las instituciones del sistema financiero que la Secretaría de Estado en los Despachos de Hacienda y Crédito Público haya autorizado para efectuar recaudaciones por cuenta del Estado.

La interposición de recursos contra las multas impuestas no suspenderá la obligación de pagarlas inmediatamente. En caso de contravención, las que se encuentren pendientes devengarán el interés activo más alto que se halle vigente en el sistema bancario nacional.','281','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":295,"article_sha256":"d791050b77f958e5b9583664aa67adc52107a402f59a7c7f9c792ce0fe8007cc","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','281','f42d30a3dae861c7adf3db9a6c20744ac7c8a996785475267dbc795e39f09cc8','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:283','mayalex_normativos','10_LEYES_REGLAMENTOS','Los asuntos relacionados con infracciones a la ley penal que se encuentren en trámite a la fecha de entrada en vigencia del presente Código, se tramitarán y resolverán de acuerdo con lo prescrito por la Ley de Jurisdicción de Menores. Las medidas a aplicar, sin embargo, serán las previstas en este Código.','283','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":297,"article_sha256":"9999b5b9085f500527c7c887c4a2c7408b0fcecdb720b3e520354c448db51462","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','283','ac41ae459faf5c45734a4449bfbb043a1f171681cbf1deec5162f1230122fb89','A03_CODIGO_NINEZ_01',now()),
('A04_D35_2013_01:DECRETO_35_2013:4','mayalex_normativos','10_LEYES_REGLAMENTOS','Reformar los Artículos 11,16,23,30,39,
85, 86, 120, 123, 123A, 123B, 134, 157, 158, 159, 161, 163,
188, 191, 192, 211, 228, 238, 255, 267, 282, 320, 331, del
CÓDIGO DE FAMILIA emitido mediante Decreto No.76-84
de 16 de Agosto de 1984, los cuales se leerán así:

"ARTÍCULO 11.- Se reconoce el derecho del hombre y
de la mujer, que tengan la calidad de tales naturalmente, a
contraer matrimonio entre sí, así como la igualdad jurídica
de los cónyuges.

Sólo es válido el matrimonio civil celebrado ante funcionario
competente y con las condiciones requeridas por la Ley.

Se prohíbe el matrimonio y la unión de hecho entre personas
del mismo sexo. Los matrimonios o uniones de hecho entre
personas de los mismos sexos celebrados o reconocidos
bajo las leyes de otros países no tendrán validez en
Honduras."

"ARTÍCULO 16.- La mayoría de edad se obtiene al
cumplirse los veintiún (21) años. Sólo las personas mayores
de edad gozan de libre aptitud para contraer matrimonio.

Sin embargo, podrán contraerlo el varón y la mujer mayor
de dieciocho (18) años, siempre que medie autorización
otorgada conforme a este Código.

Quedará, no obstante, convalidado sin necesidad de
declaración expresa, el matrimonio entre personas que no
hubiere cumplido la edad a que se refiere el párrafo anterior,
siempre que el cónyuge menor cumpla Dieciséis (16) años o
por el hecho de la existencia de embarazo o hubiere
concebido antes de llegar esa edad."

"ARTÍCULO 23.- El matrimonio debe autorizarse por el
Alcalde Municipal del domicilio de los contrayentes o el de
cualquiera de ellos, a elección de los mismos.

Lo(as) Notarios(as) Públicos quedan autorizados para
celebrar matrimonios en todo el país.

El matrimonio celebrado en el extranjero será válido en
Honduras, sin perjuicio de lo establecido en el párrafo último
del Artículo 11 de este Código."

"ARTÍCULO 30.- El matrimonio se formalizará con la
solemnidad y dignidad que el acto que por su significación
social requiere, compareciendo ante el(la) funcionario(a)
competente o el(la) notario(a) los contrayentes o uno de
ellos y la persona a quien el(la) ausentes hubiere otorgado
poder especial para representarlo(a), acompañado de dos
(2) testigos mayores de edad, que no sean parientes de los
contrayentes.

El (la) funcionario(a) leerá de viva voz el contenido de los
Artículos 40,41,42 y 64 de este Código, orientando a los
contrayentes sobre los mismos, a continuación les preguntará
a cada uno de ellos si comprende los alcances de las
disposiciones legales en referencia y si persisten en la
normalización del matrimonio y cuál de los sistemas de
disposición de los bienes adoptan, debiendo hacer constar
en el acta con todas las circunstancias necesarias para hacer

constar que se han cumplido las diligencias prevenidas en
este Código.

El Acta será firmada por el(la) funcionario(a) competente,
los contrayentes si supieren y los(as) testigos, autorizándola
el(la) secretario(a) cuando el matrimonio se celebre ante los
oficios de un(a) funcionario(a) del gobierno local de los
indicados en este Código.

Se prohíbe al(la) Registrador(a) Civil la inscripción de
matrimonios sin cumplir con lo establecido en cuanto a la
disposición de bienes."

"ARTÍCULO 39.- El(la) Funcionario(a) competente o
Notario(a) no autorizará la celebración del matrimonio
mientras no se le presente:

1) ...
2) ...
3) ...
4) ...
5) ...
6) Constancia del Registro Nacional de las Personas de
no estar comprendido(a) en las prohibiciones para
contraer matrimonio contenidas en los Artículos 19 y
20 de este Código; y,
7) Constancia de Antecedentes Penales, para acreditar
no estar comprendidos en la prohibición contenida
en el Artículo 20 No. 6 de este Código."
i
"ARTÍCULO 85.- Sólo puede fundarse un patrimonio para
cada familia, por el padre o la madre sobre los bienes propios,
o por el marido o mujer sobre bienes comunes de la sociedad
conyugal. También puede constituirse por un tercero a título
de donación o legado o por mandato de Juez(a) competente
cuando lo considere oportuno en procura de la protección
del interés superior de los hijos e hijas."

"ARTÍCULO 86.- Los bienes constituidos en patrimonio
familiar no excederán de UN MILLÓN DE LEMPIRAS
(L. 1,000,000.00) y son indivisibles, inalienables,
inembargables y no podrán estar gravados ni gravarse, salvo
el caso de servidumbre legal y judicial.

La referida cantidad será ajustada por el(la) Juez(a)
competente con base al índice de inflación vigente.

Sin embargo, el(la) Juez(a) competente puede autorizar la
venta o gravamen de un bien constituido como patrimonio
familiar, siempre que se cumpla con todos los requisitos
siguientes:

1. Signifique un incremento en el patrimonio originalmente
constituido;
2. Se acredite que el producto de la venta será
constituido como patrimonio familiar;
3. El nuevo patrimonio sea de iguales o mejores
condiciones del originalmente constituido, de manera
que se garantice el derecho de los(las) beneficia-
rios(as);
4. En el caso que el producto de la venta supere el techo
establecido para la constitución de un patrimonio, el
excedente será invertido preferentemente en provecho
de los(las) beneficiarios(as) del mismo, sin que se
pueda destinar a tal fin un porcentaje menor al
cincuenta por ciento (50%); y,
5. Venta o gravamen por causas de necesidad extrema,
debidamente acreditadas ante el(la) Juez(a)
competente, quien la autorizará."

"ARTÍCULO 120.- Quien desee adoptar, deberá llenar
los requisitos siguientes:

1) Ser mayor de veinticinco (25) y menor de cincuenta
y uno (51) años;
2) Ser casado(a) o compañero(a) de hogar con unión
de hecho debidamente legalizada conforme a la
legislación del país y tener como mínimo tres (3) años
de convivencia;
3) Estar en el goce y ejercicio de sus derechos civiles;

4) Ser de buena conducta y reputación; y,
5) Tener capacidad para educar, asistir y alimentar a la
persona adoptada.

En el caso del numeral 1) de este Artículo, se considerará
cumplido el requisito con que uno de los cónyuges haya
arribado a la edad mínima establecida. Este requisito podrá
ser dispensado por el(la) Juez(a) competente en aplicación
del principio de Interés Superior del Niño o Niña, en cuyo
caso deberá motivar tal circunstancia en la Sentencia
respectiva.

En el caso del numeral 2) de este Artículo deberán proceder
de común acuerdo.

El(la) Juez(a) competente, excepcionalmente podrá otorgar
la adopción a un(a) adoptante que no cumpla con el requisito
de ser casado(a) o estar en unión de hecho legalizada, en
aplicación del Interés Superior del Niño o Niña, debiendo
motivar las razones que fundamentan su decisión en la
respectiva Sentencia, previa opinión ilustrada del Ministerio
Público y del Instituto Hondureño de la Niñez y la Familia
(IHNFA)."

"ARTÍCULO 123.- El consentimiento de la o las personas
adoptadas o de sus representantes legales, es indispensable
para la adopción y deberá darse de conformidad con las
reglas siguientes:

1) Si es mayor de edad, lo dará personalmente;
2) Si está sujeto a tutela, lo dará su tutor(a), con
autorización del juzgado competente;
3) Si es menor de edad, lo dará quien o quienes ejerzan
la patria potestad con autorización del juzgado
competente; y,
4) Si se trata de niños y niñas declarados en estado de
abandono, lo dará(la) el representante del Instituto
Hondureño de la Niñez y La Familia (IHNFA) con
autorización del Juzgado competente."

"ARTÍCULO 123-A.- Se prohíbe al padre, madre o
representante legal del niño o niña, recibir pago o gratificación
alguna en recompensa por la adopción.

Igual prohibición aplica a la persona que pretenda adoptar,
así como a sus intermediarios o terceras personas."

"ARTÍCULO 123-B.- Cuando el(la) Juez(a) que conozca
de la adopción, tenga indicio racional de haberse cometido
un delito, denunciará los hechos punibles al Ministerio
Público, para que ejerza las acciones correspondientes."

"ARTÍCULO 134.- Cualquier persona con interés contrario
a la adopción puede oponerse ante juez(a) competente, antes
de que dicte la correspondiente Sentencia, exponiendo las
razones de su inconformidad y aportando las pruebas que
sean pertinentes.

En todo caso, el(la) Juez(a) competente podrá desestimar
la oposición si no cumple los requisitos o formalidades legales
o en función del Interés Superior del niño o niña."

"ARTÍCULO 157.- La adopción establece parentesco civil
entre el(la) adoptante y adoptado(a), formando parte de
sus correspondientes familias.

A partir de la fecha de inscripción de la adopción en el
Registro Civil, el adoptado llevará el apellido de él(la) o los
adoptantes."

"ARTÍCULO 158.- Por la adopción, el(la) adoptado(a)
deja de pertenecer a su familia biológica o consanguínea y
se extingue el parentesco por consanguinidad con la misma,
no siéndole exigibles obligaciones por razón de parentesco
con sus descendientes o colaterales consanguíneos.

No obstante, quedan vigentes los impedimentos
matrimoniales contemplados en este Código respecto de la
familia biológica.

Si el,adoptante es el cónyuge del padre o madre biológico
del(la) adoptado(a), éste conservará los vínculos de
consanguinidad que lo unen con su padre o con su madre y
con los parientes por consanguinidad de aquel o ésta."

"ARTÍCULO 159.- La adopción es irrevocable, e
inimpugnable y no expira en ningún caso.

Adoptado un niño o niña, nadie podrá ejercitar acción alguna
para establecer su filiación consanguínea, ni para
reconocerlo(a) como hijo(a)."

"ARTÍCULO 161.- A solicitud de los adoptantes, el
Tribunal competente podrá acordar la modificación del
nombre propio del(la) adoptado(a), siendo necesario el
consentimiento del adoptado(a) si ha cumplido dieciocho
(18) años de edad y no se encontrare en imposibilidad
permanente de prestarlo. Tal consentimiento debe ser simple
y prestado libre y personalmente."

"ARTÍCULO 163.- Si por cualquier circunstancia, los
adoptantes cesaren en el ejercicio de la patria potestad, se
le nombrará tutor al(la) adoptado(a)."

"ARTÍCULO 188.- Si los padres fueren menores de edad,
la representación legal, guarda y cuidado, alimentación,
asistencia, educación y administración de sus bienes, será
ejercida conjuntamente por la persona que tenga la patria
potestad o la tutela sobre el padre o madre.

En el caso de que una niña conciba antes de arribar a los
dieciocho (18) años de edad, seguirá sujeta a la Patria
Potestad sobre ella.

El niño o niña concebido estará sujeto(a) a la Patria Potestad
conjunta de los padres o representantes legales de ambos
progenitores si éstos fueran menores de dieciocho (18) años
de edad, hasta que cumplan la mayoría de edad. En este
caso, salvo causa justificada la guarda y cuidado del niño o
niña nacido estará preferentemente a cargo de los padres o
representantes legales de la madre, debiendo permanecer
con la misma.

En el caso que contraigan matrimonio quedarán habilitados
de edad para ejercer la patria potestad por si mismos, aunque
sean menores de veintiún (21) años de edad.

En todo caso ambos padres y por ende sus representantes
legales tendrán las obligaciones a las que se refiere este
Código."

"ARTÍCULO 191.- Los padres en el ejercicio de la patria
potestad tienen el derecho de ejercer la orientación, cuidado
y corrección de sus hijos, e impartirles en consonancia con
la evolución de sus facultades físicas y mentales, la dirección
y orientación que sea apropiada para su desarrollo integral.

Queda prohibido a los padres y a toda persona encargada
del cuidado personal, crianza, educación, tratamiento y
vigilancia, sean éstas de manera temporal o definitiva, utilizar
el castigo físico o cualquier tipo de trato humillante,
degradante, cruel e inhumano, como forma de corrección o
disciplina de niños, niñas o adolescentes.

El Estado, a través de sus instituciones competentes,
garantizará:

a) La ejecución de programas de sensibilización y
educación dirigidos a padres, así como a toda persona
encargada del cuidado, tratamiento, educación o
vigilancia de los niños, niñas y adolescentes, tanto a
nivel nacional como local; y,

b) La promoción de formas de disciplina positivas,
participativas y no violentas que sean alternativas al
castigo físico y otras formas de trato humillante."

"ARTÍCULO 192.- Los padres no pueden enajenar,
arrendar, ni gravar los bienes de los hijos(as) sujetos(as) a

Patria Potestad, ni contraer en nombre de ellos(as)
obligaciones que excedan los límites de una normal
administración, sino por causa justificada de absoluta
necesidad y utilidad en beneficio del(la) niño(a), previa
autorización del tribunal competente y con intervención del
Ministerio Público.

En el caso de bienes muebles no será necesaria la autorización
cuando su valor no excediere de dos (2) salarios mínimos
en su valor más alto.

Igualmente no podrán hacer donación de ninguna parte de
los bienes del(la) hijo(a) ni aceptar o repudiar una herencia
deferida al mismo, sino en la forma y con las limitaciones
impuestas a los(as) tutores(as) y curadores(as)."

"ARTÍCULO 211.- Se deben alimentos:

1) Al cónyuge y a los descendientes consanguíneos(as)
y la mujer grávida del hijo(a) que está por nacer;
2) A l hijo(a) discapacitado aun cuando fuere mayor de
edad;
3) Al padre y la madre consanguíneos;
4) A los(as) abuelos(as) y demás ascendientes
consanguíneos(as), matrimoniales o extramatri-
moniales;
5) A los hermanos(as) consanguíneos discapacitados(as)
o menores de edad;
6) A quien hizo una donación cuantiosa, si no hubiese
sido rescindida o revocada;
7) A la persona con quien el(la) testador(a) vivió como
si fuera su cónyuge durante los cinco (5) años que
precedieren inmediatamente a su muerte o con quien
tuvo hijos, siempre que ambos hayan permanecido
libres del matrimonio durante su convivencia y que
el(la) sobreviviente esté impedido(a) para trabajar y
no tenga bienes suficientes. Este derecho sólo
subsistirá mientras la persona de que se trate no
contraiga nupcias. Si fueren varias las personas con
quien el(a) testador(a) vivió como si fueran su
cónyuge, ninguna de ellas tendrá derecho a alimentos;
y,
8) El adoptante al(la) adoptado(a) y éste (a) a aquel(a)."

"ARTÍCULO 228.- Es anulable el matrimonio:

1) Cuando se contrajere por quienes carezcan de la
capacidad legal para hacerlo;

2) Cuando se contrajere mediando error en la persona,
coacción o intimidación que vicie el consentimiento;
y,
3) Por impotencia absoluta que impida la relación
marital."

"ARTÍCULO 238.- Son causas de divorcio:
1) La infidelidad de cualesquiera de los cónyuges;
2) Los malos tratos físicos, psicológicos, sexuales,
patrimoniales y/o económicos de uno de los cónyuges
contra el otro o contra los hijos(as), que hagan
insoportable la vida en común;
3) El atentado de uno de los cónyuges contra la vida del
otro o de los hijos(as);

4)

5)
6) El uso de drogas heroicas y estupefacientes, los juegos
prohibidos o al consumo nocivo de alcohol por parte
de uno de los cónyuges, cuando amenazaren con
causar la ruina de la familia o constituya un motivo de
desavenencia conyugal;
7) ...;y
8)

"ARTÍCULO 255.- El(la) cónyuge inocente gozará de la
pensión alimentaria mientras esté imposibilitado(a) para
agenciarse ingresos que le aseguren medios de subsistencia
siempre y cuando no contraiga nuevo matrimonio."

"ARTÍCULO 267.- La tutela testamentaria se instituye en
cualquiera de los siguientes casos:

1) Por el padre o la madre sobreviviente, para los
hijos(as) que estén bajo su Patria Potestad;
2) Del padre al hijo(a) que se encuentre en el vientre
materno, para el caso en que nazca vivo(a), y muera
la madre sin nombrarle tutor(a);
3) Por el abuelo(a), para los nietos(as) que están bajo
su tutela legítima;
4) Por cualquier testador, para el que instituya heredero
o legatario; si éste careciere de tutor(a) nombrado(a)
por el padre o la madre y de tutor legítimo; y,
5) Por el(la) adoptante o adoptantes que designe
heredero(a) o legatario(a) a su hijo(a) adoptivo(a)."

"ARTÍCULO 282.- No puede ser tutor(a) ni protutor(a):

1) El(la) menor de edad ni el incapacitado(a);
2) Quien hubiere sido condenado(a) por robo, hurto,
estafa, falsedad, delitos contra la libertad e integridad
física, psicológica y sexual de las personas, violencia
doméstica, violencia intrafamiliar, maltrato por
transgresión, explotación económica, explotación
sexual comercial, adopción ilegal u otros delitos de
orden común que merezcan pena mayor de dos (2)
años;
3) Quien hubiere sido removido(a) de otra tutela, o no
hubiere rendido cuentas de su administración, o si
habiéndolas rendido, no estuviesen aprobadas;
4) El(la) ebrio(a) consuetudinario(a), quien habitualmente
consuma drogas, sustancias psicotrópicas o
estupefacientes; sea adicto a los juegos prohibidos,
el(la) vago(a) y el(la) de notoria mala conducta;
5) El(la) fallido(a) o concursado(a), mientras no haya
obtenido su rehabilitación;
6) Quien tenga pendiente litigio propio o como
representante legal de tercera persona o de sus
ascendientes, descendientes o cónyuge, con el(la)
niño(a) o incapacitado(a);
7) Quien haya perdido el ejercicio de la Patria Potestad
o la administración de los bienes de sus hijos(as);
8) El(la) acreedor(a) o el deudor(a) del (la) niño(a) por
cantidad apreciable en relación con los bienes del (la)
niño(a), a juicio del(la) Juez(a), a menos que con
conocimiento de causa, haya sido nombrado por
testamento;
9) Quien no tenga domicilio en la República;
10) El(la)ciego(a);
11) El que padezca de enfermedad incurable o contagiosa;
12) El padrastro o madrastra de su hijastro(a); y,
13) Quienes no sepan leer ni escribir."

"ARTÍCULO 320.- La tutela termina:

1) Por llegar el(la) pupilo(a) a su mayoría de edad;
2) Por el matrimonio del(la) pupilo(a) que hubiere
cumplido dieciocho (18) años; y,
3) Por la muerte del(la) pupilo(a)."

"ARTÍCULO 331.- Cuando en la línea recta se cuenta
bajando del tronco a los(las) otros(as) parientes, se llama

descendente; y cuando se cuenta subiendo de uno de los(las)
parientes al tronco se llama ascendente.

En la línea recta, sea ascendente o descendente, hay tantos
grados como generaciones, o sea tanto como personas, sin
incluirse la del tronco común."','4','Decreto 35-2013, reformas al Código de la Niñez y de la Adolescencia y a otras leyes (La Gaceta 33,222 del 6-sep-2013)','{"bytes_sha256":"fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff","text_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","paquete":"PKG_DECRETO_35_2013_REFORMA_AL_CODIGO_DE_LA_NINEZ@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"35-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v8 (ADJUDICACION_CLO_D35_2013.md §3)","ocr_text_sha256":"f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a","norm_id":"HN:DECRETO_35_2013","instrumento_id":"DECRETO_35_2013","ingest_batch":"A04_D35_2013_01","ordinal":4,"article_sha256":"253346ab0e3222ea857737cfec36ac4697d7bdb33c8926e32b9c27f32742ad99","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_35_2013','4','e2668e470586862b005100a8c2c58192b022da9a914e5aba5bf7d8dfd146bbd1','A04_D35_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:3','mayalex_normativos','10_LEYES_REGLAMENTOS','- La creación de sociedades mercantiles bajo
esta modalidad, se debe hacer a través de un formulario especial
único que debe ser creado para tal efecto por el Registro Mercantil
y que debe estar disponible en sus oficinas en formato físico o en
formato electrónico a través del internet. Los formularios pueden
llenarse y presentarse por quien o quienes deseen constituirse o
por apoderado debiendo en este último caso acreditarse el poder
con que actúe debidamente autenticado en su caso.

Las firmas deben ser autógrafas e impuestas ante Ministro de Fe
o ante el Registrador Mercantil cuando la constitución se haga en
formulario físico o electrónicas cuando se haga en formulario
electrónico. Los honorarios que cobren los Ministros de Fe deben
ser libremente determinados en conjunto con las partes.','3','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":3,"article_sha256":"a1c2b57206f7d23d766038e938a7e88770bf5389856c40dedd427194a347d392","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','3','192a0d9bd326f9d918bca351281957f5de7bb89af71534aa9f67e52de5e778b2','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:4','mayalex_normativos','10_LEYES_REGLAMENTOS','- El Registro de las sociedades constituidas
bajo esta modalidad debe hacerse en un registro electrónico único
de nivel nacional, pudiendo abrirse ventanillas en cualquier lugar
del territorio de la República. El registrador debe recibir el
formulario de inscripción y hacer el registro calificando únicamente
que la finalidad sea lícita, asignándole el número de matrícula
correspondiente, digitalizando y guardando el mismo en la base
de datos que al efecto se lleve. Dicha base de datos debe ser
gratuitamente accesible en línea por cualquier persona para efectos
de consulta.','4','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":4,"article_sha256":"0ea969999582489fed531e87764644902800297aa4e9fe2a93ecb1b79ab76a9d","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','4','a2d29f8b96a2242e6914e8ce52915c37af4bd78949a6c0a8a595fb9570d2a5f2','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:12','mayalex_normativos','10_LEYES_REGLAMENTOS','- El Registro Mercantil debe desarrollar por
vía reglamentaria los procedimientos para la modificación,
transformación, fusión, división, aumento de capital de las
sociedades mercantiles creadas bajo la modalidad establecida en
esta Ley mediante el uso de formularios en físico o electrónico,
debiendo seguirse en lo que sea aplicable los requerimientos del
Código de Comercio. Los formularios deben ser llenados y
presentados por los socios o mediante apoderado.','12','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":12,"article_sha256":"fbfb028e6cb4b6510c3013211d425bbda5fb17969989115cdcf501aa8ca7d6b5","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','12','add8cf193a2439b469c5af088696930f84c566a47b42045720a74aeb95bf87a7','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:14','mayalex_normativos','10_LEYES_REGLAMENTOS','- Reformar los Artículos 1782 y 1789 del
Código Civil, los cuales deben leer de la siguiente manera:

“ARTÍCULO 1782.- La sociedad o compañía es un
contrato por el cual se aporta un capital o un bien o bienes tangibles
o intangibles como patrimonio con el objeto de limitar la
responsabilidad al mismo y de que las ganancias o pérdidas que
resulten de la especulación sean distribuidas al o los socios en las
proporciones acordadas en el documento de constitución.

La sociedad podrá ser unipersonal cuando se constituya por una
sola persona natural o jurídica, o colectiva cuando se constituya
por dos o más.”

“Artículo 1789.- El contrato de sociedad puede hacerse
constar en escritura pública o en documento privado que reúna

las formalidades establecidas en la Ley y debe ser inscrito en el
Registro Mercantil.”

TÍTULO II

DE LA SIMPLIFICACIÓN DE LA EJECUCIÓN DE
HIPOTECAS PARA LA FACILITACIÓN DEL ACCESO
AL CREDITO Y LA REACTIVACIÓN DEL SECTOR
DE VIVIENDA','14','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":14,"article_sha256":"9363bdb444adca486bca89f25ce8bb13787b5241a9dc18d6ead2b93414c1b062","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','14','c019e6211b89adab7e873fae0b63e4dee97f67aca2c4b6f90a3cecc6fbc9134b','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:18','mayalex_normativos','10_LEYES_REGLAMENTOS','- Cuando el pago se hiciere efectivo ante el
Notario en el plazo señalado, éste debe acreditar el mismo y dar
por cerrado el expediente, extendiendo el correspondiente recibo,
si se acreditase que el pago había sido hecho con anterioridad al
requerimiento el notario debe suspender el proceso y remitir las
diligencias ante el Juez de Letras correspondientes a fin de que el
mismo pueda determinar la veracidad o no del pago, para lo cual
debe dentro de las veinticuatro (24) horas siguientes a la recepción

de las diligencias abrirse de oficio la causa a prueba por un plazo
no mayor de cinco (5) días hábiles comunes después de las cuales
debe ordenar el cierre de dicho período de oficio. Si se
determinare que el pago es suficiente para dar cumplida la
obligación, el juez debe emitir resolución ordenando la suspensión
definitiva del proceso y el cierre de las diligencias.

Si resultare que el pago no ha sido efectivo o que el mismo es
insuficiente. Para dar por cumplida la obligación el juez de Letras
debe emitir la resolución respectiva dentro del mismo plazo
establecido en el párrafo anterior, mandando que las diligencias
sean enviadas nuevamente al notario para que este concluya el
proceso de ejecución si hubiere habido un pago parcial de
ejecución debe llevarse a cabo por el remanente.

La resolución del juez debe ser emitido en un plazo no mayor de
cuarenta y ocho (48) horas después de cerrado el período
probatorio establecido en el párrafo primero de este Artículo.','18','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":18,"article_sha256":"46f27018ffb922fdfe67267ed4dc6f93726d7cc1346f4a76bd972c1f84472050","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','18','a2b1d3a1a67b941ecc2e34c71a6217fe8862d5ed74f4eec47373e4543d0320a7','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:23','mayalex_normativos','10_LEYES_REGLAMENTOS','- Cuando hayan varios acreedores éstos
pueden ponerse de acuerdo ante un notario sobre la forma en
que distribuirán los resultados de la venta por acreedor o de la
venta extrajudicial por Notario.','23','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":23,"article_sha256":"8e1d96e751a140e4ded40bbcbd51ca031ed219733037b67aa6ca8309982412bb","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','23','21ab8ec07e4ebac6bd70891841b82c57421b07d62fe8c184ff635ff7a5e696b4','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:25','mayalex_normativos','10_LEYES_REGLAMENTOS','- El Notario ante quien se hubiese constituido
una garantía no puede participar en la ejecución de la misma.

TÍTULO III

DE LA REESTRUCTURACIÓN DE LA
INSTITUCIONALIDAD PARA LA PROMOCIÓN DE
INVERSIONES Y LA MAYOR EFICIENCIA DE LAS
MISMAS','25','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":25,"article_sha256":"66091d05d8de2b9b42a30ea5420cdaa21699bd14eeffac25bae2d43ef11471a2","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','25','3e2d8c99095969b2c2d26a36d09b586c67fa9fbd0cbc656e5a7d4dd6cf85953a','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:37','mayalex_normativos','10_LEYES_REGLAMENTOS','- Derogar los Artículos 380, 381, 382 y
383 del Código de Comercio contenidos en el Decreto Legislativo
Número 73-50 y sus reformas.','37','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":37,"article_sha256":"95f424f5525ed88ed0da777f1bdca920cb7334c9e06d412ac2103466909407ce","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','37','db80da065245949262ba234eb9b634e694e8ab4714435343ce7edf6859be4858','PILOTO_D284_2013_01',now())
ON CONFLICT (id) DO NOTHING;
DO $verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM (VALUES
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:16','add81b9709f77c8af30f08ac1803a6673d8cd0b613a1219d801636e07a4297ca'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:20','a73f0f4711ca1a0deac7037c1359636cfada7daefde210f1d8b93d14a4f306cc'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:30','a0afe03b1f4ea1f837fb1e90157aa37e57d3a774ee26e958c3403020d89f15ca'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:39','43cb9071d88be4578334e7b0d564b0d44d1cef21e509b50690d880f2efc36998'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:42','099297f5ff43ffef311ea4e0091ae1ada4b24f7d0543dab24addd7435b42f7df'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:45','e88b6e3b090cb6b6fdb9840ff78db9c8b7bf81c9cd3390cea1960461caab3d4c'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:52','6e6b4f3d0dcb90a1abad51ffa36d9db18c03f9f83794ef832827dca5e35eecf8'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:55','346f5326bfaa20fecb16efe1177a4f7eac3b8664b33ce709f6e6b93cececd0f4'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:66','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:74','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:80','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:83','fa24b1cce38db2ada7cbc130b59f764eddbeb7073652df51c26c6f350774a4b6'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:91','e3b97025911e0e23d3a32e5d4701ca9668804b26fd191da6446eabd09a9a77dd'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:92','e040ed8d1dd02cbdee843375ecdc9966d3eabe2db70ed02a0b44cdd421d3c884'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:96','e00164fdce826a4c5fe7761f775e626cc70bf4116033dbdd5f7fc510e21fe2bc'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:98','12e7f2f666cd0886dc729a5083a151ff71854fac815a8b0904376a0fb89883de'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:102','993c5257592ef1f6900b4cd8f90c2f9e0ca470eff37ce370a6b3b77df484e1b6'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:102-A','0e7fa30a04d5cd5e960a46ca6e54c841f443d27c5f524555352ae87d39c50a6e'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:125','f32500bbcebc850bb303ac118c04ba4e309597c99e24bbd50189fc3036236bb6'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:130','357817dc3be5d56c761f88ae471731e444c1d8a8d4db3b0bcee4fcc5663c9ea9'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:140','3b5a686fcd1b9652777bfbd13509350f175b2926f7497911eb09ff5ac878a71c'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:142','87ecb3f3fdbcdcddbc5be8dbd011a1201fc2fc32342250ecb0c3ec68d1cf69de'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:148','8a2f770876bbf108c52dc54b80d018edd78db9838695a201f4f4796e9274c5cd'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:153','34808dc1700175e9861b09de1f1bd3375608396db032bb70396f5c0f49da0213'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:164','d0402378d9c7d9c8d55c1597169c01f26a03f37017a8c0844a0e62ea8265f271'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:183','daab35f9cd21c9a105f5f9bd03343b3045d4248761a093159458ffdaae7dd089'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:194','a1608e634a33f2651fa688c7513605f9c75f7fcbae0553208416c2d3c69f2aef'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:210','898be465bf6ed1290f11a1600cd1b6d45837c331dc4bb95fb3b388483756df83'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:213','e43b28e88bec684ce348f1ec7ae28da1040f62a7e4d14b7770223d3358594634'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:216','34ce94c60fb5bc6be5a997aa9aff141d4e18d11450f2cfdaf714433c78dd9f05'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:235','1488f621b3766f2dcb6539b9595739cbcf27bd853705497bac23beb8ec0f3b85'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:243','664bbea5e115e9cf6fda9fecc15d83cef468b7f2dcdec6667c13d21825cdc6fe'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:246','1ed40f1804a2ad3aa9d6192430789dccc1ff4f6537b2d89828dbeb5ef09105bc'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:251','add11388c37759e451f266aab6e81dadacef0482da853eae440a4f57cc934fc4'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:253','ab442c71b20eb4e8f6a91bd2b633bf0d54a4b96660f11f1c360d1e089c21e8d3'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:266','ea3f778929246de6c8528f2e2fb1d8db7d459a13bf84519d9a789fb12f9a2c09'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:267','86dbd1717a9af98a975d0e90c532d9c631477f38b3b4bc6bf5cd42ca2e18363d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:274','a3acce95ac0e3a8e970888e68e1b8a00ba58620fb5481e4b50a7dd3054618c65'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:281','f42d30a3dae861c7adf3db9a6c20744ac7c8a996785475267dbc795e39f09cc8'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:283','ac41ae459faf5c45734a4449bfbb043a1f171681cbf1deec5162f1230122fb89'),
    ('A04_D35_2013_01:DECRETO_35_2013:4','e2668e470586862b005100a8c2c58192b022da9a914e5aba5bf7d8dfd146bbd1'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:3','192a0d9bd326f9d918bca351281957f5de7bb89af71534aa9f67e52de5e778b2'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:4','a2d29f8b96a2242e6914e8ce52915c37af4bd78949a6c0a8a595fb9570d2a5f2'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:12','add8cf193a2439b469c5af088696930f84c566a47b42045720a74aeb95bf87a7'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:14','c019e6211b89adab7e873fae0b63e4dee97f67aca2c4b6f90a3cecc6fbc9134b'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:18','a2b1d3a1a67b941ecc2e34c71a6217fe8862d5ed74f4eec47373e4543d0320a7'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:23','21ab8ec07e4ebac6bd70891841b82c57421b07d62fe8c184ff635ff7a5e696b4'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:25','3e2d8c99095969b2c2d26a36d09b586c67fa9fbd0cbc656e5a7d4dd6cf85953a'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:37','db80da065245949262ba234eb9b634e694e8ab4714435343ce7edf6859be4858')
 ) AS e(id,hash_contenido) JOIN public.biblioteca_vectores b ON b.id=e.id
 WHERE b.hash_contenido=e.hash_contenido AND b.ingest_batch=split_part(e.id,':',1)
   AND b.instrumento_id=split_part(e.id,':',2) AND b.metadata->>'norm_id'=CASE split_part(e.id,':',1) WHEN 'A03_CODIGO_NINEZ_01' THEN 'HN:CODIGO_NINEZ' WHEN 'A04_D35_2013_01' THEN 'HN:DECRETO_35_2013' WHEN 'PILOTO_D284_2013_01' THEN 'HN:DECRETO_284_2013' END
   AND b.revision_pendiente=true AND b.es_norma_vigente IS NULL AND b.embedding=array_fill(0::real, ARRAY[384])::vector
   AND encode(sha256(convert_to(b.contenido,'UTF8')),'hex')=e.hash_contenido;
 IF n<>49 THEN RAISE EXCEPTION '01_datos_03: % de 49 filas no coinciden con contenido, hash o estado oculto',n; END IF;
END
$verify$;
COMMIT;
