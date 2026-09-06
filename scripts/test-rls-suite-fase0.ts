/**
 * Trazabilidad de los tests de RLS de la Suite de Productividad Fase 0
 * (supabase/migrations/20260905000000_suite_productividad_fase0.sql),
 * corridos contra aicakncgtuiiuomflkqj (mayalexhn-staging) el 2026-09-05.
 *
 * Este archivo NO se ejecutó como script -- se agrega por trazabilidad,
 * mismo patrón que scripts/insertar-cpp.ts / insertar-d102-2018.ts para
 * ingestas anteriores. La ejecución REAL de estos tests ocurrió como SQL
 * directo por el canal MCP de Supabase ya autenticado, usando el truco
 * estándar de Postgres/Supabase para probar políticas RLS sin necesitar
 * una sesión HTTP real ni ninguna credencial nueva:
 *
 *   SET LOCAL ROLE authenticated;
 *   SET LOCAL "request.jwt.claims" = '{"sub":"<uuid-usuario>","role":"authenticated"}';
 *
 * Dentro de una transacción (BEGIN...COMMIT), esto hace que auth.uid()
 * resuelva exactamente igual que si esa fila viniera de una sesión HTTP
 * real firmada por Supabase Auth -- las políticas de RLS se evalúan de
 * forma idéntica. Se prefirió este método sobre @supabase/supabase-js con
 * sesiones reales porque:
 *   1. No requiere el service_role key de staging (que este script nunca
 *      necesitó pedir ni manejar -- cero secretos nuevos).
 *   2. El canal MCP de Supabase ya autenticado, usado toda la sesión para
 *      SQL de solo lectura y DDL, ya tenía el privilegio necesario.
 *   3. Es la técnica que la propia documentación de Supabase recomienda
 *      para probar políticas RLS de forma aislada y determinista.
 *
 * Si en el futuro se necesita un test de integración real end-to-end
 * (con @supabase/supabase-js, sesiones HTTP reales, y sin acceso directo
 * a SQL), la función `casosDePrueba()` de abajo documenta exactamente qué
 * verificar -- solo falta reemplazar `ejecutarComoUsuario` por llamadas
 * reales al SDK cliente con un JWT de cada usuario de prueba.
 *
 * RESULTADO REAL (2026-09-05, aicakncgtuiiuomflkqj):
 *   - 2 usuarios sintéticos creados directo en auth.users (id fijo, sin
 *     contraseña real -- nunca destinados a iniciar sesión de verdad):
 *     rls-test-a@mayalexhn-staging.local, rls-test-b@mayalexhn-staging.local
 *   - Usuario A insertó una fila en cada una de las 6 tablas.
 *   - Usuario B: 0 filas visibles en las 6 tablas (SELECT), 0 filas
 *     afectadas al intentar UPDATE/DELETE sobre las de A, y las políticas
 *     EXISTS (conversation_messages vía conversation_sessions,
 *     expediente_embeddings vía expedientes) rechazaron su intento de
 *     INSERT una fila hija bajo un padre de A ("new row violates row-level
 *     security policy").
 *   - Usuario A: confirmó ver/leer sus propias 6 filas (control positivo),
 *     y pudo borrarlas todas (control positivo de DELETE).
 *   - Limpieza: 0 filas en las 6 tablas, 0 usuarios de prueba restantes en
 *     staging -- verificado con un COUNT final.
 *   - Hallazgo real corregido en la migración: faltaban los GRANT
 *     SELECT/INSERT/UPDATE/DELETE a `authenticated` -- RLS filtra filas,
 *     no reemplaza los privilegios de tabla. Sin el GRANT, la primera
 *     prueba falló con "permission denied for table expedientes" antes de
 *     que la política de RLS llegara a evaluarse. Corregido en el archivo
 *     de migración y en staging antes de repetir la prueba.
 */

export interface CasoPruebaRLS {
  tabla: string;
  descripcion: string;
  /** Cómo se identifica el dueño de la fila: directo (user_id propio) o
   * indirecto (vía FK a otra tabla con RLS ya probado). */
  ownership: 'directo' | 'indirecto';
}

export const CASOS_DE_PRUEBA: CasoPruebaRLS[] = [
  { tabla: 'expedientes', descripcion: 'user_id propio', ownership: 'directo' },
  { tabla: 'study_artifacts', descripcion: 'user_id propio', ownership: 'directo' },
  { tabla: 'conversation_sessions', descripcion: 'user_id propio', ownership: 'directo' },
  { tabla: 'user_preferences', descripcion: 'user_id propio (PK)', ownership: 'directo' },
  { tabla: 'conversation_messages', descripcion: 'vía conversation_sessions.user_id (EXISTS)', ownership: 'indirecto' },
  { tabla: 'expediente_embeddings', descripcion: 'vía expedientes.user_id (EXISTS)', ownership: 'indirecto' },
];

/**
 * Documenta la secuencia de verificación aplicada a CADA tabla de
 * CASOS_DE_PRUEBA, tal como se ejecutó vía SQL directo (ver cabecera).
 * No ejecuta nada -- es la referencia legible de la metodología para quien
 * quiera reproducirla o convertirla en un test de integración real.
 */
export function pasosDeVerificacion(caso: CasoPruebaRLS): string[] {
  return [
    `A inserta una fila propia en ${caso.tabla} (${caso.descripcion}) -- debe tener éxito.`,
    `B intenta SELECT sobre esa fila -- debe devolver 0 filas.`,
    `A hace SELECT sobre su propia fila -- debe devolver 1 fila (control positivo).`,
    `B intenta UPDATE sobre la fila de A -- debe afectar 0 filas.`,
    caso.ownership === 'indirecto'
      ? `B intenta INSERT una fila hija bajo el padre de A -- debe fallar con "new row violates row-level security policy" (WITH CHECK).`
      : `B intenta DELETE sobre la fila de A -- debe afectar 0 filas.`,
    `A borra su propia fila -- debe afectar 1 fila (control positivo de DELETE).`,
  ];
}
