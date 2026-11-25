-- 01_datos_04.sql | Solo mayalexhn-prod / thgrhueckkjdutjvcufp.
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
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:3','mayalex_normativos','10_LEYES_REGLAMENTOS','Constituyen fuentes del derecho aplicable a los niños:

1. La Constitución de la República.

2. La Convención sobre los Derechos del Niño y los demás tratados o convenios de los que Honduras forma parte y que contengan disposiciones relacionadas con aquellos.

3. El presente Código; y, 4. El Código de Familia y las leyes generales y especiales vinculadas con los niños.','3','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":3,"article_sha256":"539c853516e0cdb5526bcf0a95736bddded9b1a5de89d4553ac0ae09c422e824","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','3','7895a3f8f3b37e2699e1e2dbefb8949f634acb4901d9640bcf628e226fd2839f','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:12','mayalex_normativos','10_LEYES_REGLAMENTOS','Todo ser humano tiene derecho a la vida desde el momento de su concepción.

El Estado protegerá este derecho mediante la adopción de las medidas que sean necesarias para que la gestación, el nacimiento y el desarrollo ulterior de la persona se realicen en condiciones compatibles con la dignidad humana.','12','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":12,"article_sha256":"0217693678070e055126fb3e5e18ed904888bd8b71b988bf2c8295632cb3ae0b","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','12','014bb1a56b333bcae1e6abd22f6fd01f5308809bbd3d753722b12e65d956b555','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:18','mayalex_normativos','10_LEYES_REGLAMENTOS','En los establecimientos médicos asistenciales, públicos y privados, se permitirá la permanencia del padre, de la madre o del representante legal del niño y se les ofrecerán las comodidades que las circunstancias permitan.','18','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":18,"article_sha256":"2953cc2c7b59df96f09d0d744235c0773e03f1d1d2eb4c1f70c6ce290785bfe9","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','18','3112c69c5cc22e96463bd98b4ebaf86b8206633de02fe43d2afb6a7404287e76','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:31','mayalex_normativos','10_LEYES_REGLAMENTOS','El Registro Nacional de las Personas hará lo necesario para facilitar y garantizar la inscripción de los nacimientos y demás sucesos relacionados con la personalidad, así como la perpetuidad de la información.','31','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":31,"article_sha256":"8d1a46c1e216d5847ddde5b77bd58759ced4d2f67648eb969a1e30cf2500d934","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','31','015586ebe6eac1163edca13d200a084f9654d904285eea8d37adf8cb947afc23','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:34','mayalex_normativos','10_LEYES_REGLAMENTOS','Los medios de comunicación social están obligados a respetar la intimidad y la vida personal de los niños. No podrán, en consecuencia, publicar entrevistas, informes, noticias o datos que se relacionen con aquélla o con la de su familia o la de sus relaciones sociales si de cualquier modo pueden afectar su honra.

La contravención de esta norma se sancionará en la forma prevista en el artículo 32, anterior.','34','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":36,"article_sha256":"31ba985adc4d1c62ff181b36179f19927536214b31e9718c72791af5535604e6","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','34','a8992843026f43ec7e4186d70c6375ec3b76fdf8c1902368534fe51869a57454','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:35','mayalex_normativos','10_LEYES_REGLAMENTOS','Los niños tienen derecho a la educación, la cual será organizada por el Estado como un proceso integral y coordinado en sus diversos niveles.

La educación, en todos sus niveles, tenderá al logro del desarrollo de la persona humana y a prepararla para el ejercicio pleno y responsable de sus derechos y deberes. Se impartirá de manera que asegure:

a) La igualdad de oportunidades para acceder y permanecer en el sistema educativo.

b) El respeto recíproco y un trato digno entre educador y educando.

c) La impugnación ante las instancias correspondientes, de acuerdo con la ley y los reglamentos, de las evaluaciones hechas durante el proceso de enseñanza-aprendizaje.

ch) La formación de organizaciones estudiantiles y juveniles o su participación o permanencia en las mismas.

d) La participación en programas de becas de estudio; y, e) El acceso a escuelas públicas gratuitas cercanas a su residencia.','35','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":37,"article_sha256":"a22eedaf13f0783e0cdffa4d6fe8416ad07a55e0f0e7eefe1320ac81731b56dc","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','35','23a35e72ca7829435e77c5c4b91919a68324b4d9d9e93befd5d94d7dd32989d0','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:36','mayalex_normativos','10_LEYES_REGLAMENTOS','El derecho a la educación incluye el de tener acceso a una instrucción actualizada y de calidad, acorde con las necesidades de la persona y de la sociedad.

Incluye también el derecho de gozar de un ambiente favorable para el aprendizaje tanto en el sistema educativo formal como en el no formal.

Son deberes del Estado en este campo:

a) Asegurar la enseñanza primaria, laica, obligatoria y gratuita.

b) Hacer obligatoria, en forma progresiva, la educación media.

c) Establecer y promover servicios de atención y educación especial para los niños discapacitados y para quienes tengan un nivel de inteligencia superior. ch) Prestar, dentro de las posibilidades presupuestarias, servicios de guardería preescolar y escolar a niños hasta de seis años.

d) Fomentar la educación física y los deportes.

e) Estimular la educación en salud y relaciones familiares.

f) Incentivar la enseñanza en áreas creativas, artísticas y especializadas; y, g) Establecer servicios de asistencias para los alumnos carentes de recursos económicos a fin de que puedan gozar de los beneficios de la educación. Dentro de estos servicios debe quedar incluido el otorgamiento de becas de estudio para el cinco por ciento (5%), por lo menos, del alumnado de cada establecimiento educativo público o privado.','36','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":38,"article_sha256":"119ed557607dc229d19efb29db6188073df765031b65d6fcf89222135048df4f","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','36','568511c1c2226af7873c4bc00be345e8c42402b8771f5e698ecd016a984d07e6','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:37','mayalex_normativos','10_LEYES_REGLAMENTOS','La educación que se imparta en los establecimientos privados será supervisada, controlada y estimulada por el Estado.','37','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":39,"article_sha256":"43da4b1e3556bfeaa48f3053874776e1da9dedf9ffc3cb2711818c9cc7030a3b","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','37','59e0c360017b420cd8f81515005b2210759bf0d1cb4f32cafed492cdd9b03ffc','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:51','mayalex_normativos','10_LEYES_REGLAMENTOS','El Estado propiciará condiciones para que los niños disfruten de manera efectiva del derecho al descanso, al esparcimiento y al deporte, teniendo en cuenta su condición de personas en desarrollo. Cuidará, asimismo, que los niños no tengan acceso a diversiones, espectáculos y recreaciones que puedan afectar su desarrollo físico, psíquico o moral.','51','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":53,"article_sha256":"8f0b0066494a375fab8016f7ebf2828dfd3fbe5dd25a989d7b03fd7d63dbfc68","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','51','5bce58cced97a97ad10402bc792cb935cbcd70c181b433e6767349f7eefcd17e','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:56','mayalex_normativos','10_LEYES_REGLAMENTOS','Para todos los efectos legales, familia es la institución integrada por los padres biológicos o adoptivos y por los parientes dentro del cuarto grado de consanguinidad y segundo de afinidad, que tienen como finalidad la conservación, propagación y desarrollo, en todas las esferas de la vida de la especie humana.','56','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":58,"article_sha256":"594e29f4063a38617ae01b4187236654579b1439791a714df0502cda302c2646","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','56','c1ee52cc013cd6beb79295ba6b54461093df5913a1982d4583b550c8d24725ad','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:58','mayalex_normativos','10_LEYES_REGLAMENTOS','El Estado fomentará la estabilidad familiar y el bienestar de sus miembros y les prestará servicios especiales de asistencia a las familias más pobres para que puedan cumplir las obligaciones resultantes del presente Código, del Código de Familia y de las demás leyes relacionadas con ésta.','58','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":60,"article_sha256":"ee28c1bdf5aa8cb0b26312470488ae80a9b1ba25a65e97fa9dd05dbc26b783e8","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','58','7ccc51fb39a1caeec5d5ed1d661253aa063080567426c257c854c3ced022522d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:65','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','65','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":67,"article_sha256":"2ddd05d7e41a187c7356b9c04624dbf850abaf9bc461fc1f8d7eda8dd2c80318","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','65','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:73','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','73','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":75,"article_sha256":"11e5c1420f9e065ebd1b3cfefe177ebf926930b934ab98fc6551139b1be0e41a","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','73','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:79','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','79','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":81,"article_sha256":"16df4045a2262846af44b861e80a5d51f0705b523a877c963159436ea6f92212","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','79','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:88','mayalex_normativos','10_LEYES_REGLAMENTOS','Las autoridades competentes y los parientes de los niños deberán fomentar su sentido de sociabilidad para facilitar la solución de los problemas que enfrenten.','88','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":90,"article_sha256":"c5af16306fe50a5e47c81297cdc1efa45c29af00a51edfd903f150eca3ccd176","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','88','7ef10d823b981f2abe7343278bd0d2d995b013b2ce950826f79e01ce639d0266','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:94','mayalex_normativos','10_LEYES_REGLAMENTOS','Los medios de comunicación, en forma permanente, insertarán programas culturales, artísticos, informativos y educativos que inculquen a los niños, los valores familiares, sociales y cívicos o que tengan como finalidad prevenir amenazas o violaciones de sus derechos.

