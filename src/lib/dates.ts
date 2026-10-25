/**
 * Newslingo's audience is Turkish-speaking, so dates are shown in Istanbul
 * time. A fixed locale and time zone also keep server-rendered dates identical
 * to what the browser would produce.
 */
export const DISPLAY_TIME_ZONE = "Europe/Istanbul";

// Turkey has kept a fixed UTC+3 offset with no daylight saving since 2016, so
// Istanbul calendar days can be computed without a time-zone library.
const DISPLAY_UTC_OFFSET = "+03:00";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const articleDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: DISPLAY_TIME_ZONE,
});

/** Formats a timestamp as a calendar date, for example "25 September 2026". */
export function formatArticleDate(date: Date): string {
  return articleDateFormat.format(date);
}

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: DISPLAY_TIME_ZONE,
});

/** Formats a timestamp to the minute, for example "25 October 2026 at 18:40". */
export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}

/** The instant an Istanbul calendar day (`YYYY-MM-DD`) begins. */
export function startOfDisplayDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00${DISPLAY_UTC_OFFSET}`);
}

/** The instant the Istanbul calendar day after `isoDate` begins. */
export function startOfNextDisplayDay(isoDate: string): Date {
  return new Date(startOfDisplayDay(isoDate).getTime() + DAY_IN_MILLISECONDS);
}
