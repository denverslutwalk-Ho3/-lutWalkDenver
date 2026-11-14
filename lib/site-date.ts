import { SITE_TIME_ZONE } from './calendar-ics';

export function getDateInTimeZone(date: Date, timeZone = SITE_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error(`Could not format date in timezone ${timeZone}`);
  }
  return `${year}-${month}-${day}`;
}