Los medios de comunicación clasificarán sus programas teniendo en cuenta la edad de las personas a efecto de que los padres o representantes legales de los niños puedan orientarlos sobre la conveniencia o no de presenciarlos o escucharlos.','94','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":96,"article_sha256":"3b97ba2179df966a1ca55aa3bb2c5df56483f4de94c124b7ce7be41f96f58b95","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','94','764ceba18131bc8b35124a2cde5273fc5055617d335c78e76603c1f0440310d2','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:95','mayalex_normativos','10_LEYES_REGLAMENTOS','La exhibición pública de revistas o de cualquier otra clase de publicaciones que atenten contra los derechos de la niñez queda prohibida. La contravención de esta disposición será sancionada de conformidad con lo prescrito por el Código Penal.','95','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":97,"article_sha256":"2dcee59cbb1b25c0550fb8abd48e88b47bf19c3d0e9fd1931218eed03f2318b7","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','95','08517398938605a6c8403baf0dcc790954f5e5f96887d9e3aaad7209d8689084','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:100','mayalex_normativos','10_LEYES_REGLAMENTOS','La Secretaría de Estado en los Despachos de Gobernación y Justicia, por medio de las gobernaciones políticas y de las corporaciones municipales, adoptará las medidas que sean necesarias para evitar y combatir la prostitución infantil.','100','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":102,"article_sha256":"53c10c994823dff3a27e9651fc559144b8b6dd63e6f9a004b203e72e65c86957","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','100','ff90fba49d01b68bafae25e33246502f89b75c8d338d13ff712a612a1ef4a768','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:100-A','mayalex_normativos','10_LEYES_REGLAMENTOS','El Estado, por medio del Instituto Hondureño de la Niñez y la Familia (IHNFA) y en coordinación con el Programa Nacional de Prevención, Rehabilitación y Reinserción de Personas en maras y pandillas, implementará planes y programas, las medidas y las acciones de prevención y atención integral de los niños y niñas simpatizantes, pertenecientes o integrantes de pandillas o maras, con enfoque garantista de derechos y a nivel comunitario o local.','100-A','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":103,"article_sha256":"9d5e0704db20c57425bbabc279633d88785d97c3a23fe5f82189abd365f9804d","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3_ADICIONADO","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','100-A','55714af09300e5a9129bdd05620525d890be46737816b688f9a9832ee050e80a','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:108','mayalex_normativos','10_LEYES_REGLAMENTOS','Los niños discapacitados tienen derecho a gozar de una vida plena, así como de cuidados y atenciones especializadas y, de ser posible, individualizadas, para asegurarles su dignidad y permitirles bastarse a sí mismos y facilitar su participación activa en la comunidad.

La atención de los niños discapacitados le corresponde prioritariamente a la familia y complementaria y subsidiariamente al Estado, en los términos de este Código.

En tal orden, deberán hacer lo necesario para garantizarles el acceso a la educación, a la capacitación para el trabajo, al sano esparcimiento y a las demás actividades que hagan factible su rehabilitación y su pleno desarrollo individual.','108','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":113,"article_sha256":"aea8dbc3c437b20282960f17e9ac3f096078abf13afcc15f1e463777b7bc9aac","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','108','e7da8a8e2fb5199640d6ace53d3d1e9bc10b25665e4adb14ed31fc8181b6f3a3','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:110','mayalex_normativos','10_LEYES_REGLAMENTOS','Es deber de toda persona que tenga conocimiento de la existencia de un niño discapacitado ponerlo en conocimiento del Instituto Hondureño de la Niñez y la Familia, del Ministerio Público o de los Juzgados de la Niñez u otros que hagan sus veces, para que pueda recibir el tratamiento adecuado.

Los maestros de educación preescolar, primaria y media que detecten cualquier dificultad para el aprendizaje que presenten los niños discapacitados, deberán dar cuenta del hecho a sus superiores jerárquicos, así como a los correspondientes padres o representantes legales para que puedan adoptar las medidas correctivas que las circunstancias exijan.','110','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":115,"article_sha256":"e330c4c3c352d2b08f447633efba63f3447787d6c245aed9bef8ce245d878a94","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','110','11a44fbdb49e60805900f984c11737455e857159f83585f8699bdcccbbc52bf7','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:115','mayalex_normativos','10_LEYES_REGLAMENTOS','El trabajo de los niños deberá ser adecuado a su edad, condiciones físicas y desarrollo intelectual y moral.

La Secretaría de Estado en los Despachos de Trabajo y Previsión Social evitará la explotación económica de los niños y velará porque no realicen trabajos peligrosos o que entorpezcan su educación o afecten su salud o su desarrollo físico o mental.

Los niños que ingresen a la fuerza laboral tendrán derecho al salario, prestaciones sociales y demás garantías que la ley y los contratos individuales o colectivos le conceden a los trabajadores mayores de dieciocho (18) años y a los especiales que por razón de su edad y desarrollo le son reconocidos por el Código del Trabajo y por el presente.

El salario del niño trabajador será proporcional a las horas trabajadas.','115','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":120,"article_sha256":"9cdccadfa4ad236b63735cff60feee65d5794c8d19e3e52b3cfac87cb445e457","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','115','d430d254d4b1dd1602a73f0de913a14cfd7e3642b28ed461c991ece229451070','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:126','mayalex_normativos','10_LEYES_REGLAMENTOS','Todo empleador que ocupe los servicios de niños llevará un registro en el que hará constar:

a) El nombre, apellidos, edad, dirección y domicilio del niño.

b) El nombre, apellidos, dirección y domicilio de sus padres o representantes legales.

c) La clase de trabajo que realiza, las horas diarias y semanales que trabaja, con indicación de los períodos de descanso.

ch) La forma y monto de la retribución o salario; y, d) La fecha de ingreso al trabajo.

A dicho registro se agregarán la constancia, extendida por las autoridades competentes, de que el niño está cumpliendo o ha cumplido sus obligaciones escolares, así como la autorización escrita de sus padres o representantes legales, con el visto bueno de la Secretaría de Trabajo y Seguridad Social.','126','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":131,"article_sha256":"f5f6e5f21b5fccc25f81ec76f63ce7e061a37e7eaa5df6aba01d0f14f8429af2","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','126','5aa51f922c95baede7f55a2753fe41bea58769283c48cb59365b2fb0fd8f6195','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:147-A','mayalex_normativos','10_LEYES_REGLAMENTOS','En la audiencia, el Instituto Hondureño de la Niñez y la Familia (IHNFA) conocerá los informes técnicos correspondientes, así como el parecer de las personas que haya citado, asimismo recibirá las pruebas que se aporten y dictará resolución en la que declare el abandono en sede administrativa o desestime el mismo.

La Resolución que declare la situación de abandono y de incumplimiento de derechos de un niño o niña será notificada al(la) representante legal de éste y a quienes hayan comparecido atendiendo la citación, en ésta se incluirá una relación de, al menos, los aspectos siguientes:

1) Nombre completo del niño o niña si se supiere y en su defecto señas particulares del mismo, en este último caso ordenará que de inmediato se tomen las medidas necesarias para garantizarle el derecho al nombre; 2) Nombre del padre, madre o representantes legales o de la persona a cuyo cargo estaba o está el niño o niña; 3) Lugar en que se encontró el niño o niña; 4) Estudios técnicos realizados; 5) Medidas adoptadas; y, 6) Lugar, día, nombre completo y título de la autoridad que emite la Resolución.

La resolución, acompañada de la documentación de respaldo correspondiente será elevada al conocimiento del(la) Juez de Letras de la Niñez o quien haga sus veces, en el término de tres (3) días contados a partir de que la misma quede firme.

Supletoriamente se aplicará a este procedimiento lo establecido en la Ley de Procedimiento Administrativo.','147-A','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":153,"article_sha256":"10c55104f4466124f3ff471a113fd3531cd70c938683c16d52747a51238c784d","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3_ADICIONADO","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','147-A','5eb9fdf83d9f96cafe1ea6504f5265e1190e28f9484d10daa11e6fb5cfc6f636','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:147-B','mayalex_normativos','10_LEYES_REGLAMENTOS','El (la) Juez(a) de Letras de la Niñez citará al padre, madre o representantes legales del niño o niña declarado en abandono en sede administrativa y al Instituto Hondureño de la Niñez y la Familia (IHNFA), así como a cualquier otra persona que estime procedente, para una audiencia que se celebrará en el término de tres (3) días contados a partir de la fecha en que se reciba en el Juzgado la declaratoria administrativa. Con las argumentaciones y pruebas que se le presenten y evacúen en la audiencia dictará sentencia, la que al menos contendrá:

