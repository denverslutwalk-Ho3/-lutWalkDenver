export const RSVP_STATUSES = ['attending'] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];
export type EventRole = 'member' | 'admin';
export type EventRsvp = { status: RsvpStatus; updatedAt: unknown };

export function normalizeEventRsvps(value: unknown): Partial<Record<EventRole, EventRsvp>> {
  const normalized: Partial<Record<EventRole, EventRsvp>> = {};
  const entries = Array.isArray(value)
    ? value.map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const record = entry as Record<string, unknown>;
        return {
          role: record.attendee,
          status: record.status,
          updatedAt: record.updatedAt ?? record.at,
        };
      })
    : value && typeof value === 'object'
      ? Object.entries(value as Record<string, unknown>).map(([role, entry]) => {
          if (!entry || typeof entry !== 'object') return null;
          const record = entry as Record<string, unknown>;
          return {
            role,
            status: record.status,
            updatedAt: record.updatedAt ?? record.at,
          };
        })
      : [];

  for (const entry of entries) {
    if (
      !entry
      || (entry.role !== 'member' && entry.role !== 'admin')
      || !RSVP_STATUSES.includes(entry.status as RsvpStatus)
    ) continue;

    normalized[entry.role] = {
      status: entry.status as RsvpStatus,
      updatedAt: entry.updatedAt ?? null,
    };
  }

  return normalized;
}
