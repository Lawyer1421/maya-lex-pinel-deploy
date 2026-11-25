-- 01_datos_06.sql | Solo mayalexhn-prod / thgrhueckkjdutjvcufp.
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
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:4','mayalex_normativos','10_LEYES_REGLAMENTOS','En la aplicación de las disposiciones relacionadas con la niñez los órganos competentes se ajustarán a la jerarquía normativa siguiente:

1. La Constitución de la República.

2. Los tratados o convenios a que se refiere el numeral 2 del artículo precedente.

3. El presente Código.

4. El Código de Familia.

5. Las demás leyes generales o especiales en lo que no se opongan a lo estatuido en este instrumento.

6. Los reglamentos de las leyes a que se refiere el numeral anterior.

7. La jurisprudencia establecida por la Corte Suprema de Justicia relacionada con los niños; y, 8. Los principios generales del derecho.','4','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":4,"article_sha256":"954457b85f84568963b59265ea187ba21ebe838672fa58868f920476645724f2","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','4','4edb3aef9eb765c50af6d4c503665f330673c8f2498a6c7ae46202a65214336c','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:17','mayalex_normativos','10_LEYES_REGLAMENTOS','El Estado racionalizará el uso de sus recursos financieros a fin de que los niños y sus madres cuenten con servicios de salud materno infantil integrales en las comunidades en que viven o en sitios próximos.

Asignará, además, en forma prioritaria, recursos destinados al gasto social, prestándole especial atención a las áreas de la salud y de la educación.','17','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":17,"article_sha256":"08ff171ca9ab6bb6d598095f79849634bf4ac0b93d39b8aaeefbec9396325c75","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','17','c4a2797f1a8db0541bdbcfcd12522e699930661d44fb3c90bbcd66f2dccce630','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:29','mayalex_normativos','10_LEYES_REGLAMENTOS','Todo niño tiene derecho a una nacionalidad, a su identidad personal, a poseer un nombre y apellido y a saber quiénes son sus padres. Estos derechos son imprescriptibles.','29','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":29,"article_sha256":"a3884b6bc1e1915836d4b0fe5b96ded939c6bd5363d55b1633b77642ca78fbbc","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','29','47f182ac112ddb84b88a355cf0a0ac30734f222806715b54c2daa02147af190b','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:32','mayalex_normativos','10_LEYES_REGLAMENTOS','Ningún niño o niña será objeto de injerencias arbitrarias o ilegales en su vida, dignidad y honor, así como en su domicilio, correspondencia y demás datos personales. En consecuencia, se prohíbe: 1) Exponer, difundir o divulgar sus nombres y apellidos u otros datos personales, informaciones o imágenes en los medios de comunicación masiva o electrónica, . que les identifiquen, directa o indirectamente, así como cuando se le considere responsable o víctima de una infracción de La Ley; y,

2) La publicación, reproducción, exposición, venta o distribución y la utilización en cualquier otra forma de sus expresiones e imágenes de niños y niñas presuntamente infractores de La Ley.

Quien autorice, facilite o permita la publicación, reproducción, exposición, venta, distribución o utilización de cualquier información que violente lo dispuesto por esta norma, será sancionado con una multa de diez (10) a veinte (20) salarios mínimos en su valor más alto, atendida la gravedad de la infracción. Sin perjuicio de la responsabilidad civil y penal a que hubiere lugar en Derecho.','32','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":34,"article_sha256":"76483754b7f7427b3a58addc194eff0f71bdff2c5a2d517cc9b8e76adf2936d8","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','32','76dc49228bd69939b3f8feae7a1276a012341f64363938705f1f241831edb324','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:40','mayalex_normativos','10_LEYES_REGLAMENTOS','La educación estará orientada a:

a) Desarrollar al máximo de sus posibilidades la personalidad, aptitudes, talentos, capacidad mental y física de los niños.

b) Inculcar en los niños el respeto y amor a sus padres y demás miembros de su familia, la propia identidad cultural, al idioma y a los valores humanos nacionales y de otras culturas.

c) Difundir el respeto de los derechos humanos y los principios fundamentales consagrados en la Carta de las Naciones Unidas, en la Convención sobre los Derechos del Niño y en la Constitución de la República, así como el conocimiento de la historia y de la geografía nacionales.

ch) Capacitar a los niños para que puedan desenvolverse responsable y solidariamente durante la vida y puedan contribuir a crear y mantener una sociedad libre, democrática, tolerante, pacífica, igualitaria y amistosa con los demás pueblos.

Desarrollar programas en todos los niveles educativos sobre formación de Valores Humanos y Familiares con el objeto de crear conciencia en los niños de la responsabilidad que conlleva ser padres de familia.

d) Crear en los niños un sentido de respeto por el medio ambiente.

e) Incentivar en los niños el conocimiento de sus deberes y derechos y un hondo sentido de responsabilidad.

f) Orientar y capacitar a los niños para que en la edad adulta consideren a la familia como un bien primordial y al trabajo como un medio indispensable para realizarse y para promocionar el desarrollo económico y social del país.

g) Formar a los niños de modo que en la edad adulta puedan hacer un aprovechamiento adecuado de la naturaleza, de la ciencia y de la tecnología; y, h) Contribuir a la conservación de la salud, a la formación y elevación espiritual del ser humano y al sostenido mejoramiento de la sociedad nacional.','40','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":42,"article_sha256":"86d9402bd0c6f1c028e549ecf104a6b2d81a3d6da96d84535d5ebfb70a1c3685","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','40','f22e6d99deea9a5a57754026f4a8f4d3da38bf4f5078a89f369e2860959363c8','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:43','mayalex_normativos','10_LEYES_REGLAMENTOS','Los educandos, así como sus padres o representantes legales, tienen el derecho de obtener información sobre los procesos pedagógicos y el de elegir la institución donde los primeros han de cursar sus estudios. Los padres o el representante legal, en su caso, tienen derecho de participar en la definición de propuestas educacionales.','43','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":45,"article_sha256":"d7284780bad26c2992005e0dc0292f23161f742ce87bb675352a55b22a06874c","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','43','2461ea3140350b4e1791338fd08ef749c99532366301e91dbbff63e1e5c8d4cb','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:44','mayalex_normativos','10_LEYES_REGLAMENTOS','Los centros de enseñanza primaria y secundaria procurarán brindarle a los educandos, además de la educación ordinaria, el aprendizaje de un arte u oficio acorde con la vocación y la capacidad de aquellos y las posibilidades económicas y técnicas de dichos centros.','44','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":46,"article_sha256":"ed7137c42277e17c1675a3cd0edfe3d3a16b34416d49a8fe65861a7ae625f430","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','44','f38dedc2b170d29c25965168fea98aed5bd69cf04a57bd7212469120d7b97964','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:47','mayalex_normativos','10_LEYES_REGLAMENTOS','Las corporaciones municipales, apoyadas por el Poder Ejecutivo, estimularán y facilitarán la asignación de recursos humanos y materiales para la ejecución de programas culturales dedicados a la niñez.','47','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":49,"article_sha256":"0c4bc3d0374c2496c6699999030e894dec44cd1a4e0dbe1c9d23d8b7526b34c2","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','47','900767533e348d99de2d62f5c408be34f4d5f9f17da0ecf3a35d2169bb7e29b0','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:57','mayalex_normativos','10_LEYES_REGLAMENTOS','A los padres corresponde dirigir las personas de sus hijos menores no emancipados, protegerlos, representarlos y administrar sus bienes.

Los niños no podrán ser separados de su familia natural sino sólo en las circunstancias especiales que determine la ley con la exclusiva finalidad de protegerlos.

Salvo lo dispuesto en el presente Código, las relaciones de familia, en general, y las relaciones paterno-filiales, en particular, se regirán por lo estatuido en el Código de Familia.','57','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":59,"article_sha256":"21b0a399eab05554417be7657f1fdb53507de3b40e503495287932edfbc6071e","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','57','618b52ba09a4d6ee622901c1198c4260134c280ed4809bb531eb8c89b2e3c5a5','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:59','mayalex_normativos','10_LEYES_REGLAMENTOS','El padre y la madre o los representantes legales de un niño procurarán resolver en forma directa las diferencias que se susciten en relación con sus condiciones, mantenimiento, guarda y educación. De persistir la discrepancia, se estará a lo dispuesto por el Código de Familia.