1) Nombre completo del niño o niña; 2) Nombre de los padres o representantes legales; 3) Una breve relación de las consideraciones técnicas argumentadas por el Instituto Hondureño de la Niñez y la Familia (IHNFA) para declarar el abandono en sede administrativa, así como de quienes se opongan en su caso; 4) Medidas adoptadas, con expresión de las que se mantengan, levanten o impongan; 5) Declaración de abandono o desestimación del mismo y, 6) Lugar, día, nombre completo y título de la autoridad que emite la Resolución.','147-B','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":154,"article_sha256":"6e24a66ec2b83984e1ef3ebf55d838d59ef08771f020e71a626297d66c0042df","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3_ADICIONADO","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','147-B','f3e81a0fd4d82f6fc1607bdd05011c461810a11a38c132f73132662a84055b14','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:150','mayalex_normativos','10_LEYES_REGLAMENTOS','Los niños y niñas declarados(as) en situación de abandono o vulnerados en sus derechos, serán protegidos con las medidas siguientes:

a) Prevención o amonestación a los padres, madres o representantes legales; b) Atribución de su custodia o cuidado personal al pariente por consanguinidad más próximo que se encuentre en condiciones de ejercerlos o en su defecto por afinidad; c) Ingreso en familia sustituta o solidaria; d) Como última alternativa, su ingreso en un centro de protección, ya sea este del (IHNFA) o privado debidamente autorizado por éste; y, e) Cualquier otra medida, cuya finalidad sea la de asegurar el cuidado personal del niño o niña, atender sus necesidades básicas o poner fin a los peligros que amenacen su salud, su dignidad o su formación moral.

En los casos de los literales b), c), d); y, e), las medidas serán siempre excepcionales y provisionales, debiéndose tomar en cuenta el Interés Superior del Niño o Niña.

Si los padres, o representantes legales del niño o niña cuentan con los medios necesarios, el Instituto Hondureño de la Niñez y la Familia (IHNFA) podrá fijarles una cuota mensual para que contribuyan a su sostenimiento mientras se encuentre bajo una medida de protección.','150','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":160,"article_sha256":"315369d631db59e9ce3c4e7aa50c0e5d3895e7bfe280f3170dc3dd65be11fb79","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','150','d396a8f5047f17cb5b95e6b50903f1ce31022ce27e4cf5e33b4e68dc50081b72','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:152','mayalex_normativos','10_LEYES_REGLAMENTOS','Quien ejerza la Patria Potestad sobre el niño o niña, o su representante legal, podrá solicitar la terminación de los efectos de la declaración de abandono, cuando se demuestre que se han superado las circunstancias que le dieron lugar y que hay razonables motivos para esperar que no volverán a producirse.

Lo dispuesto en este Artículo no será aplicable cuando el niño o niña haya sido dado(a) en adopción o cuando quien ejerza la Patria Potestad sea reincidente.

El Juzgado de Letras de la Niñez accederá a lo pedido si, después de efectuadas las investigaciones pertinentes, considera probado lo argumentado por los(las) peticionarios.','152','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":162,"article_sha256":"2dd38daefb3bc9bcce0f2fd207888689ddc6d427330f69e27eee4b132c46a014","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','152','07adfbb9386940db831f1352ad637d9d6e5bb4faab90efb6b6d8f25ec0b51ae7','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:154','mayalex_normativos','10_LEYES_REGLAMENTOS','Se entenderá que un niño o niña carece de la atención suficiente para la satisfacción de sus necesidades básicas, cuando carece de medios para atender su subsistencia, o cuando las personas encargadas de su cuidado se niegan a suministrárselo o lo hagan de manera insuficiente.','154','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":164,"article_sha256":"6025d52760d42343a5f7dc6748a3ca807aa1f2f6b0be12ca92bb056502799184","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','154','c3a4084fd922eb4d52a9afe9d530cbc44e5c8ee942667f168f723f2930b9853e','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:168','mayalex_normativos','10_LEYES_REGLAMENTOS','Los(las) Directores(as) de los hospitales públicos y privados y de los demás centros asistenciales, informarán en un plazo máximo de veinticuatro (24) horas al Instituto Hondureño de la Niñez y la Familia (IHNFA) y al Ministerio Público, sobre los niños y niñas que muestren signos evidentes de agresión y sobre aquellos cuyos exámenes revelen que han sido víctimas de malos tratos.

En la misma obligación incurrirán los(las) Directores(as) de Centros Educativos y Centros de Cuidado, así como los(las) responsables directos de los niños y niñas, en esos centros.

La omisión de estos informes se sancionará con multa de dos (2) a cinco (5) salarios mínimos en su valor más alto, sin perjuicio del cumplimiento de la obligación.','168','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":178,"article_sha256":"bddd42c2af8933d2d22c131f48af65d5b1489263d6f17d3b5d476ebdd5154314","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','168','42bf2de07b054ed26c86a186e9c54e9be054ebf6d773f7868a8c0bba10c6ec6d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:204','mayalex_normativos','10_LEYES_REGLAMENTOS','La Privación de Libertad en un Centro Estatal Especializado o certificado por el Instituto Hondureño de la Niñez y la Familia (IHNFA), es de carácter excepcional, podrá ser aplicada cuando:

a) Se trate de una conducta realizada mediante grave amenaza o violencia hacia las personas, la vida, la libertad individual, la libertad sexual, robo agravado y tráfico de estupefacientes; y, b) Se trate de delitos dolosos y graves, sancionados por la Ley, con una pena mínima superior a ocho (8) años.','204','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":217,"article_sha256":"92a18b725e30fd4170b3d6f9cd03a5dcf2922d9b8d4f1d409904876972df428e","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','204','58c5dd719532dcbfc922610aa136578c8a1ad3a4eeb1999adc68ba868b4b2fc5','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:207','mayalex_normativos','10_LEYES_REGLAMENTOS','Al menos cada tres (3) meses, el Juez de Ejecución deberá revisar de oficio o a solicitud de parte, o por recomendación técnica del equipo multidisciplinario que supervisa la ejecución de la Sanción, la posibilidad de sustituirla por otra menos gravosa, de conformidad con el desenvolvimiento de El Niño(a) durante el cumplimiento de su Sanción.

Este período no será tomado en cuenta, cuando las circunstancias del infractor ameriten la revisión inmediata de la Sanción.','207','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":220,"article_sha256":"29e12d47f90e9b0f0c7cfd2393bd6b5bc4bfe52c69827235604c03d0eff6a685","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','207','26a4497f35b066e2e57c3b7f356a87f144d3eadae74419f4695923b0b183ed80','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:208','mayalex_normativos','10_LEYES_REGLAMENTOS','No podrá atribuirse al Sancionado el incumplimiento de las sanciones que se le hayan impuesto, cuando sea el Estado quien haya incumplido en la creación y organización de los programas para el seguimiento, supervisión y atención integral de éstos. Caso en el cual, se deducirá la responsabilidad administrativa, civil o penal que corresponda.','208','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":221,"article_sha256":"80304f4b08d29e8e25f68e3ea9ae52dd1cba8fd8b2992a73b5c463b45b6d7204","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','208','395655d273ffe4dde2715f2171a0b531eb16499e4e1185afb90169ca79d802f3','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:211','mayalex_normativos','10_LEYES_REGLAMENTOS','Corresponde al Juez de Garantías:

a) Conocer de las Fases Preparatoria e Intermedia, de conformidad a lo establecido en este Título; b) Velar por el respeto de los derechos fundamentales de los Niños(as) en Proceso; c) Dictar, en los plazos y términos previstos, la Vinculación al Proceso y las Medidas Cautelares aplicables, cuando correspondiere; d) Llamar y presidir la audiencia intermedia y dictar el auto de Apertura a Juicio;

e) Aprobar la solicitud de Suspensión del Proceso a Prueba y sus condiciones, así como resolver sobre la revocación de la misma y la reanudación del Proceso cuando procediere; f) Ordenar, cuando proceda, la evacuación de elementos de prueba con las formalidades de prueba anticipada g) Declarar la extinción de la acción penal o la reanudación del Proceso por incumplimiento de la Conciliación; h) Decidir sobre el uso de las formas alternativas de solución de conflictos establecidas en este Título; e, i) Las demás que se disponen en este Código.','211','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":224,"article_sha256":"f5391d1883601e72dad3970fc1b5862db949f50663abf9e75d772e7833787616","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','211','52750e5ecea821869bbf02e0324aaf31460eac593955c049452c9a6bbaec0c84','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:212','mayalex_normativos','10_LEYES_REGLAMENTOS','Corresponde al Juez de Juicio:

