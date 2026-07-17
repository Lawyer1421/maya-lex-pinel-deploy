import { describe, it, expect } from 'vitest';
import { decideBackfillAction } from '@/scripts/identity-backfill';

describe('decideBackfillAction', () => {
  it('match único, sin user_id previo → apply', () => {
    const d = decideBackfillAction({ userIdentifier: 'email:x@y.com', currentUserId: null, matchingAuthUserIds: ['uuid-1'] });
    expect(d).toEqual({ action: 'apply', userId: 'uuid-1' });
  });

  it('sin match (0 candidatos) → skip_no_match', () => {
    const d = decideBackfillAction({ userIdentifier: 'email:x@y.com', currentUserId: null, matchingAuthUserIds: [] });
    expect(d.action).toBe('skip_no_match');
  });

  it('user_identifier sin formato email: → skip_no_match', () => {
    const d = decideBackfillAction({ userIdentifier: 'paypal:PAYER1', currentUserId: null, matchingAuthUserIds: ['uuid-1'] });
    expect(d.action).toBe('skip_no_match');
  });

  it('ambiguo (2+ candidatos) → skip_ambiguous, nunca se resuelve solo', () => {
    const d = decideBackfillAction({ userIdentifier: 'email:x@y.com', currentUserId: null, matchingAuthUserIds: ['uuid-1', 'uuid-2'] });
    expect(d).toEqual({ action: 'skip_ambiguous', candidateCount: 2 });
  });

  it('user_id ya establecido y coincide → already_correct (idempotente)', () => {
    const d = decideBackfillAction({ userIdentifier: 'email:x@y.com', currentUserId: 'uuid-1', matchingAuthUserIds: ['uuid-1'] });
    expect(d).toEqual({ action: 'already_correct', userId: 'uuid-1' });
  });

  it('user_id ya establecido y DIFIERE del calculado → skip_conflict, nunca se sobrescribe', () => {
    const d = decideBackfillAction({ userIdentifier: 'email:x@y.com', currentUserId: 'uuid-OLD', matchingAuthUserIds: ['uuid-NEW'] });
    expect(d).toEqual({ action: 'skip_conflict', existingUserId: 'uuid-OLD', computedUserId: 'uuid-NEW' });
  });
});