Cuando surja una diferencia sobre un hecho importante entre un niño mayor de dieciséis (16) años y las personas a cuyo cargo se encuentre, prevalecerá la opinión que más corresponda a lo prescrito por este Código y el Código de Familia.','59','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":61,"article_sha256":"7fb55420fd723d57b572e43060f54b1029cf7efffb837a4000da96fc938925f2","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','59','668be01003648f675abef30fd731c006cab46fd55fbd0cff5d5a6d480c5b58ed','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:67','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','67','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":69,"article_sha256":"96aabf492292448e107c2ac32fbe81d36cf9f17247a4d0bd8f4a79943c114ce0","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','67','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:75','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','75','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":77,"article_sha256":"4e6d60c789b346e5313c03b8c15e345f9e0eeb412afa8937d9e87bc2a3c7545d","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','75','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:84','mayalex_normativos','10_LEYES_REGLAMENTOS','Todos los días y horas son hábiles para atender los casos relacionados con la niñez. Incurrirán en responsabilidad civil, penal y administrativa las autoridades que sin causa justificada desatiendan los asuntos que se sometan a su conocimiento.','84','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":86,"article_sha256":"dcb50d4947e8e47c77ff24fbf5b801542d4c67adfac42f48c2f2510b6559bfc6","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','84','bb1393f4011eede5996423c24c1acd008720d0fb5b764bf5294a1a7b4b64b9dc','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:87','mayalex_normativos','10_LEYES_REGLAMENTOS','Los procedimientos administrativos y judiciales relacionados con la niñez tendrán una función formativa e informativa. Los mismos deben hacer posible que el niño se mantenga informado, atendidas su edad y su madurez, sobre el significado de cada fase del procedimiento y el sentido de las resoluciones, a fin de que se valore a sí mismo como persona humana y pueda desenvolverse con la responsabilidad propia de su edad.','87','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":89,"article_sha256":"101f85ef4d5438ad3eac20e496443fc0d78d7b63e4b63580f2ebac05da833320","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','87','6857ad1d168fa6006c7f58c2e141305e51bfc1628d5a79cea487c5eac3bee4b9','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:89','mayalex_normativos','10_LEYES_REGLAMENTOS','Mientras se agotan los procedimientos a que esté sujeto un niño las autoridades procurarán que permanezca con sus padres o representantes legales, salvo que esto sea inconveniente para aquél. En este último caso, se pondrá al niño bajo la guarda y cuidado de otra persona de reconocida honorabilidad, escogida, preferentemente, de entre sus parientes por consanguinidad más próximos.','89','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":91,"article_sha256":"9674172b65ea32b6d040340338901d4788db98d3a0e478e455b013aea781c5f2","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','89','e3322b406ba7c3f3782410ca3730de1a8606f7921830c5a15a44dfe1058956b8','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:93','mayalex_normativos','10_LEYES_REGLAMENTOS','El gobierno adoptará las medidas que sean necesarias para prevenir y, en su caso, sancionar, las amenazas o las violaciones a los derechos de los niños.','93','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":95,"article_sha256":"7179fee0e05f8f66a371ba4a76ada2db8f29a7a4493f87860edd5cf5cec8a9a5","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','93','429d2bed02485d789e093cf0aaa4583cbe00e42ed672779904ef59d9bedb8783','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:103','mayalex_normativos','10_LEYES_REGLAMENTOS','Los jueces de la niñez tendrán derecho a impedir la salida de un niño del país cuando quien pretenda llevárselo se halle en el ejercicio de la patria potestad pero no le esté dando cumplimiento a sus obligaciones legales o a las que le haya impuesto la autoridad competente. Adoptada la resolución, la pondrán sin tardanza en conocimiento de las autoridades de migración para los efectos consiguientes.

Si pese a la orden judicial el niño sale del país, se seguirá juicio criminal contra el culpable y se adoptarán las medidas necesarias para el rescate de aquél.','103','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":107,"article_sha256":"d32bb876a4aaad575baa61683f6a15337344722fabae63c9383e73aae5b6073f","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','103','c9740cf466409ddec69825189727f597387d341bd64d2846eb1fbb41f1393f3f','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:112','mayalex_normativos','10_LEYES_REGLAMENTOS','Los consejos a que se refiere el artículo anterior tendrán las funciones siguientes:

a) Proponer proyectos dirigidos a la prevención, detección, promoción, tratamiento, rehabilitación e investigación en el campo de los niños discapacitados.

b) Formular recomendaciones al Instituto Hondureño de la Niñez y la Familia para la elaboración y aprobación de programas orientados a atender las necesidades de los niños discapacitados.

c) Colaborar con la Secretaría de Salud en la prevención y detección de deficiencias mentales, físicas y sensoriales, con especial énfasis en la asistencia prenatal y de la primera infancia.

ch) Promover la organización de aulas públicas y privadas para la educación especial de los niños discapacitados, al igual que su integración al sistema educativo regular y a los programas del Instituto Nacional de Formación Profesional.

d) Fomentar el desarrollo de políticas de subsidio familiar dirigidas a proteger en forma especial a los niños discapacitados y a dar orientación y apoyo a la familia de la cual dependen.

e) Promover la formación de personal profesional, técnico y auxiliar de las actividades y disciplinas cuyo objeto sea la rehabilitación de los niños discapacitados.

f) Promover, a través de los sectores públicos y privados, investigaciones científicas dirigidas a buscar el mayor conocimiento de esta problemática; y, g) Promover una mayor divulgación de las deficiencias que se observen en los niños con miras a crear una conciencia colectiva que facilite la participación de la comunidad en la prevención y solución de sus problemas.','112','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":117,"article_sha256":"0a58b59d2c66a0368435906c688c0592113da547760e05b6393276a7793b2795","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','112','423390508f0336a05cf2c4913bff0f76d3db277165943963367c330243e78ec3','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:122','mayalex_normativos','10_LEYES_REGLAMENTOS','Los niños no podrán desempeñar labores insalubres o peligrosas aun cuando sean realizadas como parte de un curso o programa educativo o formativo.

La insalubridad o peligrosidad se determinará tomando como base lo dispuesto en este Código, en el Código de Trabajo y en los reglamentos que existan sobre la materia.

Tomando en cuenta lo anterior, los niños no podrán realizar labores que:

a) Impliquen permanecer en una posición estática prolongada o que deban prestarse en andamios cuya altura exceda de tres (3) metros.

b) Tengan que ver con sustancias tóxicas o nocivas para la salud.

c) Expongan al tráfico vehicular.

ch) Expongan a temperaturas anormales o deban realizarse en ambientes contaminados o con insuficiente ventilación.

d) Deban realizarse en túneles o subterráneos de minería o en sitios en los que confluyan agentes nocivos tales como contaminantes, desequilibrios térmicos, deficiencias de oxígeno a consecuencia de la oxidación o la gasificación.

e) Los expongan a ruidos que excedan ochenta (80) decibeles.

f) Impliquen la manipulación de sustancias radioactivas, pinturas luminiscentes, rayos X o impliquen la exposición a radiaciones ultravioletas o infrarrojas y a emisiones de radiofrecuencia.

g) Impliquen exposición a corrientes eléctricas de alto voltaje.

h) Exijan la inmersión en el mar.

i) Tengan que ver con basureros o con cualquier otro tipo de actividades en las que se generen agentes biológicos patógenos.

j) Impliquen el manejo de sustancias explosivas, inflamables o cáusticas.

k) Sean propios de fogoneros en los buques, ferrocarriles u otros bienes o vehículos semejantes. l) Sean propios de la pintura industrial y extrañen el empleo de albayalde o cerusa, de sulfato de plomo o de cualquier otro producto que contenga dichos elementos. ll) Se relacionen con máquinas esmeriladoras, de afilado de herramientas, muelas abrasivas de alta velocidad o con ocupaciones similares.

m) Se relacionen con altos hornos, hornos de fundición de metales, fábrica de acero, talleres de laminación, trabajo de forja o en prensas pesadas.

n) Involucren manipular cargas pesadas.

ñ) Se relacionen con cambios de correas de transmisión, de aceite o engrase u otros trabajos próximos a transmisiones pesadas o de alta velocidad.

