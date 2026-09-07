/** Strict 24-hour "HH:MM" pattern (two-digit hour and minute, 00:00-23:59). Exported for schema reuse. */
export const HHMM_PATTERN = '^([01][0-9]|2[0-3]):[0-5][0-9]$';

const HHMM_RE = new RegExp(HHMM_PATTERN);

/** Parse "HH:MM" (24-hour, strict) into minutes of day 0..1439. Throws on anything else, e.g. "26:99", "7:00", "07:60", "". */
export function parseHhMm(value: string): number {
  const match = HHMM_RE.exec(value);
  if (match === null) {
    throw new Error(`Invalid time, expected HH:MM in 00:00-23:59: ${JSON.stringify(value)}`);
  }
  const [hoursPart, minutesPart] = value.split(':');
  // regex guaranteed both parts; the fallbacks satisfy noUncheckedIndexedAccess
  return Number(hoursPart ?? '0') * 60 + Number(minutesPart ?? '0');
}

/** True when `value` is a valid strict "HH:MM" string. */
export function isValidHhMm(value: string): boolean {
  return HHMM_RE.test(value);
}

/** Peak windows applied when a network upload omits `peakWindows` (07:00-09:00 and 17:00-19:00). */
export const DEFAULT_PEAK_WINDOWS: ReadonlyArray<{ startMinute: number; endMinute: number }> = [
  { startMinute: 420, endMinute: 540 },
  { startMinute: 1020, endMinute: 1140 },
];

/** Render a minute of day (0..1439) back to "HH:MM". Throws if out of range or non-integer. */
export function formatHhMm(minutesOfDay: number): string {
  if (!Number.isInteger(minutesOfDay) || minutesOfDay < 0 || minutesOfDay > 1439) {
    throw new Error(`Invalid minute of day: ${minutesOfDay}`);
  }
  const hours = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
