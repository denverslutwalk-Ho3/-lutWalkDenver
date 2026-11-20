import { describe, expect, it } from 'vitest';

import {
  DEFAULT_AGENT,
  DEFAULT_AGENT_ID,
  MAX_AGENT_DESCRIPTION_LENGTH,
  MAX_AGENT_NAME_LENGTH,
  MAX_AGENT_PROMPT_LENGTH,
  isValidAgentId,
  sanitizeAgentInput,
} from './ai-agents';
import { AGENT_GUARDRAILS, buildAgentSystemPrompt } from './ai-chat';

describe('sanitizeAgentInput', () => {
  it('accepts and trims valid agent fields', () => {
    const result = sanitizeAgentInput({
      name: '  Organizing coach  ',
      description: '  For new organizers.  ',
      systemPrompt: '  Help people plan their first event.  ',
    });

    expect(result).toEqual({
      ok: true,
      agent: {
        name: 'Organizing coach',
        description: 'For new organizers.',
        systemPrompt: 'Help people plan their first event.',
      },
    });
  });

  it('rejects non-object input', () => {
    expect(sanitizeAgentInput(null).ok).toBe(false);
    expect(sanitizeAgentInput('agent').ok).toBe(false);
    expect(sanitizeAgentInput([]).ok).toBe(false);
    expect(sanitizeAgentInput(undefined).ok).toBe(false);
  });

  it('requires a name, description, and system prompt', () => {
    const base = { name: 'Helper', description: 'For members', systemPrompt: 'Be kind.' };

    expect(sanitizeAgentInput({ ...base, name: '   ' }).ok).toBe(false);
    expect(sanitizeAgentInput({ ...base, name: undefined }).ok).toBe(false);
    expect(sanitizeAgentInput({ ...base, description: '' }).ok).toBe(false);
    expect(sanitizeAgentInput({ ...base, systemPrompt: '\n\t ' }).ok).toBe(false);
  });

  it('enforces the server-side length limits', () => {
    const base = { name: 'Helper', description: 'For members', systemPrompt: 'Be kind.' };

    expect(sanitizeAgentInput({ ...base, name: 'a'.repeat(MAX_AGENT_NAME_LENGTH + 1) }).ok).toBe(false);
    expect(
      sanitizeAgentInput({ ...base, description: 'a'.repeat(MAX_AGENT_DESCRIPTION_LENGTH + 1) }).ok,
    ).toBe(false);
    expect(
      sanitizeAgentInput({ ...base, systemPrompt: 'a'.repeat(MAX_AGENT_PROMPT_LENGTH + 1) }).ok,
    ).toBe(false);

    expect(sanitizeAgentInput({ ...base, name: 'a'.repeat(MAX_AGENT_NAME_LENGTH) }).ok).toBe(true);
    expect(
      sanitizeAgentInput({ ...base, systemPrompt: 'a'.repeat(MAX_AGENT_PROMPT_LENGTH) }).ok,
    ).toBe(true);
  });

  it('rejects unsupported control characters', () => {
    const base = { name: 'Helper', description: 'For members', systemPrompt: 'Be kind.' };
    expect(sanitizeAgentInput({ ...base, name: 'Bad\u0000name' }).ok).toBe(false);
    expect(sanitizeAgentInput({ ...base, systemPrompt: 'Line one\nLine two' }).ok).toBe(true);
  });
});

describe('isValidAgentId', () => {
  it('accepts simple Firestore document ids and rejects path-like values', () => {
    expect(isValidAgentId('abc123')).toBe(true);
    expect(isValidAgentId('agent_1-2')).toBe(true);
    expect(isValidAgentId('')).toBe(false);
    expect(isValidAgentId('agents/nested')).toBe(false);
    expect(isValidAgentId('../default')).toBe(false);
    expect(isValidAgentId(undefined)).toBe(false);
  });
});

describe('agent guardrails', () => {
  it('defaults new agents to the full trauma-informed guardrail text', () => {
    expect(DEFAULT_AGENT.systemPrompt).toBe(AGENT_GUARDRAILS);
    expect(DEFAULT_AGENT.id).toBe(DEFAULT_AGENT_ID);
  });

  it('covers dignity, autonomy, human rights, and individual experience', () => {
    expect(AGENT_GUARDRAILS).toMatch(/dignity/i);
    expect(AGENT_GUARDRAILS).toMatch(/autonomy/i);
    expect(AGENT_GUARDRAILS).toMatch(/human rights/i);
    expect(AGENT_GUARDRAILS).toMatch(/individual experience/i);
    expect(AGENT_GUARDRAILS).toMatch(/generalize/i);
  });

  it('covers the no-diagnosis, not-a-therapist, and crisis limits', () => {
    expect(AGENT_GUARDRAILS).toMatch(/never diagnose/i);
    expect(AGENT_GUARDRAILS).toMatch(/not a therapist/i);
    expect(AGENT_GUARDRAILS).toContain('988');
  });

  it('prepends the guardrails to a custom prompt', () => {
    const prompt = buildAgentSystemPrompt('Focus on event planning.');
    expect(prompt.startsWith(AGENT_GUARDRAILS)).toBe(true);
    expect(prompt).toContain('Focus on event planning.');
  });

  it('does not duplicate the default prompt', () => {
    expect(buildAgentSystemPrompt(AGENT_GUARDRAILS)).toBe(AGENT_GUARDRAILS);
    expect(buildAgentSystemPrompt('   ')).toBe(AGENT_GUARDRAILS);
  });
});