o) Se relacionen con cortadoras, laminadoras, tornos, fresadoras, troqueladoras y otras máquinas particularmente peligrosas.

p) Tengan relación con el vidrio o con el pulido y esmerilado en seco de vidrio o con operaciones de limpieza por chorro de arena o con locales de vidriado y grabado.

q) Impliquen soldadura de cualquier clase, cortes con oxígeno en tanques o lugares confinados o en andamios o molduras precalentadas. r) Deban realizarse en lugares en los que se presentan altas temperaturas o humedad constante.

s) Se realizan en ambientes en los que se desprenden vapores o polvos tóxicos o que se relacionen con la producción de cemento. t) Se realicen en la agricultura o en la agroindustria que impliquen alto riesgo para la salud.

u) Expongan a un notorio riesgo de insolación; y, v) Señalen en forma específica los reglamentos que sobre la materia emita la Secretaría de Estado en los Despachos de Trabajo y Seguridad Social.

La mencionada Secretaría de Estado podrá autorizar a niños mayores de dieciséis (16) años y menores de dieciocho (18) para que puedan desempeñar alguna de las labores señaladas en este artículo si se prueba a satisfacción de la misma que han concluido estudios técnicos en el Instituto Nacional de Formación Profesional o en un instituto técnico especializado dependiente de la Secretaría de Estado en el Despacho de Educación. Aquella entidad, en todo caso, verificará que los cargos puedan ser desempeñados sin peligro para la salud o la seguridad del niño.','122','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":127,"article_sha256":"c699798e003c9dbc3e3b5e941115b1c8984e9102fde0d827eba49799c9e28ae5","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','122','756a543da8bee3734c3cdfc64ad05cddabe92ff88ee7412e064ea75a6fd39c6f','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:138','mayalex_normativos','10_LEYES_REGLAMENTOS','Las Secretarías de Estado en los Despachos de Trabajo y Seguridad Social y de Salud, así como el Instituto Hondureño de la Niñez y la Familia, conjuntamente adoptarán las medidas que sean necesarias para que los niños cuyos padres o representantes legales trabajen puedan ser atendidos en guarderías infantiles mientras dura la jornada laboral.

Velarán, asimismo, porque dichas guarderías cuenten con las facilidades necesarias para que la permanencia sea provechosa para los niños en atención a su edad y estado físico y mental.

En todo caso, dichos servicios deberán estimular el desarrollo del niño, atender adecuadamente sus necesidades primarias de salud y nutrición y contribuir a su sostenido mejoramiento psico-social.

El personal que labore en los establecimientos de guarda de los niños deberá ser especialmente capacitado para cumplir sus funciones.','138','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":143,"article_sha256":"4f91819a6fc00fee19bdb6e3518342f5ab4709efd7d85024b6039403867dd879","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','138','1d3f084774219ea71b3bf6b9ca6362f86e82e0e9abf5af450af32125e9bcb6d5','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:144','mayalex_normativos','10_LEYES_REGLAMENTOS','Los centros a que se refiere el artículo precedente están obligados a dispensar de inmediato la atención de urgencia que requiera un niño. Ningún motivo podrá invocarse para negar dicha asistencia, ni siquiera la ausencia de representantes legales, la carencia de recursos económicos o la falta de cupo.','144','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":149,"article_sha256":"b1ab75bc169ad25e943adb7d29670d8e3c68dca8931130f30513e245423db8c6","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','144','19c901fb28398347b1d4d03ffab6002a88bbe4019b22e5d393b28c4b376d94f4','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:149','mayalex_normativos','10_LEYES_REGLAMENTOS','La declaratoria de que un(a) niño(a) se encuentra en situación de abandono o de vulnerabilidad de sus derechos obliga al Instituto Hondureño de la Niñez y la Familia (IHNFA) a proceder de inmediato a brindarle la protección que necesite. Cuando las circunstancias lo exijan, el Juzgado de Letras de la Niñez competente, o el que haga sus veces, a petición del IHNFA, ordenará el allanamiento del sitio donde el niño o niña se encuentre.

Durante todo el tiempo en que se mantenga vigente la declaración del niño(a) en situación de vulneración de derechos, el Poder Ejecutivo, por intermedio de Instituto Hondureño de la Niñez y la Familia (IHNFA), dispondrá un programa de seguimiento, incluyendo atención médica, psicológica o psiquiátrica del niño o niña, o de su padre, madres, responsable o representantes legales.','149','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":159,"article_sha256":"63398b9920c455b2064517dcaa27fd16d952707c5b5242e3c72d5087ef8268c4","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','149','7f875a84c1b3b797ee633b11784ff2c8c6dc7622c754f51be27360dc50b6045b','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:157','mayalex_normativos','10_LEYES_REGLAMENTOS','Siempre que quien tenga la administración de los bienes de un niño en su condición de padre, madre o tutor ponga en peligro intereses económicos, el Instituto Hondureño de la Niñez y la Familia o el Ministerio Público promoverán ante el juzgado competente el proceso necesario para privarlo de la administración de sus bienes o para remover al guardador, en su caso, y los encaminados a obtener la reparación del perjuicio que hubieran causado.','157','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":167,"article_sha256":"79af127a5cbc70f79f1ff5284b7652a7724028a0c057e8d2555d9289c9e044f2","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','157','dc63c6729d6cf9726229dc0e2f06ff61398f1f1aaa817c47cd53202c8944b9be','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:160','mayalex_normativos','10_LEYES_REGLAMENTOS','Corresponde a los parientes del niño que carezcan de representante legal, el Instituto Hondureño de la Niñez y la Familia y al Ministerio Público ejercitar las acciones necesarias para que el juzgado competente lo someta a tutela.','160','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":170,"article_sha256":"93a13087ce4584c5758845da6227b3b4d0c446b61cd0580bb04abadc0c9db092","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','160','a609eacb4c96d56a0a167246608e22e8ececc4c5a597839293ceb3862953af37','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:162','mayalex_normativos','10_LEYES_REGLAMENTOS','Se prohíbe el maltrato de niños o niñas, considerándose maltrato toda acción u omisión que violente los derechos y el bienestar de éstos, afectando su salud física, mental o emocional.

Se consideran víctimas de maltrato, los niños y niñas que han sufrido daños o perjuicios en su salud física, mental o emocional o de su bienestar personal, por acciones u omisiones de su padre, madre, representante legal, maestros(as) u otras personas con las que guarde relación.

El maltrato puede ser por:

1) Omisión; 2) Supresión; y, 3) Por Trasgresión".','162','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":172,"article_sha256":"d7c6b2650686cf833fb61a0c0840509c59a6805158fe6912a56902532120b41c","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','162','bc8ed385062aa5ef3ac691b9fdb77005de7b30614c0ceaa41748402973c9c7a0','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:163','mayalex_normativos','10_LEYES_REGLAMENTOS','El maltrato por Omisión es aquel que se da por el incumplimiento de los deberes de los padres, representantes legales o cualquier otra persona que esté a cargo del niño o niña, éste puede ser físico, intelectual o emocional.

El maltrato Físico por Omisión, comprende aquellos casos en que el niño o niña es dejado solo o sola en imposibilidad de acceder con un mínimo grado de seguridad a un techo, vestimenta, alimentación o cuidados físicos y médicos necesarios u otros análogos.

El maltrato Intelectual por Omisión, comprende aquellos casos en que no se le presta la atención debida al niño o niña, en los procesos educativos, formativos y recreativos.

El maltrato Emocional por Omisión, comprende aquellos casos en que se deja de proveer al niño o niña, el afecto y cariño que necesita para su sano desarrollo.

