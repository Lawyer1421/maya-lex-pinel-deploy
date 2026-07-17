import { describe, it, expect } from 'vitest';
import { extractDisplayName } from '@/scripts/profiles-backfill';

describe('extractDisplayName — nunca inventa un nombre', () => {
  it('usa full_name cuando existe', () => {
    expect(extractDisplayName({ full_name: 'Ana López' })).toBe('Ana López');
  });

  it('usa name cuando full_name no existe', () => {
    expect(extractDisplayName({ name: 'Carlos' })).toBe('Carlos');
  });

  it('sin metadata → null (nunca inventa)', () => {
    expect(extractDisplayName(null)).toBeNull();
  });

  it('metadata vacía → null', () => {
    expect(extractDisplayName({})).toBeNull();
  });

  it('full_name vacío o solo espacios → null', () => {
    expect(extractDisplayName({ full_name: '   ' })).toBeNull();
  });

  it('full_name no-string (dato corrupto) → null, no truena', () => {
    expect(extractDisplayName({ full_name: 12345 })).toBeNull();
  });
});
