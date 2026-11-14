import { describe, expect, it } from 'vitest';

import { escapeIcsText, toGoogleCalendarUrl, toIcs } from './calendar-ics';

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

  it('labels calendar exports as all-day events in the site timezone', () => {
    const event = {
      id: 'event-2',
      title: 'Denver workshop',
      date: '2026-11-14',
      location: 'Denver',
      description: 'Bring a notebook',
    };

    const calendar = toIcs(event);
    expect(calendar).toContain('X-WR-TIMEZONE:America/Denver');
    expect(calendar).toContain('DTSTART;VALUE=DATE:20261114');
    expect(calendar).toContain('DESCRIPTION:All-day event (America/Denver).\\nBring a notebook');

    const googleUrl = new URL(toGoogleCalendarUrl(event));
    expect(googleUrl.searchParams.get('dates')).toBe('20261114/20261114');
    expect(googleUrl.searchParams.get('ctz')).toBe('America/Denver');
    expect(googleUrl.searchParams.get('details')).toContain('All-day event (America/Denver).');
  });
});