Las acciones de violencia en el núcleo familiar, aunque no afecten directamente al niño o niña, serán consideradas como maltrato por omisión.','163','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":173,"article_sha256":"f3e0c3dce8a0ff8c9a990e3b371c76c9df4c08bee50cd600a45372b6a9e4361c","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','163','70807ce7692905d7e47bb09477f6a6046a74fb7e4341c6fd2642ce648dbf5e2c','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:170','mayalex_normativos','10_LEYES_REGLAMENTOS','[DEROGADO — art. 11 del Decreto No. 35-2013]','170','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":180,"article_sha256":"2ddc1f453e5c0eeae6627a59ec5c3965350e45e70dd7a4469ba1d79681513669","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"DEROGADO","fuente_canonica":"D35_2013_ART_11"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','170','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:177','mayalex_normativos','10_LEYES_REGLAMENTOS','Las autoridades y el personal docente o administrativo de los centros de enseñanza que detecten entre los educandos tenencia, tráfico, comercialización o consumo de drogas prohibidas, darán cuenta del hecho al Instituto Hondureño para la Prevención y Tratamiento del Alcoholismo, la Drogadicción y Farmacodependencia (IHADFA), y a los padres o representantes legales del menor para que tomen las medidas correctivas necesarias. La omisión será sancionada con multa de un mil lempiras (L. 1,000.00) a cinco mil (L. 5,000.00) lempiras, sin perjuicio de las demás responsabilidades a que haya lugar.

El alcoholismo, el tabaquismo o la drogadicción de un niño no servirá de base para negarle acceso a un centro educativo, salvo que el Instituto Hondureño para la Prevención y Tratamiento del Alcoholismo, la Drogadicción y Farmacodependencia (IHADFA) considere que el hecho puede ser perjudicial para los otros niños. En tal caso, las autoridades educativas adoptarán las medidas necesarias para que el niño no interrumpa sus estudios por dicha causa. El incumplimiento de esta disposición será sancionado en la forma prevista en el párrafo anterior.','177','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":187,"article_sha256":"dccd1a9c2cba12062228edc797158096cb4eae04b304b5e4ed4339200bca7595","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','177','604da236284446ece02495b0096f122ef1f6780ac10308aa8cdff82107eb96bf','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:179','mayalex_normativos','10_LEYES_REGLAMENTOS','El Instituto Hondureño para la Prevención y Tratamiento del Alcoholismo, la Drogadicción y Farmacodependencia (IHADFA), cooperará con las autoridades competentes en el comiso y destrucción de todo material escrito, televisivo, fotográfico y cinematográfico, radial o computarizado que incite a la drogadicción, al alcoholismo o al tabaquismo. Denunciará, igualmente, tales hechos ante el Ministerio Público y demás autoridades competentes.','179','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":189,"article_sha256":"84adfe98b09edd673b61a579fc5c4c960122af7d247dfd77d4fbe9acc38b7725","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','179','34c2bb2c3b64c5f867504d747dca7c6d5a256ebf45fe5ef7bfb20a22588e53d5','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:186','mayalex_normativos','10_LEYES_REGLAMENTOS','Para los efectos de El Sistema, todos los días y horas son hábiles y comenzarán a correr al día siguiente de su notificación.

Las partes a cuyo favor se ha señalado un plazo o término legal o judicial, sean éstos individuales o comunes, podrán renunciarlo o abreviarlo mediante la expresa manifestación de voluntad ante la autoridad competente.

Cuando el plazo sea común, se reputará que existe renuncia o abreviación, mediante la expresa manifestación de voluntad de las partes.

La renuncia de los plazos, no implicará una extensión del plazo máximo de que se trate.

Las autoridades que sin causa justificada desatiendan los asuntos que se sometan a su conocimiento incurrirán en responsabilidad civil, penal y administrativa.','186','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":198,"article_sha256":"04bc2f5528c7a24f3bd3e1c8d5fe683e70fbf3bff77fabe0c7963fb15acd06a1","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','186','db8f61aaa5b1f233528a4aac9a5732a8edcaf193e6753ee3f21397398c9f0bfb','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:191','mayalex_normativos','10_LEYES_REGLAMENTOS','Se entenderá por flagrancia, cuando El Niño(a) sea sorprendido:

a) En la comisión del Hecho Delictivo; o, b) Inmediatamente después de cometerlo, es perseguido materialmente.

En este caso, la detención se notificará inmediatamente a sus padres, responsable o al Instituto Hondureño de la Niñez

y la Familia (IHNFA); cuando ello no sea factible, se les notificará en el plazo más breve posible.

Se entenderá por responsables a las personas que lo tengan bajo su cuidado en forma temporal o permanente.

Si es extranjero, se le asegurará la inmediata comunicación con la autoridad consular de su país, de conformidad con los Tratados y Convenios Internacionales vigentes en Honduras.

Si la detención en flagrancia fuere realizada por agentes policiales, éstos deben presentarlo inmediatamente ante el Ministerio Público. Si es practicada por cualquier otra persona, ésta debe entregarlo de inmediato a la autoridad policial más próxima, la que procederá en la forma señalada en este párrafo.

Si muestra señales de maltrato físico o psicológico, inmediatamente el Ministerio Público dispondrá su evaluación psico-fisica, quien de verificar las agresiones, abrirá la investigación para determinar la causa y tipo de las lesiones. así como sus responsables.','191','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":204,"article_sha256":"ab5267e987f80d78574b0c9ded54b4201dc803a2ad77eb1f5819cd3e95fc126b","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','191','c7ebfd200ef5b4be414ae663dd749cd3dadb4bc601ce30be9266376d5eea311f','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:199','mayalex_normativos','10_LEYES_REGLAMENTOS','La Reparación del Daño a la Víctima tiene por finalidad resarcir el daño causado, asignando al

Sancionado una obligación de dar o de restituir la cosa dañada por su conducta o entregar un valor sustituto.

Solamente podrá imponerse, si la víctima y el Sancionado hayan manifestado su acuerdo.

Si ambas partes acuerdan sustituir la obligación de hacer por una suma de dinero, el Juez procederá a fijar la cuantía que considere equivalente a los daños y perjuicios ocasionados por el Hecho Delictivo.

En la Resolución respectiva deberá estipularse el plazo de cumplimiento, el cual no podrá ser mayor a un (1) año.

El Juez a cargo de la Ejecución declarará que la Sanción se encuentra cumplida, cuando el daño haya sido reparado en la forma acordada.','199','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":212,"article_sha256":"99cb558b432ce27e66be06ecc5465589bb88d00ac0a9de9b68deb6cf643002bd","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','199','d5780ad1cc74db918f4ddd42ec471a1b835c40d23873f8b4eeac4b64ed02800d','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:220','mayalex_normativos','10_LEYES_REGLAMENTOS','La solicitud de Suspensión del Proceso a Prueba deberá contener un Plan de Reparación del Daño causado por el Hecho Delictivo y un detalle de las condiciones que El Niño(a) estaría dispuesto a cumplir. Este podrá consistir en una indemnización equivalente a la reparación del daño que, en su caso, pudiera llegar a imponerse o una reparación simbólica, inmediata o por cumplir a plazos.

Para el otorgamiento de la suspensión será condición indispensable que El Niño(a) admita el hecho que se le atribuye. El trámite no podrá exceder de veinte (20) días, contados a partir de la solicitud.

La resolución que declare inadmisible la solicitud de Suspensión del Proceso a Prueba será recurrible".','220','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":233,"article_sha256":"152d78166b75f211d039b2debb126a0b52c7cdbe3fe6a1d0d366f01a7ae376bf","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','220','24343052fb45a6b4eac5ac17524c21fc19d3e4b7bfabcb1f7c65c024d47e8e9a','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:226','mayalex_normativos','10_LEYES_REGLAMENTOS','La Suspensión del Proceso a Prueba no extingue las acciones civiles de la víctima o de terceros. Sin embargo, si la víctima recibe pagos en virtud de la procedencia de la suspensión, ellos se destinarán a cuenta de la indemnización por daños y perjuicios que le pudiere corresponder.

Transcurrido el plazo que se fije sin que la suspensión fuere revocada y cumplido el plan de reparación, se extinguirá la acción penal y el Juez deberá dictar de oficio o a petición de parte, el sobreseimiento definitivo.

Durante el período de Suspensión del Proceso a Prueba de que tratan los artículos precedentes, quedará suspendida la prescripción de la acción penal.','226','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":239,"article_sha256":"62630020e5644e937f745e67242fd8e94ff4b50b36902e3a23f5788ff71b486c","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','226','137f17369551f72b6b95b64d3d49bfb37061b7cb0f3cd3fbf8cd3d9912b4b9e4','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:229','mayalex_normativos','10_LEYES_REGLAMENTOS','Concluidas las investigaciones iniciales, el Ministerio Público podrá:

