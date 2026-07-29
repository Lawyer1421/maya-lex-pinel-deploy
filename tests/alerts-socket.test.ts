import { describe, expect, it } from 'vitest';
import { AlertSchema, mergeAlerts } from '../src/hooks/useAlertsSocket';

describe('AlertSchema and alert merging', () => {
  it('parses supported alert payloads', () => {
    const parsed = AlertSchema.safeParse({
      id: 'alert-1',
      kind: 'warning',
      message: 'Revisión en progreso',
      timestamp: '2026-07-20T00:00:00.000Z',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.kind).toBe('warning');
    }
  });

  it('dedupes by id and keeps the latest alerts capped at 200', () => {
    const initial = Array.from({ length: 201 }, (_, index) => ({
      id: `a-${index}`,
      kind: 'info' as const,
      message: `alert-${index}`,
      timestamp: new Date().toISOString(),
    }));

    const next = [{
      id: 'a-200',
      kind: 'critical' as const,
      message: 'nuevo',
      timestamp: new Date().toISOString(),
    }];

    const merged = mergeAlerts(initial, next, 200);
    expect(merged).toHaveLength(200);
    expect(merged[0].id).toBe('a-200');
  });
});
