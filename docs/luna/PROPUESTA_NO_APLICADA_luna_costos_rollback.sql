-- PROPUESTA_NO_APLICADA — reversión del contador global de costos de Luna. NO es una migración; no se ejecutó.
-- Orden: primero apagar Luna (flag_luna_responses enabled=false), luego revertir. Sin el contador, Luna falla cerrada (no responde) fuera del canary local.
drop function if exists public.luna_reservar_costo(date, text, bigint, bigint);
drop function if exists public.luna_liquidar_costo(date, text, bigint);
drop table if exists public.luna_costos_diarios;
-- Efecto: solo se pierden las cifras agregadas de costo por día y plan. No hay datos de clientes, pagos ni suscripciones en esta tabla.