a) Ordenar el archivo del respectivo expediente; b) Formular por escrito al Juez, la solicitud para que le autorice la Suspensión del Proceso a Prueba; c) Solicitar sobreseimiento definitivo; o, d) Presentar la respectiva Acusación.

En el caso previsto en el inciso b) de este Artículo, el Juez resolverá sin más trámite la solicitud correspondiente.','229','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":242,"article_sha256":"9a31e31f2ed15a72f3ac097fce240d3e1929dfc8bcb5aca92baf054eca48fb1b","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','229','b50a3a5ee8f2c91033012d83b9edc69f1e458fc631ccf23fd0003376774b07f2','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:231','mayalex_normativos','10_LEYES_REGLAMENTOS','Los Procesos contra Niños(as) son de alta prioridad y especial interés público, con plena salvaguarda del derecho que tienen a ser escuchados. Bajo pena de nulidad, su declaración debe ser rendida conforme a las reglas siguientes:

a) Únicamente ante Juez competente; b) Voluntariamente, de manera que sólo se puede tomar, cuando lo haya consultado con su Defensor; c) Asistida, de modo que se realice con la asistencia de su Defensor; d) Se dará prioridad a la declaración, procurando que el tiempo entre la presentación y la declaración sea el menor posible; e) Será breve, de modo que la comparecencia ante el Juez tome estrictamente el tiempo requerido, considerando inclusive períodos de descanso para El Niño(a);

f) Será eficiente, por lo que la autoridad tendrá que preparar la comparecencia con antelación a fin de obtener la información que requiera para el ejercicio de sus funciones, en el menor número de sesiones que sea posible; y, g) Se evacuará en presencia de sus padres, responsables o funcionarios competentes del Instituto Hondureño de la Niñez y la Familia (IHNFA), a cargo de la protección a los niños y niñas, siempre que éste o su defensor lo soliciten y el Juez lo estime conveniente.

Las mismas reglas se observarán, en lo aplicable, en las entrevistas que voluntariamente tenga un Niño(a), con el Ministerio Público.','231','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":244,"article_sha256":"3f17a41f40a04b9ac1da8cfd06b92eca1ddd2d4b6087c1444b9aae1bee70b320","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','231','2ac7faf9de664e4018ec66e51cb954dbd0cf2ad0c358fd1cc98eef7038bb6e4f','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:241','mayalex_normativos','10_LEYES_REGLAMENTOS','Las partes podrán recurrir las resoluciones del Juzgado de Letras de la Niñez o quien haga sus veces, mediante los recursos y trámites establecidos en el Código Procesal Penal, salvo las disposiciones especiales establecidas en este Título.

Cuando proceda, en aras de la justicia, el Ministerio Público podrá presentar impugnación a favor de El Niño(a).

Contra las sentencias definitivas pronunciadas por el Juez de Letras de la Niñez o el que haga sus veces podrá interponerse el Recurso de Casación.

