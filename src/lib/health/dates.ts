/* =============================================================
   Date handling — shared by the analyzer and the UI

   One place decides how a date is written, so a date chosen in a form
   field and a date parsed out of a sentence read identically on screen.

   The central rule: never manufacture precision. "a few months ago" is
   APPROXIMATE forever, and a span like "between March and May" is a
   RANGE, not one of its two ends.
   ============================================================= */

import type { DatePrecision } from "./types";

export const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

export const MONTH_RE = new RegExp(`\\b(${MONTHS.join("|")})\\b`, "i");

export function monthIndex(name: string): number {
  return MONTHS.indexOf(name.toLowerCase());
}

/** Loose counts used when a user says "three months ago". */
export const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  couple: 2, few: 3, several: 3,
};

const COUNT_WORD =
  "(\\d+|a|an|one|two|three|four|five|six|couple(?: of)?|few|several)";

/** Human words the user hedges with, which cap precision at approximate. */
export const HEDGES: RegExp[] = [
  /\b(?:around|about|approx(?:imately)?|roughly|circa)\b/i,
  /\bsometime/i,
  /\bsome ?time\b/i,
  /\bmaybe\b/i,
  /\bpossibly\b/i,
  /\bi think\b/i,
  /\bnot sure\b/i,
  /\bor so\b/i,
  /\bsort of\b/i,
  /\bapproximately\b/i,
];

/** True when the user hedged this date themselves. */
export function isHedged(text: string): boolean {
  return HEDGES.some((h) => h.test(text));
}