a) Presidir la Audiencia de Juicio y resolver los asuntos sometidos a su conocimiento, conforme a los plazos y términos previstos; b) Declarar la responsabilidad penal o inocencia de Niños(as) en Proceso; c) Imponer las sanciones, atendiendo a los principios rectores descritos en este Código, la proporcionalidad y racionalidad de la conducta, así como a la circunstancias de gravedad de la conducta características y necesidades de los Niños(as); y, d) Las demás responsabilidades que se disponen en este Código.','212','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":225,"article_sha256":"4051a81f08573e5cb3dcfca0437b3d534a696b10f43dbd028785ca4165213365","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','212','ccd1b048d5440862a7b0c478f838f53e5deb2d6746479cbbc5e77f6ded13b3e3','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:222','mayalex_normativos','10_LEYES_REGLAMENTOS','El Juez fijará el plazo de Suspensión del Proceso a Prueba, el cual no podrá ser inferior a seis (6) meses ni mayor a un (1) año, asimismo, determinará la imposición de una o varias reglas de cumplimiento, entre ellas las siguientes:

a) Residir en un lugar determinado; b) Frecuentar o dejar de frecuentar determinados lugares o personas; c) Abstenerse de consumir drogas, otros estupefacientes o bebidas alcohólicas; d) Participar en programas especiales para la prevención y tratamiento de adicciones; e) Comenzar o finalizar la escolaridad básica si no la ha cumplido, aprender una profesión u oficio o seguir cursos de capacitación en el lugar o la institución que determine el Juez; f) Prestar servicio social comunitario a favor del Estado o de instituciones públicas de servicio; g) Someterse a tratamiento médico o psicológico, de preferencia en instituciones públicas; h) Permanecer en un trabajo o empleo, o adquirir, en el plazo que el Juez determine, el entrenamiento en un oficio, industria o profesión, si no tiene medios propios de subsistencia; i) Someterse a la vigilancia que determine el Juez; j) No conducir vehículos automotores o de otra índole; k) Abstenerse de viajar al extranjero; y, I) Cumplir con los deberes de deudor alimentario.

Cuando se acredite plenamente que El Niño(a) no puede cumplir con alguna de las reglas anteriores, por ser contrarias a su salud, sus creencias religiosas o alguna otra causa de especial relevancia, el Juez podrá sustituirlas fundada y motivadamente, por el cumplimiento de otra u otras análogas que resulten razonables.

El Juez prevendrá a El Niño(a) sobre las reglas de conducta impuestas y las consecuencias de su inobservancia.

Contra la resolución que deniegue la Suspensión del Proceso a Prueba, procederá el recurso de Apelación. La resolución que admita esta figura, sólo será apelable, cuando las reglas fijadas resulten manifiestamente excesivas o que el Juez se haya excedido en sus facultades.

En ningún caso el Juez podrá imponer reglas más gravosas que las solicitadas por el Fiscal.','222','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":235,"article_sha256":"865c40c1ce7b5a7709f71766a53ca525f1e4eb8ae0e599c9e066a46354038ea3","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','222','01374530b030c3470336a70d814bb451c1d7eb76645b26fbed8e2e90234b3434','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:228','mayalex_normativos','10_LEYES_REGLAMENTOS','La Fase Preparatoria del Proceso Para la Niñez Infractora de Ley iniciará a través de la denuncia, siéndole aplicables las disposiciones conducentes del Código Procesal Penal.

De igual manera serán aplicables tales disposiciones, con respecto a la investigación de los Hechos Delictivos atribuidos a El Niño(a).

En ambos casos, siempre y cuando no contravengan los principios y derechos inherentes de esta materia.','228','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":241,"article_sha256":"61997f0f4f9c868b4b29004e0a95432a0a5881df4652646d6a49fffffe7c36b9","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','228','59bd053a0164f213db00c4f3a0723b7a35d2c297ebebdbedbe96bf0dc6a9e92f','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:239','mayalex_normativos','10_LEYES_REGLAMENTOS','En caso que se recurra la Sentencia Condenatoria, El Niño(a) continuará sometido a las Medidas Cautelares que establezca el Juez.

Firme la Sentencia condenatoria, el Juez establecerá las condiciones y la forma en que debe cumplirla. Así mismo el Instituto Hondureño de la Niñez y la Familia (IHNFA), formulará el Plan de Atención Individual para la ejecución de la Sanción, el que estará supeditado a la aprobación del Juez de Ejecución.','239','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":252,"article_sha256":"298d29c329d715df3607b3a04c87a8f96aa79ac2b6715eac15edaa7b2b17cc81","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','239','a23b61026e139f3a3df0f8b616d87384f4e8fb6fd08be70691f5576f690dbd19','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:240','mayalex_normativos','10_LEYES_REGLAMENTOS','En el caso de Faltas, si no fuere aplicable el Criterio de Oportunidad, el Juez competente señalará audiencia reservada dentro de los cinco (5) días siguientes a la presentación de la Acusación, en la cual oirá a El Niño(a), si su madurez lo hace aconsejable, y al ofendido, recibiendo la prueba que se presente.

Concluida la audiencia, dictará resolución absolviéndole o imponiéndole lo procedente.

Teniendo en cuenta su gravedad, las Faltas se sancionarán con:

a) Amonestación verbal o escrita; b) La imposición de órdenes de orientación y supervisión, cuya duración máxima será de treinta (30) días; o, c) La obligación de reparar el daño.','240','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":253,"article_sha256":"65367c84655545e80eaee293963f3d735fdbdc08a2ca76a1da52d2a7f8eea2d1","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','240','cffd4a9a6d359ef200e48504187188407720fc06d59727728b8b2e64e2950a2f','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:245','mayalex_normativos','10_LEYES_REGLAMENTOS','Todo Sancionado tendrá un Plan de Atención Individual, el cual será elaborado por el Instituto Hondureño de la Niñez y la Familia (IHNFA), con la activa participación de éste, así como de sus padres o responsables. En el cual se establecerán objetivos o metas reales para la Ejecución de la Sanción, debiéndose considerar sus condiciones y aptitudes personales y familiares.

El Plan de Atención Individual será remitido para su aprobación al Juez de Ejecución competente, a más tardar tres (3) semanas después de iniciado el cumplimiento de ésta. Para su aprobación deberá consultar al respectivo equipo técnico y tendrá el plazo de tres (3) días hábiles para resolver sobre si lo aprueba o no.','245','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":258,"article_sha256":"e20545b5ba82bafc7bfccb67d05684bba9600d84c6d17f420fc36496ac82e74e","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','245','5a4e7a4835be4d9eda79366a817606a3a4a2ffb53af5ba4063fc8ea488b68020','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:252','mayalex_normativos','10_LEYES_REGLAMENTOS','El Instituto Hondureño de la Niñez y la Familia (IHNFA) formulará el Plan de Atención Individual para la Prestación de Servicios a la Comunidad, el cual contendrá al menos los siguientes requisitos específicos:

a) El lugar donde se debe realizar el servicio; b) El tipo de servicio que se debe prestar; c) El tiempo, horario y modalidades de prestación; y, d) La persona encargada del Sancionado, dentro de la entidad donde se va a prestar el servicio.

En todos los casos, el servicio deberá estar acorde con las aptitudes y habilidades del Sancionado, así como dirigirse a fortalecer en él los principios de convivencia social y otros establecidos por El Sistema. Asimismo se garantizará que no implique riesgo ni menoscabo de la dignidad de éste.