En la tramitación de los recursos, se observará irrestrictamente lo establecido en el Artículo 10 de este Código, so pena de incurrir en la responsabilidad prevista en la Ley.','241','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":254,"article_sha256":"20e7ae1ad76671741a1eb5a12e534922978796991e61bd985c0e8b86c6b95db8","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','241','8bf097625946eb22b7e3f25f6eca9cb23a4a261a7bc366f0c6d542b4cb6423ce','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:255','mayalex_normativos','10_LEYES_REGLAMENTOS','Firme la Sentencia que disponga la Semi-libertad, el Instituto Hondureño de la Niñez y la Familia (IHNFA), tendrá un plazo no mayor de quince (15) días hábiles, para formular y presentar al Juez, el respectivo Plan de Atención Individual.','255','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":268,"article_sha256":"77799641b0dbb0cc5ea63165c9c0731739f526577ffd84399c363bfcc0e3b8ec","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','255','fd37021a356f328b839d65e16ad3bfd0bde9e572240d105b065d07cf165e0132','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:258','mayalex_normativos','10_LEYES_REGLAMENTOS','Los empleados y funcionarios de los centros privativos de libertad, serán reclutados, evaluados y seleccionados por concurso de oposición, los cuales deberán contar con aptitudes e idoneidad, valores y principios para ejercer sus funciones. Así como estar especializados en el trabajo con Niños(as) privados de libertad.','258','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":271,"article_sha256":"c67efb8ded43d0b0393406d9170e881e4ef114cb77a04710a61542d49c2f5159","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','258','88258a40fd9e28fec74fc5408b2dc05af60d2cdc1afae60149e94d92e3dc9dfb','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:268','mayalex_normativos','10_LEYES_REGLAMENTOS','Una vez ejercitada una acción de restitución de derechos ésta no podrá ser retirada ni desistida.','268','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":281,"article_sha256":"3aa797cb1221a24ee5dc32220b37225fdc0dd8282f5f3ae5c7a22b38b1aff466","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','268','a73138aec9a724e3d1ebb73eb5817b392415ca3a965049abfd4623b42d4c592f','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:269','mayalex_normativos','10_LEYES_REGLAMENTOS','El Instituto Hondureño de la Niñez y la Familia será el órgano encargado de coordinar a los sectores públicos y privados para el estudio, promoción, ejecución y fiscalización de las políticas generales de prevención y protección integral a la niñez.','269','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":282,"article_sha256":"6d8005aa6ec644b7d04d9a15e848bec697b87c583d7e57c4803029db4d8c34ea","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_A03_DICTAMINADO_CLO","fuente_canonica":"A03_CONSOLIDADO_DICTAMINADO"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','269','a11ea12bd703248a0bfd7548c5e1e0f91174e26dc949f64cb439b1873a982dad','A03_CODIGO_NINEZ_01',now()),
('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:282','mayalex_normativos','10_LEYES_REGLAMENTOS','Los casos de sustracción internacional de niños y niñas serán sustanciados conforme a este Código, hasta que se emita la Ley especial sobre la materia.','282','Código de la Niñez y de la Adolescencia (Decreto 73-96), texto canónico v2 con las reformas del Decreto 35-2013 (La Gaceta 33,222)','{"texto_origen":"CANONICO_D3_FUENTES_MIXTAS","transcripcion_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","text_sha256":"99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v2 de HN:CODIGO_NINEZ (ADJUDICACION_CLO_CODIGO_NINEZ.md §3)","manifiesto_sha256":"bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372","pliego":"docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md","procedencia":"Fuentes mixtas acreditadas por el pliego D1–D8 firmado (ver estado_canonico de cada fila); sin V4/V5 hasta el SQL de visibilidad","norm_id":"HN:CODIGO_NINEZ","instrumento_id":"CODIGO_NINEZ","ingest_batch":"A03_CODIGO_NINEZ_01","ordinal":296,"article_sha256":"f77b706fae854c1486bfecd632bec526acddde97ecc88ff8edfc9313572db5ab","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[],"estado_canonico":"TEXTO_V8_D3","fuente_canonica":"V8_LA_GACETA_33222"}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','codigo',NULL,true,'CODIGO_NINEZ','282','0272ed31a27e386b9ff310d696e668bc96650e7e3c44d488c602a1666b5ef2b9','A03_CODIGO_NINEZ_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:2','mayalex_normativos','10_LEYES_REGLAMENTOS','- A las sociedades mercantiles constituidas
bajo este régimen les son aplicables las disposiciones del Código
de Comercio relativas al tipo de sociedad de que se trate, así

como las de otras leyes de la República en lo que no se opongan
a lo dispuesto en este Decreto.

No pueden ser creadas bajo esta modalidad las sociedades que
tengan como finalidad el desarrollo de actividades objeto de
regulación y supervisión especial por parte del Estado, tales como
las que se dediquen a actividades relacionadas con el sistema
financiero.','2','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":2,"article_sha256":"6b1e63161002980df147b9a7862155376c8ce84ba6c92db1f8f4ce46287ab183","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','2','bcf5e2c99b7114b0a7df7950b76fc8daf049ea60583772ee6f3713aa13e1d65e','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:15','mayalex_normativos','10_LEYES_REGLAMENTOS','- Es lícito el pacto en el que las partes
acuerden renunciar al procedimiento judicial para la ejecución de
garantías y sujetarse a un procedimiento especial de ejecución
ante notario. El pacto suscrito para tal efecto puede constar en el
mismo instrumento público que contenga la garantía o en
instrumento público separado y debe ser inscrito en el registro de
la propiedad que corresponda. Dicho pacto debe establecer el
precio base del inmueble dado en garantía y la forma del
requerimiento, y sujetarse a los procedimientos establecidos en
este decreto.','15','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":15,"article_sha256":"630bf51fa54f4136b5dd18957b84a6996dc758698f159577eea1ebf694a4e666","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','15','fe32758358227008a23c918fc8914b9d1462f0cbb306ae8fa840da45d547b2d4','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:17','mayalex_normativos','10_LEYES_REGLAMENTOS','- El requerimiento puede hacerse en una
dirección física o electrónica previamente pactada, o en su defecto
en el domicilio o el lugar de empleo del deudor. Si el mismo no se
encontrare presente bastará con fijar una copia en la entrada del
lugar debiendo también entregársele copia a cualquier persona
que allí se encuentre y a dos (2) de los vecinos del lugar quienes
actuarán como testigos del acto. Además, puede realizarse una
filmación en vídeo de estas actuaciones la cual tendrá fuerza legal.
Si se desconociere el paradero del deudor, el requerimiento debe
publicarse durante tres (3) veces consecutivas con un (1) día de
separación, en un diario de los de mayor circulación y un medio
de comunicación masiva con cobertura en el lugar del último
domicilio conocido de éste, después de lo cual se puede proceder
con la ejecución.','17','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":17,"article_sha256":"ee6007e774962184b8f0d780231a1efa69d49596b27c3e8d91fc3db81268ca39","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','17','d96720100dd0994f160d5abeaff0c2b56dcfe90a1dd68f0568c6e8ed22b9e553','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:19','mayalex_normativos','10_LEYES_REGLAMENTOS','- El acta donde conste el requerimiento o
notificación por Notario debe inscribirse en el mismo asiento en
el que se haya inscrito la garantía. El registro de la notificación o
requerimiento como anotación en el asiento donde se encuentre
inscrito el bien o el acto o contrato tiene el mismo valor de los
embargos decretados judicialmente.','19','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":19,"article_sha256":"f861eac3835006032ffcec87b6924070274c26f5507e35a0f6c6439b5992a6c0","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','19','dd0aad2bdf5d2420e422aa288ee807d184db7b00cd021aa4cd4318ded6ea3adb','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:20','mayalex_normativos','10_LEYES_REGLAMENTOS','- La venta debe hacerse en pública subasta
a favor de quien ofrezca el mejor precio.

El acreedor puede participar en la subasta ofertando el valor de
su crédito o un monto superior.

En caso de que nadie participe en la subasta se debe adjudicar el
bien a favor del acreedor sin necesidad de que éste oferte su

crédito. En los casos en que el valor del bien rematado no cubra
el pago total de la obligación queda a salvo el derecho del acreedor
de perseguir otros bienes del deudor, debiendo constar en el acta
correspondiente.

De todo lo actuado debe levantarse el acta correspondiente. Esta
acta servirá de título traslaticio del dominio sobre la garantía,
debiendo inscribirse la misma.','20','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":20,"article_sha256":"96e0f9b8bc54d952d1fa8b5115ad41929e306e8025f8672e9f81a3cb07335d51","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','20','bd25656eb0147feecf49c0fe512f4b3c79b139de19dd3564d2eea613b8ca92b6','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:26','mayalex_normativos','10_LEYES_REGLAMENTOS','- Reformar los Artículos 21, 40, 42, 43,
44, 45, 46 y 50 de la Ley para la Promoción y Protección de
Inversiones contenida en el Decreto Legislativo No. 51-2011 y
en sus decretos de reforma e incorporar por adición al mismo el
Artículo 17-A; todos los cuales se leerán así:

“ARTÍCULO 17-A.- Aún cuando lo hubiese decretado el
Consejo de Secretarios de Estado, los inmuebles sobre los cuales
se desarrollen proyectos que se sujeten a estas disposiciones, no
les serán aplicables las disposiciones para la regularización de
inmuebles por necesidad pública contenidos Ley de Propiedad.”

“ARTÍCULO 21.- La duración máxima de los contratos de
estabilidad será de quince (15) años, excepto en el caso de
inversiones bajo la modalidad de Alianza Público-Privada, cuya
duración será la que se establezca en las cláusulas del contrato
respectivo o en el acuerdo separado que se suscriba al efecto.

Cuando se trate de proyectos relacionados a actividades forestales
o mineras, el término de la vigencia podrá ampliarse hasta
veinticinco (25) años.”

“ARTÍCULO 40.- Las inversiones calificadas como
proyectos de interés nacional están sujetas a la aplicación de un
procedimiento acelerado de inversión. Previo a la declaratoria
del Consejo Nacional de Inversiones o COALIANZA según
corresponda, debe realizar un análisis económico y de viabilidad
del proyecto para lo cual debe emitir un dictamen con la respectiva
recomendación.

Dicha recomendación debe ser trasladada al Poder Ejecutivo para
que el Presidente de la República en Consejo de Secretarios de
Estado o en un gabinete sectorial especial, si lo estima
conveniente, emita un Decreto Ejecutivo conteniendo la
declaración de interés nacional y un certificado de incorporación
y viabilidad de operación. Esa certificación hace las veces de
todos los permisos o licencias requeridos por la legislación
hondureña para desarrollar el proyecto.

Este procedimiento desde su inicio hasta su conclusión con la
emisión del Decreto Ejecutivo debe realizarse en un término no
mayor de treinta (30) días hábiles”.

“ARTÍCULO 42.- Créase el Consejo Nacional de
Inversiones (CNI) como una entidad de derecho público, con
personalidad jurídica y patrimonio propio, cuyos fines principales
son:

a) La promoción y desarrollo de la inversión privada;

b) La facilitación de trámites y asistencia a los inversionistas
antes, durante y después de establecida una inversión; y,

c) La formulación de propuestas de política pública encaminadas
a la creación de un clima favorable a la inversión tanto nacional
como extranjera.

El patrimonio del Consejo estará conformado por las donaciones
y aportaciones que reciba de quienes se beneficien de los servicios
que preste, las aportaciones que reciba por parte del Estado de
Honduras, los recursos provenientes de donaciones y otros de
origen lícito que se produzcan como resultado de sus operaciones.
Asimismo, se le autoriza para contratar empréstitos y realizar
inversiones encaminadas a incrementar su patrimonio en
instrumentos de bajo riesgo en los mercados nacional o
internacional. Las aportaciones y donaciones que reciba el Consejo
deberán publicarse en su sitio web, detallando los montos o valores
de la aportación o donación y el nombre o razón social del o los
aportantes, así como los fines a los que el mismo sea destinado.

El Estado podrá realizar aportes periódicos o aislados de recursos
para fines específicos al mismo, o subcontratarlo para actividades,
consultorías, misiones o proyectos específicos relacionados con
sus funciones.”

“ARTÍCULO 43.- La Junta Directiva del Consejo Nacional de
Inversiones estará integrada de la siguiente manera:

Por el Sector Público un Comisionado de COALIANZA y tres
Secretarios de Estado nombrados por el Presidente de la
República; y por el Sector Privado participarán cuatro

representantes que serán nombrados por el Presidente de la
República de un listado de diez (10) personas que le será remitida
por el COHEP. Su rotación y condiciones de nombramiento por
más de una vez, se determinará en el reglamento de esta
Ley.”

“ARTÍCULO 44.- Son funciones del Consejo Nacional de
Inversiones:

a) Realizar la función de Secretaría del Consejo Nacional de
Competitividad e Innovación y presentar al Presidente de la
República las propuestas de política pública necesarias para
simplificar los trámites necesarios para llevar a cabo
inversiones de carácter privado o para iniciar un negocio, así
como para la obtención de los permisos y licencias necesarios
para su operación para lo cual deberá dar seguimiento a las
recomendaciones que al efecto se hagan en el Informe Doing
Bussiness del Banco Mundial u otros organismos
internacionales que lleven a cabo estudios similares;