export function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function formatMonthYear(d: Date): string {
  const month = MONTHS[d.getMonth()];
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${d.getFullYear()}`;
}

/** "March 2026, 14 Mar" — unambiguous across locales without Intl overhead. */
export function formatDate(d: Date): string {
  return `${formatMonthYear(d)}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses `YYYY-MM-DD` into a local Date (avoids the UTC shift of `new Date(str)`). */
export function fromISO(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* ------------------------------------------------------------------ *
 * Time expression parsing
 * ------------------------------------------------------------------ */

export interface TimeMatch {
  precision: DatePrecision;
  /** ISO start of the period, when we genuinely know one. */
  date: string | null;
  /** ISO end of a RANGE, otherwise null. */
  dateEnd?: string | null;
  /** Human label. Uncertainty is spelled out in the label itself. */
  label: string;
  /** The user's own words for the time. Verbatim. */
  text: string;
  hedged: boolean;
  /** Order on the timeline; larger is later. Null means "no place yet". */
  sortKey: number | null;
}

const NO_TIME: TimeMatch = {
  precision: "unknown",
  date: null,
  dateEnd: null,
  label: "Date not provided",
  text: "",
  hedged: true,
  sortKey: null,
};

function ordinal(d: Date): number {
  // Days since epoch, on the local calendar. Monotonic and cheap.
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
}

function time(
  precision: DatePrecision,
  date: Date | null,
  label: string,
  text: string,
  hedged: boolean,
  dateEnd: Date | null = null,
): TimeMatch {
  return {
    precision,
    date: date ? toISO(date) : null,
    dateEnd: dateEnd ? toISO(dateEnd) : null,
    label,
    text,
    hedged,
    sortKey: date ? ordinal(date) : null,
  };
}

/** Back off `n` units from `now`, for "3 weeks ago" and similar. */
function backOff(now: Date, n: number, unit: string): Date {
  const d = new Date(now);
  if (unit === "day") d.setDate(d.getDate() - n);
  if (unit === "week") d.setDate(d.getDate() - n * 7);
  if (unit === "month") d.setMonth(d.getMonth() - n);
  if (unit === "year") d.setFullYear(d.getFullYear() - n);
  return d;
}

/**
 * Finds the strongest time expression in a piece of text.
 *
 * Ordered from most to least specific, and deliberately conservative: when
 * the text is ambiguous the result is `approximate` or `unknown`, which the UI
 * renders as uncertainty rather than resolving into a date the user never gave.
 */
export function findTime(text: string, now: Date): TimeMatch {
  if (!text.trim()) return NO_TIME;

  const hedged = isHedged(text);

  /* 1. RANGE — "between March and May", "from January to April"
        Checked before single months so the span is not collapsed to an end. */
  const range = text.match(
    new RegExp(
      `\\b(?:between|from)\\s+(${MONTHS.join("|")})\\s*(?:and|to|-|–|—)\\s*(${MONTHS.join("|")})(?:,?\\s*(\\d{4}))?`,
      "i",
    ),
  );
  if (range) {
    const a = monthIndex(range[1]);
    const b = monthIndex(range[2]);
    const year = range[3] ? Number(range[3]) : now.getFullYear();
    // An inverted range ("between May and March") is the user's phrasing, not
    // an error to silently repair, so it is kept as written and flagged by its
    // own text rather than reordered behind their back.
    const start = new Date(year, a, 1);
    const end = new Date(year, b, 1);
    const label = `${formatMonthYear(start)} – ${formatMonthYear(end)}`;
    return time("range", start, label, range[0], true, end);
  }

  /* 2. ISO — 2026-05-14 */
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!Number.isNaN(d.getTime())) {
      return time(hedged ? "approximate" : "exact", d, formatDate(d), iso[0], hedged);
    }
  }

  /* 3. "14 May 2026" / "May 14, 2026" */
  const dmy = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+),?\s*(\d{4})?\b/i);
  if (dmy && MONTH_RE.test(dmy[2])) {
    const day = Number(dmy[1]);
    if (day >= 1 && day <= 31) {
      const d = new Date(dmy[3] ? Number(dmy[3]) : now.getFullYear(), monthIndex(dmy[2]), day);
      if (!Number.isNaN(d.getTime())) {
        return time(hedged ? "approximate" : "exact", d, formatDate(d), dmy[0], hedged);
      }
    }
  }

  const mdy = text.match(/\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i);
  if (mdy && MONTH_RE.test(mdy[1])) {
    const day = Number(mdy[2]);
    if (day >= 1 && day <= 31) {
      const d = new Date(mdy[3] ? Number(mdy[3]) : now.getFullYear(), monthIndex(mdy[1]), day);
      if (!Number.isNaN(d.getTime())) {
        return time(hedged ? "approximate" : "exact", d, formatDate(d), mdy[0], hedged);
      }
    }
  }

  /* 4. "March 2026" — month with a year */
  const monthYear = text.match(/\b([a-z]+)\s+(\d{4})\b/i);
  if (monthYear && MONTH_RE.test(monthYear[1])) {
    const d = new Date(Number(monthYear[2]), monthIndex(monthYear[1]), 1);
    if (d <= now) {
      return time(
        hedged ? "approximate" : "month",
        d,
        hedged ? `Approximate date: ~${formatMonthYear(d)}` : formatMonthYear(d),
        monthYear[0],
        hedged,
      );
    }
  }

  /* 5. "a few months ago" / "3 weeks ago" */
  const ago = text.match(
    new RegExp(`\\b(?:${COUNT_WORD})?\\s*(day|week|month|year)s?\\s+ago\\b`, "i"),
  );
  if (ago) {
    const raw = (ago[1] || "1").toLowerCase();
    const n = NUMBER_WORDS[raw] ?? Number(raw) ?? 1;
    const d = backOff(now, Number.isNaN(n) ? 1 : n, ago[2].toLowerCase());
    return time(
      "approximate",
      d,
      `Approximate date: ~${formatMonthYear(d)}`,
      ago[0],
      true,
    );
  }

  /* 6. "for the last three months" / "over the past few weeks"
        A duration, not a start date. The end is today; the span is what we
        actually know, so the precision stays approximate. */
  const duration = text.match(
    new RegExp(
      `\\b(?:for|over|during|in)?\\s*(?:the\\s+)?(?:last|past|previous)\\s+(?:${COUNT_WORD}\\s*)?(day|week|month|year)s?\\b`,
      "i",
    ),
  );
  if (duration) {
    const raw = (duration[1] || "1").toLowerCase();
    const n = NUMBER_WORDS[raw] ?? Number(raw) ?? 1;
    const d = backOff(now, Number.isNaN(n) ? 1 : n, duration[2].toLowerCase());
    return time(
      "approximate",
      d,
      `Approximate date: ~${formatMonthYear(d)}`,
      duration[0],
      true,
    );
  }

  /* 7. bare month name */
  const bare = text.match(MONTH_RE);
  if (bare) {
    const d = new Date(now.getFullYear(), monthIndex(bare[0]), 1);
    // A month in the future is almost certainly a slip, so it is treated as
    // "not provided" rather than dated forward.
    if (d <= now) {
      return time(
        hedged ? "approximate" : "month",
        d,
        hedged ? `Approximate date: ~${formatMonthYear(d)}` : formatMonthYear(d),
        bare[0],
        hedged,
      );
    }
  }

  /* 8. relative buckets — real buckets for today/yesterday, open otherwise */
  if (/\btoday\b|\bthis morning\b|\btonight\b|\bright now\b/i.test(text)) {
    return time("relative", new Date(now), "Today", "today", false);
  }
  if (/\byesterday\b/i.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return time("relative", d, "Yesterday", "yesterday", false);
  }
  if (/\bthis week\b|\blast week\b/i.test(text)) {
    return time("relative", null, "This week", "this week", true);
  }
  if (/\bthis month\b|\blast month\b/i.test(text)) {
    return time("relative", null, "This month", "this month", true);
  }
  if (/\brecently\b|\blately\b|\bnowadays\b|\bthese days\b/i.test(text)) {
    return time("relative", null, "Recently", "recently", true);
  }

  return NO_TIME;
}

/**
 * Strips the hedging prefix from a timeline label.
 *
 * A timeline entry needs the full label — "Approximate date: ~July 2026" —
 * because the uncertainty is the point. A summary line that already reads
 * "First noticed: …" does not, or the same words appear twice.
 */
export function shortLabel(label: string): string {
  return (
    label
      .replace(/^Approximate date:\s*~?\s*/i, "")
      .replace(/^Date:\s*/i, "")
      .trim() || label
  );
}

/** Human label for an ISO date, or the honest "not provided" fallback. */
export function labelForISO(iso: string): { date: string; label: string } {
  const date = fromISO(iso);
  if (!date) return { date: "", label: "Date not provided" };
  return { date: iso, label: formatDate(date) };
}

/**
 * Phrases the structured panel maps to, so a user who picks "A few months
 * ago" and a user who types "a few months ago" get identical precision and
 * an identical label. One date language, no drift.
 */
export const START_PHRASE: Record<string, string> = {
  Today: "today",
  "This week": "this week",
  "This month": "this month",
  "A few months ago": "a few months ago",
  "More than a year ago": "over a year ago",
};
