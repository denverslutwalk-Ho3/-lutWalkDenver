import { describe, expect, it } from 'vitest';

import {
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_LENGTH,
  SYSTEM_PROMPT,
  sanitizeChatHistory,
} from './ai-chat';

describe('sanitizeChatHistory', () => {
  it('accepts a valid conversation ending with a user message', () => {
    const result = sanitizeChatHistory([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi, how can I help?' },
      { role: 'user', content: 'What is the next meeting?' },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.messages).toHaveLength(3);
      expect(result.messages[2]).toEqual({ role: 'user', content: 'What is the next meeting?' });
    }
  });

  it('rejects non-array input', () => {
    expect(sanitizeChatHistory(null).ok).toBe(false);
    expect(sanitizeChatHistory('hello').ok).toBe(false);
    expect(sanitizeChatHistory(undefined).ok).toBe(false);
  });

  it('rejects invalid roles and empty content', () => {
    expect(sanitizeChatHistory([{ role: 'system', content: 'hi' }]).ok).toBe(false);
    expect(sanitizeChatHistory([{ role: 'user', content: '   ' }]).ok).toBe(false);
    expect(sanitizeChatHistory([{ role: 'user' }]).ok).toBe(false);
    expect(sanitizeChatHistory(['hello']).ok).toBe(false);
  });

  it('rejects conversations that do not end with a user message', () => {
    expect(sanitizeChatHistory([]).ok).toBe(false);
    expect(
      sanitizeChatHistory([{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hey' }]).ok,
    ).toBe(false);
  });

  it('rejects oversized messages', () => {
    const result = sanitizeChatHistory([{ role: 'user', content: 'a'.repeat(MAX_MESSAGE_LENGTH + 1) }]);
    expect(result.ok).toBe(false);
  });

  it('trims the conversation to the most recent turns', () => {
    const many = Array.from({ length: MAX_HISTORY_MESSAGES + 5 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `message ${index}`,
    })) as Array<{ role: 'user' | 'assistant'; content: string }>;

    const result = sanitizeChatHistory(many);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.messages).toHaveLength(MAX_HISTORY_MESSAGES);
      expect(result.messages[result.messages.length - 1].content).toBe(
        `message ${many.length - 1}`,
      );
    }
  });
});

describe('SYSTEM_PROMPT', () => {
  it('states the assistant is not a therapist and requires plain uncertainty', () => {
    expect(SYSTEM_PROMPT).toMatch(/not a therapist/i);
    expect(SYSTEM_PROMPT).toMatch(/uncertainty/i);
    expect(SYSTEM_PROMPT).toMatch(/Anchor/);
    expect(SYSTEM_PROMPT).toMatch(/Mirror/);
    expect(SYSTEM_PROMPT).toMatch(/Reframe/);
    expect(SYSTEM_PROMPT).toMatch(/Rapport/);
  });

  it('includes crisis resources', () => {
    expect(SYSTEM_PROMPT).toContain('988');
  });
});