b) Definir y/o actualizar anualmente en coordinación con la
Presidencia de la República y las entidades estatales sectoriales
la lista de los sectores prioritarios de inversión en Honduras y
diseñar estrategias para la promoción de los mismos;

c) Coordinar junto con la Secretaría de Estado en el Despacho
de Relaciones Exteriores las actuaciones en el extranjero de
su Secretario Ejecutivo. Para ello los miembros de su Junta
Directiva gozarán de estatus de embajadores y contarán con
plenos poderes de representación del Estado de Honduras;

d) Desarrollar, coordinar, impulsar y promover a través de su
Secretaría Ejecutiva el programa permanente de imagen de

país como principal componente de los esfuerzos para
mantenimiento de la identidad competitiva de Honduras en el
exterior. Las instituciones sectoriales del Estado deberán
coordinar con el Consejo Nacional de Inversiones cualquier
esfuerzo de promoción internacional que pretenda realizar bajo
sus ámbitos de competencia;

e) Promocionar internacionalmente a Honduras como un destino
de inversiones pudiendo delegar o subcontratar esta función
en otras entidades nacionales o extranjeras;

f) Trabajar en coordinación con la Secretaría de Estado en el
Despacho de Relaciones Exteriores y en estrecha relación y
armonía con las representaciones diplomáticas de Honduras
alrededor del mundo, a fin de proveerles con información
actualizada relativa a cambios en la legislación o la política del
Estado que pudieren incentivar o afectar la inversión, así como
de potenciales rubros atractivos para la misma;

g) Proveer a las cámaras de comercio u otras entidades según lo
estime conveniente información relativa a los cambios en la
legislación que afecten la inversión y la apertura de negocios
y procurar el establecimiento de una ventanilla única para
lograr este objetivo;

h) Recomendar la aprobación de los contratos de estabilidad
jurídica y remitirlos a la Presidencia de la República para su
suscripción y aprobación de conformidad con lo establecido
en el Artículo 25 de la presente Ley. Se exceptúan aquellos
casos en que el contrato este integrado como cláusula en un
contrato de una Alianza Público Privada;

i) Ser el ente encargado de gestionar y mantener la membresía
del Estado de Honduras en la Comisión de las Naciones
Unidas para el Derecho Mercantil Internacional (CNUDMI),
UNIDROIT, y otros organismos internacionales relacionados
dedicados al estudio del derecho mercantil, derecho
internacional de inversiones y otras disciplinas vinculadas;

j) Colaborar con el Poder Ejecutivo proponiéndole la regulación
de los organismos de derecho privado auxiliares de la
Administración Pública, cuando los mismos no se encuentren
regulados por ley; y,

k) Las demás que le fueren asignadas por esta ley o por su
reglamento.

El Consejo Nacional de Inversiones estará facultado cuando lo
estime necesario y dentro de los límites de su presupuesto para
contratar total o parcialmente los servicios que requiera para
evaluar y optimizar la calidad en el desempeño de sus funciones,
así como estudios relacionados con el clima de negocios en
Honduras.”

“ARTÍCULO 45.- Para la realización de sus actividades,
prestación de sus servicios y su sana administración, el Consejo
Nacional de Inversiones contará con el apoyo de una Secretaría
Ejecutiva cuyo titular será nombrado por el Presidente de la
República. Su nombramiento tendrá carácter de permanente
pudiendo ser removido por el Presidente de la República
únicamente por causa justificada.

La Secretaría Ejecutiva del Consejo Nacional de Inversiones
contará con el personal necesario para poder desempeñar sus

funciones. Las funciones de la Secretaría Ejecutiva serán las que
se establezcan en el reglamento de la presente Ley.”

“ARTÍCULO 46.- A fin de procurar la permanencia y
ampliación de las inversiones ya existentes, el Consejo Nacional
de Inversiones deberá también prestar los servicios que requieran
los inversionistas para la facilitación del desarrollo y ampliación
de las mismas, para lo cual deberá mantener una base de datos
de inversiones y mantenerse en contacto permanente con los
directores de empresas y entes gubernamentales involucrados, a
fin de detectar potenciales problemas que surgieren después del
establecimiento de la inversión y facilitar su solución de la manera
más eficiente posible.

En tal sentido se autoriza a la Secretaría Ejecutiva a crear una
unidad especializada o contratar los servicios de una entidad ya
existente para la prestación de servicios de post-inversión,
pudiendo establecer cobros por estos servicios.”

“ARTÍCULO 50.- Se autoriza al Consejo Nacional de
Inversiones a realizar un cobro equivalente al 0.25% de la
facturación anual por ventas o servicios realizados a aquellos
inversionistas que suscriban contratos de estabilidad con el Estado
en concepto de tasa por gestión y mantenimiento de los mismos
durante la vigencia del contrato.”','26','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":26,"article_sha256":"c88535cdb0bd582e4e3f7f0b3543f5d04388ea4f1e7740d5a904f3495c558b66","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','26','5dd5c0d5bcdcf53fa9339307094970b74d06a3ae8c92a52654e3a7091b864151','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:27','mayalex_normativos','10_LEYES_REGLAMENTOS','- Reformar los Artículos 29 y 34 de la Ley
de Promoción de la Alianza Público-Privada contenida en el
Decreto Legislativo No. 143-2010 y sus reformas, los cuales se
leerán así:

“ARTÍCULO 29.- Se autoriza a la Comisión para la
Promoción de la Alianza Público-Privada (COALIANZA) a
realizar un cobro de hasta el dos por ciento (2%) del valor de

cada proyecto autorizado al adjudicatario del mismo, en concepto
de tasa por los servicios que presta.

También se autoriza a la Superintendencia de Alianza Público-Privada, para percibir de las empresas privadas que suscriban
contratos de participación público-privada, un aporte por
regulación, a ser fijado mediante el correspondiente contrato de
hasta el uno por ciento (1%) del valor de la facturación anual,
hechas las deducciones correspondientes al pago de Impuesto
Sobre Ventas.

Los fondos obtenidos por dichos cobros, pasarán a ser
administrados mediante un Fideicomiso creado para cada
institución de los cuales la Comisión para la Promoción de la
Alianza Público-Privada (COALIANZA) y la Superintendencia
de Alianzas Público-Privada, serán los únicos beneficiarios
respectivamente. El producto de dichos fideicomisos servirá para
que cada institución cubra la totalidad o una parte de su
presupuesto. Las disposiciones para la conformación de estos
fideicomisos serán desarrolladas en el Reglamento de la presente
Ley.

Si de los recursos del fideicomiso de COALIANZA hubiere
fondos remanentes al final del Ejercicio Fiscal, los mismos se
reservarán para ser utilizados en la investigación y desarrollo de
nuevos proyectos, el rescate de proyectos en los que no se
hubiesen logrado resultados programados y el pago de gastos de
defensa del Estado.”

“ARTÍCULO 34.- Para ejercer los derechos y obligaciones
que se originan de las relaciones jurídicas reguladas por la presente
Ley, se requiere únicamente de la autorización para prestar un
servicio o desarrollar una infraestructura otorgado por la Comisión

para la Promoción de la Alianza Público-Privada
(COALIANZA).

