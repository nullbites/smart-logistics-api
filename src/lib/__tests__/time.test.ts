import { formatHhMm, HHMM_PATTERN, isValidHhMm, parseHhMm } from '../time';

describe('parseHhMm', () => {
  it.each([
    ['00:00', 0],
    ['07:00', 420],
    ['09:00', 540],
    ['17:30', 1050],
    ['23:59', 1439],
  ])('parses %s to %s', (value, expected) => {
    expect(parseHhMm(value)).toBe(expected);
  });

  it.each([
    ['26:99'],
    ['24:00'],
    ['7:00'],
    ['07:60'],
    ['07:0'],
    [''],
    ['abc'],
    ['07:00:00'],
    ['07-00'],
    [' 07:00'],
  ])('throws for %p', (value) => {
    expect(() => parseHhMm(value)).toThrow();
  });
});

describe('isValidHhMm', () => {
  it.each(['07:00', '23:59', '00:00'])('is true for %s', (value) => {
    expect(isValidHhMm(value)).toBe(true);
  });

  it.each(['26:99', '7:00', '24:00'])('is false for %s', (value) => {
    expect(isValidHhMm(value)).toBe(false);
  });
});

describe('formatHhMm', () => {
  it.each([
    [0, '00:00'],
    [420, '07:00'],
    [1439, '23:59'],
    [540, '09:00'],
  ])('renders %s to %s', (minutesOfDay, expected) => {
    expect(formatHhMm(minutesOfDay)).toBe(expected);
  });

  it.each([[-1], [1440], [12.5]])('throws for %p', (minutesOfDay) => {
    expect(() => formatHhMm(minutesOfDay)).toThrow();
  });
});

describe('round-trip', () => {
  it.each([0, 420, 540, 1050, 1439])('parseHhMm(formatHhMm(%s)) === %s', (m) => {
    expect(parseHhMm(formatHhMm(m))).toBe(m);
  });
});

describe('HHMM_PATTERN', () => {
  it('is the documented strict pattern string', () => {
    expect(HHMM_PATTERN).toBe('^([01][0-9]|2[0-3]):[0-5][0-9]$');
  });
});
