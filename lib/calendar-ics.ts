export type IcsEvent = {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
};

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
    'BEGIN:VEVENT',
    `UID:${event.id.replace(/[\r\n]/g, '')}@slutwalkdenver`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