Tendrán preferencia los programas comunitarios del lugar de origen o domicilio del Sancionado.','252','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":265,"article_sha256":"f507076c4ccf4596598720b0dced4b05591a3420718347556c6deb7420827c6a","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','252','0567f9e469b3d894e6a32bb5dca76b4eaeddcf53d4a7845603e6cbe6350ff299','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:278','mayalex_normativos','10_LEYES_REGLAMENTOS','La Corte Suprema de Justicia determinará la estructura y personal necesarios para el funcionamiento de los Juzgados de Letras de la Niñez.','278','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":291,"article_sha256":"6bd0956a040639f5da0855c85b426acec34dd80e8a90e9d83e5f3d7acaf580b1","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','278','141f47177a19ce679a0eddf0946c3eca913341ccbaf1f60daa23b1f53ea11807','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:279','mayalex_normativos','10_LEYES_REGLAMENTOS','Para ser Juez de la Niñez se requiere ser hondureño, mayor de veinticinco años, del estado seglar, de reconocida honorabilidad y ostentar el título de Abogado o Licenciado en Ciencias Jurídicas y Sociales, estar debidamente colegiado y contar con suficiente experiencia.','279','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":292,"article_sha256":"5f67cef677564723be4912ac37b1a0ce24578af61c83d0620ecba49739a034b6","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','279','4749e732dae54cb8c363b63e92507c5f8783085f50f8b953503da704ac91d8a1','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:287','mayalex_normativos','10_LEYES_REGLAMENTOS','Lo no previsto en el presente Código se resolverá de acuerdo con lo establecido en el Código Penal, en el Código de Procedimientos en Materia Penal y en el Código de Familia.','287','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":301,"article_sha256":"2bb1f10966c8d36487b0560d187ba181a9291b2bf60bd84e52d84d764adaf2a9","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','287','fbfc90a43802b9f43c4ce601a8514f269af581a285a26dd25aef2bcdaf6d3736','A03_CODIGO_NINEZ_01',now()),
('A04_D35_2013_01:DECRETO_35_2013:3','mayalex_normativos','10_LEYES_REGLAMENTOS','Adicionar al Decreto No.73-96 de fecha
30 de Mayo de 1996, contentivo del CÓDIGO DE LA NIÑEZ
Y LA ADOLESCENCIA, 23 nuevos artículos, bajo las
denominaciones de: 31-A, 31-B, 100-A, 102-A, 104-A, 147-
A, 147-B, 147-C, 147-D, 147-E, 180-A, 180-B, 187-A y 280-
A, cuyo texto será el siguiente:

"ARTÍCULO 31-A.- El Estado, por medio del Instituto
Hondureño de la Niñez y la Familia (IHNFA), implementará
un programa de prevención de la migración irregular de niños
y niñas, que asegure la protección de sus derechos, su

identificación y documentación y en su caso, la de sus
representantes legales; y facilite su reintegro a su medio
familiar y su centro de vida."

"ARTÍCULO 31-B.- Quedan garantizados los derechos
de los(las) niños(as) que pertenecen a pueblos étnicos o
indígenas, miembros de pueblos indígenas o afro-hondureños
o a minorías religiosas o lingüísticas, entre otros a tener su
propia vida cultural, a profesar y practicar su propia religión,
o a emplear su propia lengua, en armonía con su entorno
cultural, con los demás preceptos y principios establecidos
en el presente Código, la Constitución de la República y en
la Convención Sobre los Derechos del Niño."

"ARTÍCULO 100-A.- El Estado, por medio del Instituto
Hondureño de la Niñez y la Familia (IHNFA) y en
coordinación con el Programa Nacional de Prevención,
Rehabilitación y Reinserción de Personas en maras y
pandillas, implementará planes y programas, las medidas y
las acciones de prevención y atención integral de los niños y
niñas simpatizantes, pertenecientes o integrantes de pandillas
o maras, con enfoque garantista de derechos y a nivel
comunitario o local."

"ARTÍCULO 102-A.- Si la patria potestad es ejercida por
ambos padres y si uno de ellos se negare a autorizar la salida
del país de su hijo(a), podrá el(la) padre o madre,
interesado(a) concurrir al(la) Juez(a) competente a fin de
que éste(a) le autorice.

Lo establecido en este Artículo solamente será aplicable en
los casos siguientes:

1) Que sea necesaria su atención médica en el extranjero;
2) Estudios, siempre que no haya oportunidades de
estudio equivalentes en el país; y,
3) Viajes por motivos académicos, deportivos o
artísticos, siempre que sean a cargo de las autoridades
educativas, religiosas o federativas correspondientes
o análogas debidamente calificadas.

En la autorización judicial deberá establecerse el destino y
duración del viaje, así como el nombre de la persona a cuyo
cargo estará el niño(a), en el caso de que no viaje con uno(a)
de los padres.

Lo dispuesto en este Artículo será aplicable al tutor(a) o al
Instituto Hondureño de la Niñez y la Familia (IHNFA), en
su caso; y también se aplicará en el caso que sea imposible
ubicar al padre o madre del niño o niña."

"ARTÍCULO 104-A.- Presentada la solicitud, el(la) Juez(a)
citará en legal y debida forma a la parte contraria, para que
dentro del término de tres (3) días siguientes a la fecha de la
citación, comparezca a una audiencia en la que se conocerá
el asunto breve y sumariamente, debiéndose dictar sentencia
en la misma o a más tardar al día siguiente. Contra dicha
resolución cabrán los recursos de reposición y apelación
subsidiaria.

La oposición deberá resolverse en la misma audiencia.

Las partes deberán presentarse a la audiencia, con las
pruebas en que sustenten sus argumentaciones.

La Cédula de Citación deberá ser acompañada de la copia
de la solicitud respectiva.

En caso de no cumplimentarse la citación por no ubicarse a
la persona citada, el(la) Juez(a) resolverá de conformidad''
con las pruebas que acompañen la solicitud, en el término
de tres (3) días, sin la realización de la audiencia."

"ARTÍCULO 147-A.- En la audiencia, el Instituto
Hondureño de la Niñez y la Familia (IHNFA) conocerá los
informes técnicos correspondientes, así como el parecer de
las personas que haya citado, asimismo recibirá las pruebas
que se aporten y dictará resolución en la que declare el
abandono en sede administrativa o desestime el mismo.

La Resolución que declare la situación de abandono y de
incumplimiento de derechos de un niño o niña será notificada
al(la) representante legal de éste y a quienes hayan
comparecido atendiendo la citación, en ésta se incluirá una
relación de, al menos, los aspectos siguientes:

1) Nombre completo del niño o niña si se supiere y en
su defecto señas particulares del mismo, en este último
caso ordenará que de inmediato se tomen las medidas
necesarias para garantizarle el derecho al nombre;
2) Nombre del padre, madre o representantes legales o
de la persona a cuyo cargo estaba o está el niño o
niña;
3) Lugar en que se encontró el niño o niña;
4) Estudios técnicos realizados;
5) Medidas adoptadas; y,
6) Lugar, día, nombre completo y título de la autoridad
que emite la Resolución.

La resolución, acompañada de la documentación de respaldo
correspondiente será elevada al conocimiento del(la) Juez
de Letras de la Niñez o quien haga sus veces, en el término
de tres (3) días contados a partir de que la misma quede
firme.

Supletoriamente se aplicará a este procedimiento lo
establecido en la Ley de Procedimiento Administrativo."

"ARTÍCULO 147-B.- El (la) Juez(a) de Letras de la Niñez
citará al padre, madre o representantes legales del niño o
niña declarado en abandono en sede administrativa y al
Instituto Hondureño de la Niñez y la Familia (IHNFA), así
como a cualquier otra persona que estime procedente, para
una audiencia que se celebrará en el término de tres (3) días
contados a partir de la fecha en que se reciba en el Juzgado
la declaratoria administrativa. Con las argumentaciones y
pruebas que se le presenten y evacúen en la audiencia
dictará sentencia, la que al menos contendrá:

1) Nombre completo del niño o niña;
2) Nombre de los padres o representantes legales;
3) Una breve relación de las consideraciones técnicas
argumentadas por el Instituto Hondureño de la Niñez
y la Familia (IHNFA) para declarar el abandono en
sede administrativa, así como de quienes se opongan
en su caso;
4) Medidas adoptadas, con expresión de las que se
mantengan, levanten o impongan;
5) Declaración de abandono o desestimación del mismo
y,
6) Lugar, día, nombre completo y título de la autoridad
que emite la Resolución."

"ARTÍCULO 147-C- En todos los procedimientos aquí
indicados se garantizará al niño o niña todos los derechos
establecidos en el presente Código, en particular su derecho
a ser oído(a) y que su opinión sea tenida en cuenta durante
todo el proceso considerando su edad y grado de madurez
así como a ser asistido por un(a) abogado(a).
En todo caso, se procurará la permanencia del niño o niña
en su medio familiar y en su centro de vida.

Durante todo el procedimiento se garantizará el cumplimiento
del derecho de confidencialidad."

"ARTÍCULO 147-D. Toda persona con interés legítimo
podrá oponerse a la declaratoria de abandono o
incumplimiento de derechos de un niño o niña, ya sea en vía
administrativa o judicial, para lo que deberá presentar escrito
en el que fundamente su oposición y acompañe o proponga
los medios de prueba pertinentes. El(la) Juez(a) o la autoridad
administrativa correspondiente, resolverá de plano en el
acto o en el término de cuarenta y ocho (48) horas a partir
de la presentación de la oposición.

Si encontrare méritos en la oposición, incorporará al(la)
oponente en el procedimiento; de haberse realizado la
audiencia y lo estime necesario, podrá citar a nueva audiencia
en la que dilucidará el asunto, siempre y cuando no esté
firme la resolución o sentencia correspondiente."

