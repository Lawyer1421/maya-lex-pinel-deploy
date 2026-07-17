import { describe, it, expect } from 'vitest';
import { classifyIdentityLinkOutcome } from '@/lib/identity-linking';

const NOW = new Date('2026-07-18T12:00:00.000Z').getTime();

describe('classifyIdentityLinkOutcome', () => {
  // Escenario A: Google usuario nuevo — created_at muy reciente
  it('cuenta creada hace segundos → new_account_created', () => {
    const result = classifyIdentityLinkOutcome({
      userCreatedAt: new Date(NOW - 2000).toISOString(),
      emailVerified: true,
      now: NOW,
    });
    expect(result).toBe('new_account_created');
  });

  // Escenario B: cuenta existente, correo verificado — Supabase ya la
  // vinculó (o la propia app debe pedir reautenticación según su config)
  it('cuenta existente (creada hace días) con correo verificado → linked_after_reauth', () => {
    const result = classifyIdentityLinkOutcome({
      userCreatedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 5).toISOString(),
      emailVerified: true,
      now: NOW,
    });
    expect(result).toBe('linked_after_reauth');
  });

  // Escenario C: cuenta existente sin correo verificado — nunca se
  // vincula solo por eso
  it('cuenta existente sin correo verificado → blocked_unverified_email', () => {
    const result = classifyIdentityLinkOutcome({
      userCreatedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 5).toISOString(),
      emailVerified: false,
      now: NOW,
    });
    expect(result).toBe('blocked_unverified_email');
  });

  it('límite exacto de la ventana de "cuenta nueva" (15s)', () => {
    const justInside = classifyIdentityLinkOutcome({
      userCreatedAt: new Date(NOW - 14999).toISOString(), emailVerified: true, now: NOW,
    });
    const justOutside = classifyIdentityLinkOutcome({
      userCreatedAt: new Date(NOW - 15001).toISOString(), emailVerified: true, now: NOW,
    });
    expect(justInside).toBe('new_account_created');
    expect(justOutside).toBe('linked_after_reauth');
  });
});
