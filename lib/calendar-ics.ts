export type IcsEvent = {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
};

export const SITE_TIME_ZONE = 'America/Denver';

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

export function toIcs(event: IcsEvent): string {
  const dateStr = event.date.replace(/-/g, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SlutWalk Denver//EN',
    `X-WR-TIMEZONE:${SITE_TIME_ZONE}`,
    'BEGIN:VEVENT',
    `UID:${event.id.replace(/[\r\n]/g, '')}@slutwalkdenver`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(`All-day event (${SITE_TIME_ZONE}).${event.description ? `\n${event.description}` : ''}`)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function toGoogleCalendarUrl(event: IcsEvent): string {
  const date = event.date.replace(/-/g, '');
  const details = `All-day event (${SITE_TIME_ZONE}).${event.description ? `\n${event.description}` : ''}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${date}/${date}`,
    details,
    location: event.location,
    ctz: SITE_TIME_ZONE,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