"ARTÍCULO 147-E.- Si como resultado de la
investigación se establece que el niño o niña ha sido víctima
de un delito, el Instituto Hondureño de la Niñez y la Familia
(IHNFA) testimoniará las actuaciones y las remitirá al
Ministerio Público, a efecto de promoverse las diligencias
necesarias para sancionar al(a) responsable."

"ARTÍCULO 180-A.- Para los efectos de El Sistema, se
distinguen tres (3) grupos etarios, a saber:

a) Entre doce (12) y trece (13) años;
b) Entre catorce (14) y quince (15) años; y,
c) Entre dieciséis (16) y hasta los dieciocho (18) años
no cumplidos.

La edad y los rangos establecidos en este Artículo serán
tomados en cuenta para la sustanciación, aplicación y
ejecución del Proceso.

La Certificación de Acta de Nacimiento emitida por el
Registro Civil respectivo, es el instrumento válido para la
acreditación de la edad e identificación personal de El Niño(a)
y ante su inexistencia, a solicitud de parte interesada, el Fiscal
o el Juez, según el caso, podrán ordenar las diligencias
necesarias para determinarla, tales como: estudios médicos,
obtención de los datos personales, la impresión dactilar y
señas particulares, identificación mediante testigos u otros
medios idóneos. Diligencias que podrán realizarse aún contra

la voluntad de El Niño(a), respetando sus derechos
fundamentales, de conformidad a lo establecido en el Artículo
107 del Código Procesal Penal. Sin embargo, en ningún
caso se podrá decretar la privación de libertad para la
realización de las mismas.

De no poderse determinar fehacientemente la edad de
El Niño(a), se presumirá que forma parte del grupo etario
que le sea más conveniente."

"ARTÍCULO 180-B.- Sin perjuicio de otros contenidos
en este Código, son principios rectores de El Sistema, los
siguientes:

a) Interés Superior;
b) Formación Integral;
c) Reinserción en su Familia y en la Sociedad;
d) Justicia Especializada;
e) No Discriminación;
f) Legalidad;
g) Lesividad;
h) Humanidad;
i) Confidencialidad;
j) Racionalidad, Proporcionalidad y Determinación de
las Medidas y Sanciones para Niños(as);
k) Excepcionalidad;
I) Oportunidad; y,
m) Justicia Restaurativa.

A tal. efecto, se entenderá por:

INTERÉS SUPERIOR: Sin perjuicio y en concordancia
con lo dispuesto en el Artículo 5 de este Código, El Sistema
estará dirigido a asegurar el pleno y efectivo ejercicio y
disfrute de todos los derechos y garantías de El Niño(a).

FORMACIÓN INTEGRAL: Toda actividad estará
dirigida a fortalecer el desarrollo personal de El Niño(a), el
respeto por su dignidad, derechos fundamentales de todas
las personas y su función constructiva en la sociedad.

REINSERCIÓN DE EL NIÑO(A) EN SU FAMILIA
Y EN LA SOCIEDAD: Toda actividad estará dirigida a
garantizar el ejercicio pleno de los derechos de El Niño(a),
en el seno de su comunidad y de su familia, conforme a las
previsiones de este Código. En lo posible, dentro del marco
de la Justicia Juvenil Restaurativa.

JUSTICIA ESPECIALIZADA: Desde el inicio del
Proceso, todas las actuaciones y diligencias estarán a cargo
de órganos especializados.

NO DISCRIMINACIÓN: Implica que los derechos y
garantías reconocidos en este Código, se aplicarán sin
discriminación alguna por razones de orientación sexual,
origen étnico, social, índole económica, religión o cualquier
otro motivo semejante, propio o de sus padres, familiares u
otras personas responsables o que los tengan bajo su
cuidado.

LEGALIDAD: Ningún Niño(a) debe ser procesado ni
Sancionado por actos u omisiones que, al tiempo de ocurrir,
no estén tipificados como Hecho Delictivo o Falta.

LESIVIDAD: El Niño(a) no debe ser objeto de sanción, si
su conducta no lesiona o pone en peligro un bien jurídico
tutelado.

HUMANIDAD: Ningún Niño(a) debe ser sometido a
torturas, tratos o penas crueles, inhumanos o degradantes,
ni a métodos o técnicas que induzcan o alteren su libre
voluntad, su estado consciente o atenten contra su dignidad.

CONFIDENCIALIDAD: Son confidenciales los datos
sobre los hechos cometidos o supuestamente cometidos por
El Niño(a). En todo momento, debe respetarse su identidad
e imagen. El Juez garantizará que la información que se brinde
sobre estadísticas judiciales, no contravenga este principio
ni el derecho a la intimidad.

RACIONALIDAD. PROPORCIONALIDAD Y
DETERMINACIÓN DE LAS MEDIDAS Y
SANCIONES: Las medidas y sanciones que se impongan
a El Niño(a), deben ser racionales y proporcionales a la
infracción cometida o supuestamente cometida y adecuadas
a las circunstancias en que se encuentre el infractor o supuesto
infractor. No pueden imponerse medidas o sanciones
indeterminadas.

EXCEPCIONALIDAD: La privación de libertad tiene
carácter excepcional y se aplicará únicamente por el tiempo
determinado en este Código.

OPORTUNIDAD: Consiste en el beneficio de la
abstención total o parcial del Ministerio Público del ejercicio
de la acción penal o la facultad de limitarla a una o varias de

las infracciones, mediante la aplicación de medidas alternas
..al juicio.

JUSTICIA RESTAURATIVA: Es un principio general del
proceso penal para infractores de la Ley, que promueve la
inclusión de los valores de respeto, responsabilidad y
transformación de relaciones, en todos los procesos en que
intervenga un Niño(a), con el propósito de brindarle apoyo
en su acto voluntario de responsabilizarse por sus acciones
y efectos dañinos, a través del diálogo respetuoso con la
persona ofendida, familiares y personas de su entorno
comunitario, para encontrar en conjunto la manera de
enmendar y corregir el mal causado.
Este principio podrá ser aplicable, mediante la posibilidad
de referir las diligencias instadas a programas de Justicia
Restaurativa, creados fuera de El Sistema o en colaboración
con éste."

"ARTÍCULO 187-A.- Son Medidas Cautelares las que
tienen como finalidad asegurar la eficacia del Proceso,
garantizando la presencia de El Niño(a) durante el mismo y
la regulación de la obtención y conservación de las fuentes
de prueba.

Son Sanciones las que impone el Juez, declarando
responsable a un Niño(a) de una infracción penal."

"ARTÍCULO 280-A.- Toda referencia de cualquier ley o
de este Código, a la Junta Nacional de Bienestar Social se
entiende que corresponde plenamente al Instituto Hondureño
de la Niñez y la Familia (IHNFA)."

CÓDIGO DE FAMILIA','3','Decreto 35-2013, reformas al Código de la Niñez y de la Adolescencia y a otras leyes (La Gaceta 33,222 del 6-sep-2013)','{"bytes_sha256":"fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff","text_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","paquete":"PKG_DECRETO_35_2013_REFORMA_AL_CODIGO_DE_LA_NINEZ@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"35-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v8 (ADJUDICACION_CLO_D35_2013.md §3)","ocr_text_sha256":"f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a","norm_id":"HN:DECRETO_35_2013","instrumento_id":"DECRETO_35_2013","ingest_batch":"A04_D35_2013_01","ordinal":3,"article_sha256":"ef974fadccff95ce2776325e2124b1b5a23d966769e7d35d3c010d0d804a273a","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_35_2013','3','541edec4579b1096f7ba7820c84052917fc3f29bb11fb674cfb0d1851b76c235','A04_D35_2013_01',now()),
('A04_D35_2013_01:DECRETO_35_2013:7','mayalex_normativos','10_LEYES_REGLAMENTOS','Reformar el Título IV del Libro Segundo,
Parte Especial del Decreto No. 144-83 de fecha 23 de Agosto
de 1983 contentivo del Código Penal, así como el Artículo 147-
A, cuyos respectivos textos se leerán así:

"DELITOS CONTRA EL ESTADO CIVIL, EL
ORDEN DE LA FAMILIA Y DE LOS ATENTADOS
CONTRA LOS DERECHOS Y LA INTEGRIDAD DE
LOS NIÑOS Y NIÑAS".

"ARTÍCULO 147-A.- Incurrirá en el delito de hostigamiento
sexual, quien por sí o un tercero, valiéndose de una situación
de superioridad cause en la víctima represalias por rechazo
de actos indecorosos realizados por medio de insinuaciones
o solicitud de favores de carácter sexual para sí o para un
tercero, concurriendo cualesquiera de las circunstancias
siguientes:

1) Valiéndose de una situación de superioridad jerárquica
laboral o administrativa, cause inestabilidad,
descalificación en el desempeño de su trabajo o
ventaja o desventaja para ascensos laborales o le
impida el acceso a un puesto de trabajo;
2) Valiéndose de una situación de superioridad jerárquica
docente, cause inestabilidad, descalificación de sus
estudios, ofrezca la aprobación o reprobación
indebida de pruebas, exámenes o grados, o cualquier
otra condición que influya determinantemente en su
condición de estudiante; y,
3) Valiéndose de una situación de superioridad jerárquica
religiosa cause inestabilidad personal o familiar u
ofrezca bienestar espiritual.

