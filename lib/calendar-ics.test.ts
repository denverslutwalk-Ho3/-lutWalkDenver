import { describe, expect, it } from 'vitest';

import { escapeIcsText, toIcs } from './calendar-ics';

describe('ICS text escaping', () => {
  it('escapes special characters and all newline forms', () => {
    expect(escapeIcsText('a\\b;c,d\r\nnext\rfinal\nlast')).toBe(
      'a\\\\b\\;c\\,d\\nnext\\nfinal\\nlast',
    );
  });

  it('prevents event text from injecting additional ICS properties', () => {
    const calendar = toIcs({
      id: 'event-1',
      title: 'Meeting\r\nATTENDEE:attacker@example.com',
      date: '2026-11-14',
      location: 'Denver',
      description: 'Details',
    });

    expect(calendar).toContain('SUMMARY:Meeting\\nATTENDEE:attacker@example.com');
    expect(calendar).not.toContain('\r\nATTENDEE:');
  });
});
