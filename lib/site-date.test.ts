import { describe, expect, it } from 'vitest';
import { getDateInTimeZone } from './site-date';

describe('getDateInTimeZone', () => {
  it('compares upcoming events using the Denver date across midnight and DST', () => {
    expect(getDateInTimeZone(new Date('2026-03-08T06:59:00Z'))).toBe('2026-03-07');
    expect(getDateInTimeZone(new Date('2026-03-08T07:00:00Z'))).toBe('2026-03-08');
  });
});