La Comisión para la Promoción de la Alianza Público-Privada
(COALIANZA) deberá asistir al adjudicatario de un proyecto
en la tramitación y obtención de todos los permisos, licencias,
autorizaciones y demás actos administrativos requeridos por la
Administración Pública Central y/o Municipal, para operar la
Alianza Público - Privada (APP).”','27','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":27,"article_sha256":"cb5c2e8e99540e26c2a4d022dbcd83411a1ff3f0e8174384a0f481047ff26197","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','27','967fce842ffebd36aac9635d4868e73d7146e4260518f2fe7bc928d3bab40bfb','PILOTO_D284_2013_01',now()),
('PILOTO_D284_2013_01:DECRETO_284_2013:31','mayalex_normativos','10_LEYES_REGLAMENTOS','- Son aplicables a la Ley de Promoción de
la Alianza Público Privada contenida en el Decreto Legislativo
No. 143-2010 y sus reformas los Artículos 3-A, 3-B, 6 y 111 de
la Ley de Contratación del Estado contenida en el Decreto
Legislativo Número 74-2001 de fecha 29 de junio del 2001 y en
sus decretos de reforma.

TÍTULO IV
DISPOSICIONES COMPLEMENTARIAS Y
TRANSITORIAS','31','Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)','{"bytes_sha256":"a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4","text_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","paquete":"PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1","estado_fuente":"CLO_PENDING","procedencia":"Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada","decreto":"284-2013","texto_origen":"TRANSCRIPCION_COTEJADA","transcripcion_sha256":"ba75b190d7e04e0e85851ee204d6d2deafba80f5e1a03e5e592f7968003436ca","cotejado_por":"Abg. y Not. Fredy Omar Pinel Flores — CLO / Director Maya Lex — 2026-11-15","ocr_text_sha256":"7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d","norm_id":"HN:DECRETO_284_2013","instrumento_id":"DECRETO_284_2013","ingest_batch":"PILOTO_D284_2013_01","ordinal":31,"article_sha256":"4ad0dc3bd2d4832f66aa98823c2a18295877ccb6c464ad49ff7f28e7485c729e","vigencia":"UNKNOWN","revision_pendiente":true,"marcas":[]}'::jsonb,array_fill(0::real, ARRAY[384])::vector,'HN','ley',NULL,true,'DECRETO_284_2013','31','956beb9944f4914853d25793ffbf8c8ed132ac50898803132fb1b3f8beced057','PILOTO_D284_2013_01',now())
ON CONFLICT (id) DO NOTHING;
DO $verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM (VALUES
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:4','4edb3aef9eb765c50af6d4c503665f330673c8f2498a6c7ae46202a65214336c'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:17','c4a2797f1a8db0541bdbcfcd12522e699930661d44fb3c90bbcd66f2dccce630'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:29','47f182ac112ddb84b88a355cf0a0ac30734f222806715b54c2daa02147af190b'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:32','76dc49228bd69939b3f8feae7a1276a012341f64363938705f1f241831edb324'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:40','f22e6d99deea9a5a57754026f4a8f4d3da38bf4f5078a89f369e2860959363c8'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:43','2461ea3140350b4e1791338fd08ef749c99532366301e91dbbff63e1e5c8d4cb'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:44','f38dedc2b170d29c25965168fea98aed5bd69cf04a57bd7212469120d7b97964'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:47','900767533e348d99de2d62f5c408be34f4d5f9f17da0ecf3a35d2169bb7e29b0'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:57','618b52ba09a4d6ee622901c1198c4260134c280ed4809bb531eb8c89b2e3c5a5'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:59','668be01003648f675abef30fd731c006cab46fd55fbd0cff5d5a6d480c5b58ed'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:67','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:75','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:84','bb1393f4011eede5996423c24c1acd008720d0fb5b764bf5294a1a7b4b64b9dc'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:87','6857ad1d168fa6006c7f58c2e141305e51bfc1628d5a79cea487c5eac3bee4b9'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:89','e3322b406ba7c3f3782410ca3730de1a8606f7921830c5a15a44dfe1058956b8'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:93','429d2bed02485d789e093cf0aaa4583cbe00e42ed672779904ef59d9bedb8783'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:103','c9740cf466409ddec69825189727f597387d341bd64d2846eb1fbb41f1393f3f'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:112','423390508f0336a05cf2c4913bff0f76d3db277165943963367c330243e78ec3'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:122','756a543da8bee3734c3cdfc64ad05cddabe92ff88ee7412e064ea75a6fd39c6f'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:138','1d3f084774219ea71b3bf6b9ca6362f86e82e0e9abf5af450af32125e9bcb6d5'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:144','19c901fb28398347b1d4d03ffab6002a88bbe4019b22e5d393b28c4b376d94f4'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:149','7f875a84c1b3b797ee633b11784ff2c8c6dc7622c754f51be27360dc50b6045b'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:157','dc63c6729d6cf9726229dc0e2f06ff61398f1f1aaa817c47cd53202c8944b9be'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:160','a609eacb4c96d56a0a167246608e22e8ececc4c5a597839293ceb3862953af37'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:162','bc8ed385062aa5ef3ac691b9fdb77005de7b30614c0ceaa41748402973c9c7a0'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:163','70807ce7692905d7e47bb09477f6a6046a74fb7e4341c6fd2642ce648dbf5e2c'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:170','41aca8e8f4023d8844642c3da7b7623d352b51bafe506246c7ac29c141fdfa1d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:177','604da236284446ece02495b0096f122ef1f6780ac10308aa8cdff82107eb96bf'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:179','34c2bb2c3b64c5f867504d747dca7c6d5a256ebf45fe5ef7bfb20a22588e53d5'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:186','db8f61aaa5b1f233528a4aac9a5732a8edcaf193e6753ee3f21397398c9f0bfb'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:191','c7ebfd200ef5b4be414ae663dd749cd3dadb4bc601ce30be9266376d5eea311f'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:199','d5780ad1cc74db918f4ddd42ec471a1b835c40d23873f8b4eeac4b64ed02800d'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:220','24343052fb45a6b4eac5ac17524c21fc19d3e4b7bfabcb1f7c65c024d47e8e9a'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:226','137f17369551f72b6b95b64d3d49bfb37061b7cb0f3cd3fbf8cd3d9912b4b9e4'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:229','b50a3a5ee8f2c91033012d83b9edc69f1e458fc631ccf23fd0003376774b07f2'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:231','2ac7faf9de664e4018ec66e51cb954dbd0cf2ad0c358fd1cc98eef7038bb6e4f'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:241','8bf097625946eb22b7e3f25f6eca9cb23a4a261a7bc366f0c6d542b4cb6423ce'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:255','fd37021a356f328b839d65e16ad3bfd0bde9e572240d105b065d07cf165e0132'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:258','88258a40fd9e28fec74fc5408b2dc05af60d2cdc1afae60149e94d92e3dc9dfb'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:268','a73138aec9a724e3d1ebb73eb5817b392415ca3a965049abfd4623b42d4c592f'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:269','a11ea12bd703248a0bfd7548c5e1e0f91174e26dc949f64cb439b1873a982dad'),
    ('A03_CODIGO_NINEZ_01:CODIGO_NINEZ:282','0272ed31a27e386b9ff310d696e668bc96650e7e3c44d488c602a1666b5ef2b9'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:2','bcf5e2c99b7114b0a7df7950b76fc8daf049ea60583772ee6f3713aa13e1d65e'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:15','fe32758358227008a23c918fc8914b9d1462f0cbb306ae8fa840da45d547b2d4'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:17','d96720100dd0994f160d5abeaff0c2b56dcfe90a1dd68f0568c6e8ed22b9e553'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:19','dd0aad2bdf5d2420e422aa288ee807d184db7b00cd021aa4cd4318ded6ea3adb'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:20','bd25656eb0147feecf49c0fe512f4b3c79b139de19dd3564d2eea613b8ca92b6'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:26','5dd5c0d5bcdcf53fa9339307094970b74d06a3ae8c92a52654e3a7091b864151'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:27','967fce842ffebd36aac9635d4868e73d7146e4260518f2fe7bc928d3bab40bfb'),
    ('PILOTO_D284_2013_01:DECRETO_284_2013:31','956beb9944f4914853d25793ffbf8c8ed132ac50898803132fb1b3f8beced057')
 ) AS e(id,hash_contenido) JOIN public.biblioteca_vectores b ON b.id=e.id
 WHERE b.hash_contenido=e.hash_contenido AND b.ingest_batch=split_part(e.id,':',1)
   AND b.instrumento_id=split_part(e.id,':',2) AND b.metadata->>'norm_id'=CASE split_part(e.id,':',1) WHEN 'A03_CODIGO_NINEZ_01' THEN 'HN:CODIGO_NINEZ' WHEN 'A04_D35_2013_01' THEN 'HN:DECRETO_35_2013' WHEN 'PILOTO_D284_2013_01' THEN 'HN:DECRETO_284_2013' END
   AND b.revision_pendiente=true AND b.es_norma_vigente IS NULL AND b.embedding=array_fill(0::real, ARRAY[384])::vector
   AND encode(sha256(convert_to(b.contenido,'UTF8')),'hex')=e.hash_contenido;
 IF n<>50 THEN RAISE EXCEPTION '01_datos_06: % de 50 filas no coinciden con contenido, hash o estado oculto',n; END IF;
END
$verify$;
COMMIT;
