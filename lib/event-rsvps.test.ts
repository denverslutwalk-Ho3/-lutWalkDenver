import { describe, expect, it } from 'vitest';
import { normalizeEventRsvps, RSVP_STATUSES } from './event-rsvps';

describe('event RSVP records', () => {
  it('collapses legacy timestamp-unique entries into one entry per role', () => {
    expect(normalizeEventRsvps([
      { attendee: 'member', status: 'attending', at: '2026-01-01T10:00:00Z' },
      { attendee: 'member', status: 'attending', at: '2026-01-02T10:00:00Z' },
      { attendee: 'unknown', status: 'attending', at: '2026-01-03T10:00:00Z' },
    ])).toEqual({
      member: { status: 'attending', updatedAt: '2026-01-02T10:00:00Z' },
    });
  });

  it('preserves valid map records and drops invalid statuses', () => {
    expect(normalizeEventRsvps({
      member: { status: 'attending', updatedAt: 'now' },
      admin: { status: 'unknown', updatedAt: 'then' },
    })).toEqual({
      member: { status: 'attending', updatedAt: 'now' },
    });
    expect(RSVP_STATUSES).toEqual(['attending']);
  });
});