La Pena aplicable para este delito será de reclusión de tres
(3) a seis (6) años y de inhabilitación especial por el tiempo
que dure la condena.

La referida pena se incrementará en un (1) tercio cuando
sean cometidos en perjuicio de niños o niñas o de personas
que adolezcan de enfermedades mentales."','7','Decreto 35-2013, reformas al Código de la Niñez y de la Adolescencia y a otras leyes (La Gaceta 33,222 del 6-sep-2013)','{"bytes_sha256":"fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff","text_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","paquete":"PKG_DECRETO_35_2013_REFORMA_AL_CODIGO_DE_LA_NINEZ@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"35-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v8 (ADJUDICACION_CLO_D35_2013.md §3)","ocr_text_sha256":"f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a","norm_id":"HN:DECRETO_35_2013","instrumento_id":"DECRETO_35_2013","ingest_batch":"A04_D35_2013_01","ordinal":7,"article_sha256":"bb83bf8763585c38229000dd9dd39db1f859d42e91bdd03505b27626db8302db","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_35_2013','7','f26f0a9fa6d2f4fc2f8a446e3b4055436bf5da0446af019376842cda0845966d','A04_D35_2013_01',now()),
('A04_D35_2013_01:DECRETO_35_2013:10','mayalex_normativos','10_LEYES_REGLAMENTOS','Reformar el Artículo 23 reformado del
Decreto No. 132-97, de fecha 11 de septiembre de 1997,
contentivo de la LEY CONTRA LA VIOLENCIA
DOMÉSTICA, el cual se leerá así:

"ARTÍCULO 23.- Sin perjuicio de los principios básicos
procesales establecidos en la presente Ley, las personas que
sufran de violencia doméstica tendrá derecho a:

1) Respeto en el interrogatorio;
2) No ser sometidas a pericias médicas o psicológicas
inadecuadas o innecesarias;
3) Solicitar al(la) Juez(a) competente que ordene a la
Policía Nacional, le auxilie para llevar o retirar sus
pertenencias de la casa que comparte con el agresor
o agresora;
4) Demandar el auxilio de la Policía Nacional, en
cualquier circunstancia que se vea amenazada su
seguridad o del grupo familiar. Tal auxilio deberá ser
inmediato e inexcusable, so pena de incurrir en
responsabilidad penal y administrativa;
5) No ser sometida a confrontación con el(la)
denunciado(a), si no está en condiciones emocionales
para ello, conforme al dictamen del Médico Forense
o de la Consejería de Familia;
6) No se le exija que presente la correspondiente
denuncia o acusación penal, para acudir en su auxilio:

7) Ser atendida para dictamen y reconocimiento por la
Dirección de Medicina Forense, cuando fuere
remitida por juzgado competente o cualquiera de las
instituciones igualmente competentes para aplicar
medidas de seguridad o por una organización no
gubernamental, de conformidad con la Ley;

8) A la protección del derecho a la intimidad de la víctima
y de su familia, en tanto se determina que los asuntos
de violencia doméstica interpuestos ante las
autoridades administrativas y judiciales serán
estrictamente confidenciales, por lo que el contenido
de los respectivos expedientes, como de cualquier
otra información, sólo podrá ser conocido por las
partes y por los (as) empleados (as) o funcionarios
(as) directamente intervinientes en su tramitación.

Los medios de comunicación se abstendrán de hacer
publicaciones o divulgar información relacionada con los
procesos de violencia doméstica ya sean estos realizados
en sede administrativa o judicial, la transgresión a ésta
disposición será sancionada con multa de diez (10) a
veinticinco (25) salarios mínimos en su valor más alto.

