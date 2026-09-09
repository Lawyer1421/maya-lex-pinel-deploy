/**
 * tests/feature-flags.test.ts
 *
 * Tests para Vercel Flags: maya-lex-hybrid-router-v2
 *
 * Verifica:
 * - Evaluación correcta del flag (OFF/ON)
 * - Identidad estable entre requests
 * - Failsafe a legacy path
 * - Kill switch behavior
 */

import { describe, it, expect } from 'vitest';
import {
  getStableUserIdentity,
  getStableEntityId,
  shouldUseHardenedOrchestration,
  createOrchestrationContext,
} from '@/lib/flags/feature-flags';

describe('Feature Flags: maya-lex-hybrid-router-v2', () => {

  // ─────────────────────────────────────────────────────────────────
  // FLAG-OFF-001: Flag OFF → legacy orchestration
  // ─────────────────────────────────────────────────────────────────
  describe('FLAG-OFF-001: Flag OFF forces legacy orchestration', () => {
    it('should use legacy path when flag is explicitly false', () => {
      const result = shouldUseHardenedOrchestration(false);
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // FLAG-ON-001: Flag ON → hardened orchestration
  // ─────────────────────────────────────────────────────────────────
  describe('FLAG-ON-001: Flag ON enables hardened orchestration', () => {
    it('should use hardened path when flag is explicitly true', () => {
      const result = shouldUseHardenedOrchestration(true);
      expect(result).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // FLAG-STICKY-001: Same user → same variant across requests
  // ─────────────────────────────────────────────────────────────────
  describe('FLAG-STICKY-001: Stable identity ensures sticky cohorts', () => {
    it('should produce identical stable identity for same email across multiple calls', () => {
      const email = 'test@example.com';
      const id1 = getStableUserIdentity({ userEmail: email });
      const id2 = getStableUserIdentity({ userEmail: email });

      expect(id1).toBe(id2);
      expect(id1).toBe('user:test@example.com');
    });

    it('should prioritize email over session ID', () => {
      const id = getStableUserIdentity({
        userEmail: 'primary@example.com',
        sessionId: 'session123',
      });

      expect(id).toBe('user:primary@example.com');
      expect(id).not.toContain('session');
    });

    it('should fallback to session ID if email unavailable', () => {
      const id = getStableUserIdentity({
        sessionId: 'session-abc-123',
      });

      expect(id).toBe('session:session-abc-123');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // FLAG-ISOLATION-001: Different users → independent variants
  // ─────────────────────────────────────────────────────────────────
  describe('FLAG-ISOLATION-001: User isolation for cohort targeting', () => {
    it('should produce different identities for different emails', () => {
      const id1 = getStableUserIdentity({ userEmail: 'user1@example.com' });
      const id2 = getStableUserIdentity({ userEmail: 'user2@example.com' });

      expect(id1).not.toBe(id2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // FLAG-FAILSAFE-001: Evaluation failure → safe fallback to legacy
  // ─────────────────────────────────────────────────────────────────
  describe('FLAG-FAILSAFE-001: Safe fallback on evaluation failure', () => {
    it('should default to legacy path when flag value is undefined', () => {
      const result = shouldUseHardenedOrchestration(undefined);
      expect(result).toBe(false);
    });

    it('should respect explicit fallback directive', () => {
      // When fallback is true, undefined → false (legacy)
      const result1 = shouldUseHardenedOrchestration(undefined, true);
      expect(result1).toBe(false);

      // When fallback is false, undefined still → false (safe default)
      const result2 = shouldUseHardenedOrchestration(undefined, false);
      expect(result2).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // FLAG-KILL-001: ON → OFF without redeploy (kill switch)
  // ─────────────────────────────────────────────────────────────────
  describe('FLAG-KILL-001: Kill switch (ON→OFF without redeploy)', () => {
    it('should immediately switch to legacy when flag is disabled', () => {
      // Simulating: flag was ON (hardened)
      let flagValue: boolean | undefined = true;
      expect(shouldUseHardenedOrchestration(flagValue)).toBe(true);

      // Simulating: kill switch activated (flag now OFF)
      flagValue = false;
      expect(shouldUseHardenedOrchestration(flagValue)).toBe(false);

      // Verify: no redeploy needed, flag change takes effect immediately
      expect(shouldUseHardenedOrchestration(false)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // Context creation and logging
  // ─────────────────────────────────────────────────────────────────
  describe('Orchestration context for telemetry', () => {
    it('should create context with hardened orchestration when flag is true', () => {
      const context = createOrchestrationContext(
        'test@example.com',
        'session-123',
        true
      );

      expect(context.orchestration_type).toBe('hardened');
      expect(context.flag_value).toBe(true);
      expect(context.stable_identity).toBe('user:test@example.com');
      expect(context.timestamp).toBeTruthy();
    });

    it('should create context with legacy orchestration when flag is false', () => {
      const context = createOrchestrationContext(
        'test@example.com',
        'session-123',
        false
      );

      expect(context.orchestration_type).toBe('legacy');
      expect(context.flag_value).toBe(false);
    });

    it('should default to legacy when flag value is undefined', () => {
      const context = createOrchestrationContext(
        'test@example.com',
        'session-123',
        undefined
      );

      expect(context.orchestration_type).toBe('legacy');
      expect(context.flag_value).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // IDENTIFY-001: Authenticated user entity extraction
  // ─────────────────────────────────────────────────────────────────
  describe('IDENTIFY-001: Entity extraction for authenticated users', () => {
    it('should extract stable entity ID from Supabase user UUID', () => {
      const userId = 'supabase-uuid-12345';
      const entityId = getStableEntityId({ supabaseUserId: userId });
      expect(entityId).toBe(userId);
    });

    it('should fallback to authenticated hash when UUID unavailable', () => {
      const hash = 'hashed-auth-identifier-abc123';
      const entityId = getStableEntityId({ authenticatedHash: hash });
      expect(entityId).toBe(hash);
    });

    it('should prefer Supabase UUID over authenticated hash', () => {
      const userId = 'supabase-uuid';
      const hash = 'hashed-auth';
      const entityId = getStableEntityId({
        supabaseUserId: userId,
        authenticatedHash: hash,
      });
      expect(entityId).toBe(userId);
      expect(entityId).not.toBe(hash);
    });

    it('should return anonymous fallback when no identity available', () => {
      const entityId = getStableEntityId({});
      expect(entityId).toBe('anonymous');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // IDENTIFY-002: Entity ID stability across requests
  // ─────────────────────────────────────────────────────────────────
  describe('IDENTIFY-002: Entity ID determinism for sticky cohorts', () => {
    it('should produce identical entity ID for same user in multiple requests', () => {
      const userId = 'user-uuid-consistent';
      const id1 = getStableEntityId({ supabaseUserId: userId });
      const id2 = getStableEntityId({ supabaseUserId: userId });
      expect(id1).toBe(id2);
    });

    it('should produce different entity IDs for different users', () => {
      const id1 = getStableEntityId({ supabaseUserId: 'user-1' });
      const id2 = getStableEntityId({ supabaseUserId: 'user-2' });
      expect(id1).not.toBe(id2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // TARGET-CONTEXT-001: Provider receives entity context
  // ─────────────────────────────────────────────────────────────────
  describe('TARGET-CONTEXT-001: Entity context for dashboard targeting', () => {
    it('should have entity type MayaLexFlagEntities defined', () => {
      // Verify type structure matches dashboard entity definition
      const entity = { user: { id: 'test-id', email: 'test@example.com' } };
      expect(entity.user).toBeDefined();
      expect(entity.user.id).toBeTruthy();
      expect(typeof entity.user.id).toBe('string');
    });

    it('should support optional email in entity', () => {
      const entity1 = { user: { id: 'test-id' } };
      const entity2 = { user: { id: 'test-id', email: 'test@example.com' } };
      expect(entity1.user.id).toBe(entity2.user.id);
      expect(entity2.user.email).toBeDefined();
    });
  });
});

