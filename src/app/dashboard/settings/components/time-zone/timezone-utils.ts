import moment from 'moment-timezone';

export interface TimeZone {
  name: string;
  offset: string;
}

export const generateTimezones = (): TimeZone[] => moment.tz
  .names()
  .map((name) => {
    const offsetMinutes = moment.tz.zone(name)?.utcOffset(Date.now()) ?? 0;

    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;

    const sign = offsetMinutes <= 0 ? '+' : '-';
    const offset = `GMT${sign}${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;

    return { name, offset };
  })
  .sort(
    (a, b) => a.offset.localeCompare(b.offset) || a.name.localeCompare(b.name),
  );

export const TIMEZONES = generateTimezones();