El(la) funcionario(a) administrativo(a) o judicial que revele
información que viole el derecho a la intimidad de la víctima
o la secretividad declarada del proceso, sin perjuicio de la
responsabilidad laboral, administrativa o penal a que hubiere
lugar, será sancionado(a) con multa de tres (3) a cinco (5)
salarios mínimos en su valor más alto."','10','Decreto 35-2013, reformas al Código de la Niñez y de la Adolescencia y a otras leyes (La Gaceta 33,222 del 6-sep-2013)','{"bytes_sha256":"fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff","text_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","paquete":"PKG_DECRETO_35_2013_REFORMA_AL_CODIGO_DE_LA_NINEZ@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"35-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v8 (ADJUDICACION_CLO_D35_2013.md §3)","ocr_text_sha256":"f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a","norm_id":"HN:DECRETO_35_2013","instrumento_id":"DECRETO_35_2013","ingest_batch":"A04_D35_2013_01","ordinal":10,"article_sha256":"cf31976b795e74186f42100d4de7f7b5cee5c5c943aa809649d45049eb4c786a","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_35_2013','10','4af0e78cdbb194ac950ace65c581f6885c9d2c935cc25dda4c2571f125f7f0ee','A04_D35_2013_01',now()),
('A04_D35_2013_01:DECRETO_35_2013:13','mayalex_normativos','10_LEYES_REGLAMENTOS','Derogar el Artículo 131 del Decreto
No. 76-84 de fecha 16 de Agosto de 1984, contentivo del
CÓDIGO DE FAMILIA.','13','Decreto 35-2013, reformas al Código de la Niñez y de la Adolescencia y a otras leyes (La Gaceta 33,222 del 6-sep-2013)','{"bytes_sha256":"fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff","text_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","paquete":"PKG_DECRETO_35_2013_REFORMA_AL_CODIGO_DE_LA_NINEZ@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"35-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v8 (ADJUDICACION_CLO_D35_2013.md §3)","ocr_text_sha256":"f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a","norm_id":"HN:DECRETO_35_2013","instrumento_id":"DECRETO_35_2013","ingest_batch":"A04_D35_2013_01","ordinal":13,"article_sha256":"5666df38c8df8648a977db2d849b45de7d2c275283e8f9b286dc9862eddd91ca","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_35_2013','13','1eec596d0e94109dbf3c5b1c0a26f3db582f9c7a595b62c22288c76ac43a8dc0','A04_D35_2013_01',now()),
('A04_D35_2013_01:DECRETO_35_2013:19','mayalex_normativos','10_LEYES_REGLAMENTOS','El presente Decreto entrará en vigencia a
partir del día de su publicación en el Diario Oficial "La Gaceta".

Dado en la ciudad de Tegucigalpa, municipio del Distrito
Central, en el Salón de Sesiones del Congreso Nacional, a los
veintisiete días del mes de febrero del año dos mil trece.

MAURICIO OLIVA HERRERA
PRESIDENTE, POR LA LEY

RIGOBERTO CHANG CASTILLO
SECRETARIO

GLADIS AURORA LÓPEZ CALDERÓN
SECRETARIA

Al Poder Ejecutivo.

Por Tanto: Ejecútese

Tegucigalpa, M.D.C., 5 de septiembre de 2013

PORFIRIO LOBO SOSA
PRESIDENTE DE LA REPÚBLICA

EL SECRETARIO DE ESTADO EN LOS DESPACHOS
DEL INTERIOR Y POBLACIÓN.

CARLOS ÁFRICO MADRID HART','19','Decreto 35-2013, reformas al Código de la Niñez y de la Adolescencia y a otras leyes (La Gaceta 33,222 del 6-sep-2013)','{"bytes_sha256":"fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff","text_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","paquete":"PKG_DECRETO_35_2013_REFORMA_AL_CODIGO_DE_LA_NINEZ@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"35-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"6691924624fd5fd82e2e95f87d5d5deefdd37056b318adcbd4e21f57773421eb","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v8 (ADJUDICACION_CLO_D35_2013.md §3)","ocr_text_sha256":"f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a","norm_id":"HN:DECRETO_35_2013","instrumento_id":"DECRETO_35_2013","ingest_batch":"A04_D35_2013_01","ordinal":19,"article_sha256":"50af49375cc8ec595f051de4cf5a08ca841fb0f74078de5cdfb54688f55b7785","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_35_2013','19','ee2dec28f2c2ea6b882b2ec2a311a8e9367d16aba20c08ae9a5703858ee1a7a8','A04_D35_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:1','mayalex_normativos','10_LEYES_REGLAMENTOS','- A efecto de facilitar la formalización de las
actividades mercantiles por parte de quienes las desempeñan y
fomentar el desarrollo de la iniciativa empresarial, se autoriza la
Constitución de Sociedades Mercantiles bajo cualquier modalidad
de las reconocidas por el Código de Comercio, así como su
modificación, transformación, fusión, escisión, división, aumento
de capital u otros actos relacionados con su normal actividad y
desempeño cumpliendo solamente con las formalidades
contempladas en este decreto y el reglamento que se emita al
efecto.','1','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":1,"article_sha256":"dd3fafddf9a11de48b52ffde8e9c3a8fb9fe5cb339704bd5e0fb7241ad12a933","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','1','9b39a86315ef3e3e4875e6ff00ec5bd81f3e23b2a2397a2af8d1cff2cf3497a5','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:39','mayalex_normativos','10_LEYES_REGLAMENTOS','- El presente Decreto entrará en vigencia a
partir del día de su publicación en el Diario Oficial “La Gaceta”.

Dado en la ciudad de Tegucigalpa, municipio del Distrito Central,
en el Salón de Sesiones del Congreso Nacional, a los ocho días
del mes de enero de dos mil catorce.

MAURICIO OLIVA HERRERA
PRESIDENTE POR LA LEY

RIGOBERTO CHANG CASTILLO
SECRETARIO

ÁNGEL DARÍO BANEGAS LEIVA
SECRETARIO

Al Poder Ejecutivo
Por Tanto: Ejecútese.

Tegucigalpa, M.D.C., 24 de enero de 2014.

PORFIRIO LOBO SOSA
PRESIDENTE DE LA REPÚBLICA

EL SECRETARIO DE ESTADO EN EL DESPACHO DE
FINANZAS
CARLOS BORJAS CASTEJÓN','39','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":39,"article_sha256":"d11de9d213fbdcc06c3e989f46db3c28a1123fcd2d4a8c1531910dd93c6c28a6","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','39','1e71e3a1ebd03552e15c1aa01e9786efc19c5b09220984ac5edc0f32282fc7a5','PILOTO_D284_2013_01',now())
ON CONFLICT (id) DO NOTHING;
DO $verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM (VALUES
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:3','7895a3f8f3b37e2699e1e2dbefb8949f634acb4901d9640bcf628e226fd2839f'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:12','014bb1a56b333bcae1e6abd22f6fd01f5308809bbd3d753722b12e65d956b555'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:18','3112c69c5cc22e96463bd98b4ebaf86b8206633de02fe43d2afb6a7404287e76'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:31','015586ebe6eac1163edca13d200a084f9654d904285eea8d37adf8cb947afc23'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:34','a8992843026f43ec7e4186d70c6375ec3b76fdf8c1902368534fe51869a57454'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:35','23a35e72ca7829435e77c5c4b91919a68324b4d9d9e93befd5d94d7dd32989d0'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:36','568511c1c2226af7873c4bc00be345e8c42402b8771f5e698ecd016a984d07e6'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:37','59e0c360017b420cd8f81515005b2210759bf0d1cb4f32cafed492cdd9b03ffc'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:51','5bce58cced97a97ad10402bc792cb935cbcd70c181b433e6767349f7eefcd17e'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:56','c1ee52cc013cd6beb79295ba6b54461093df5913a1982d4583b550c8d24725ad'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:58','7ccc51fb39a1caeec5d5ed1d661253aa063080567426c257c854c3ced022522d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:65','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:73','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:79','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:88','7ef10d823b981f2abe7343278bd0d2d995b013b2ce950826f79e01ce639d0266'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:94','764ceba18131bc8b35124a2cde5273fc5055617d335c78e76603c1f0440310d2'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:95','08517398938605a6c8403baf0dcc790954f5e5f96887d9e3aaad7209d8689084'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:100','ff90fba49d01b68bafae25e33246502f89b75c8d338d13ff712a612a1ef4a768'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:100-A','55714af09300e5a9129bdd05620525d890be46737816b688f9a9832ee050e80a'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:108','e7da8a8e2fb5199640d6ace53d3d1e9bc10b25665e4adb14ed31fc8181b6f3a3'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:110','11a44fbdb49e60805900f984c11737455e857159f83585f8699bdcccbbc52bf7'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:115','d430d254d4b1dd1602a73f0de913a14cfd7e3642b28ed461c991ece229451070'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:126','5aa51f922c95baede7f55a2753fe41bea58769283c48cb59365b2fb0fd8f6195'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:147-A','5eb9fdf83d9f96cafe1ea6504f5265e1190e28f9484d10daa11e6fb5cfc6f636'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:147-B','f3e81a0fd4d82f6fc1607bdd05011c461810a11a38c132f73132662a84055b14'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:150','d396a8f5047f17cb5b95e6b50903f1ce31022ce27e4cf5e33b4e68dc50081b72'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:152','07adfbb9386940db831f1352ad637d9d6e5bb4faab90efb6b6d8f25ec0b51ae7'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:154','c3a4084fd922eb4d52a9afe9d530cbc44e5c8ee942667f168f723f2930b9853e'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:168','42bf2de07b054ed26c86a186e9c54e9be054ebf6d773f7868a8c0bba10c6ec6d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:204','58c5dd719532dcbfc922610aa136578c8a1ad3a4eeb1999adc68ba868b4b2fc5'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:207','26a4497f35b066e2e57c3b7f356a87f144d3eadae74419f4695923b0b183ed80'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:208','395655d273ffe4dde2715f2171a0b531eb16499e4e1185afb90169ca79d802f3'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:211','52750e5ecea821869bbf02e0324aaf31460eac593955c049452c9a6bbaec0c84'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:212','ccd1b048d5440862a7b0c478f838f53e5deb2d6746479cbbc5e77f6ded13b3e3'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:222','01374530b030c3470336a70d814bb451c1d7eb76645b26fbed8e2e90234b3434'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:228','59bd053a0164f213db00c4f3a0723b7a35d2c297ebebdbedbe96bf0dc6a9e92f'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:239','a23b61026e139f3a3df0f8b616d87384f4e8fb6fd08be70691f5576f690dbd19'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:240','cffd4a9a6d359ef200e48504187188407720fc06d59727728b8b2e64e2950a2f'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:245','5a4e7a4835be4d9eda79366a817606a3a4a2ffb53af5ba4063fc8ea488b68020'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:252','0567f9e469b3d894e6a32bb5dca76b4eaeddcf53d4a7845603e6cbe6350ff299'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:278','141f47177a19ce679a0eddf0946c3eca913341ccbaf1f60daa23b1f53ea11807'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:279','4749e732dae54cb8c363b63e92507c5f8783085f50f8b953503da704ac91d8a1'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:287','fbfc90a43802b9f43c4ce601a8514f269af581a285a26dd25aef2bcdaf6d3736'),
    ('A04_D35_2013_01:DECRETO_35_2013:3','541edec4579b1096f7ba7820c84052917fc3f29bb11fb674cfb0d1851b76c235'),
    ('A04_D35_2013_01:DECRETO_35_2013:7','f26f0a9fa6d2f4fc2f8a446e3b4055436bf5da0446af019376842cda0845966d'),
    ('A04_D35_2013_01:DECRETO_35_2013:10','4af0e78cdbb194ac950ace65c581f6885c9d2c935cc25dda4c2571f125f7f0ee'),
    ('A04_D35_2013_01:DECRETO_35_2013:13','1eec596d0e94109dbf3c5b1c0a26f3db582f9c7a595b62c22288c76ac43a8dc0'),
    ('A04_D35_2013_01:DECRETO_35_2013:19','ee2dec28f2c2ea6b882b2ec2a311a8e9367d16aba20c08ae9a5703858ee1a7a8'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:1','9b39a86315ef3e3e4875e6ff00ec5bd81f3e23b2a2397a2af8d1cff2cf3497a5'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:39','1e71e3a1ebd03552e15c1aa01e9786efc19c5b09220984ac5edc0f32282fc7a5')
 ) AS e(id,hash_contenido) JOIN public.biblioteca_vectores b ON b.id=e.id
 WHERE b.hash_contenido=e.hash_contenido AND b.ingest_batch=split_part(e.id,':',1)
   AND b.instrumento_id=split_part(e.id,':',2) AND b.metadata->>'norm_id'=CASE split_part(e.id,':',1) WHEN 'A03_CODIGO_NINEZ_01' THEN 'HN:CODIGO_NINEZ' WHEN 'A04_D35_2013_01' THEN 'HN:DECRETO_35_2013' WHEN 'PILOTO_D284_2013_01' THEN 'HN:DECRETO_284_2013' END
   AND b.revision_pendiente=true AND b.es_norma_vigente IS NULL AND b.embedding=array_fill(0::real, ARRAY[384])::vector
   AND encode(sha256(convert_to(b.contenido,'UTF8')),'hex')=e.hash_contenido;
 IF n<>50 THEN RAISE EXCEPTION '01_datos_04: % de 50 filas no coinciden con contenido, hash o estado oculto',n; END IF;
END
$verify$;
COMMIT;
