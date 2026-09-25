/**
 * Newslingo's audience is Turkish-speaking, so dates are shown in Istanbul
 * time. A fixed locale and time zone also keep server-rendered dates identical
 * to what the browser would produce.
 */
export const DISPLAY_TIME_ZONE = "Europe/Istanbul";

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
