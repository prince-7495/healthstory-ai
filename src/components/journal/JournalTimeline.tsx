"use client";

import { useState } from "react";
import { JOURNAL } from "@/lib/journal/options";
import type { EventFilters } from "@/lib/journal/engine";
import type { TimeRangeId } from "@/lib/journal/types";
import { FILTER_CATEGORIES } from "@/lib/journal/types";
import type { AnalyzedEvent, EventCategory } from "@/lib/health/types";
import { EyeIcon, PlusTrendIcon, QuoteIcon, TimelineIcon } from "../icons";
import styles from "./journal.module.css";

type Props = {
  events: AnalyzedEvent[];
  categories: EventCategory[];
  filters: EventFilters;
  totalEvents: number;
  onFiltersChange: (patch: Partial<EventFilters>) => void;
  onClearFilters: () => void;
  onOpenTopic: (label: string) => void;
};

const CATEGORY_SHORT: Record<EventCategory, string> = {
  symptom: "Symptom",
  medication: "Medication",
  treatment: "Treatment",
  test: "Test",
  appointment: "Appointment",
  lifestyle: "Lifestyle",
  context: "Context",
  change: "Change",
  other: "Other",
};

function TimelineItem({
  event,
  onOpenTopic,
}: {
  event: AnalyzedEvent;
  onOpenTopic: (label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = event.label || event.title;

  return (
    <li className={styles.tlItem}>
      <span className={styles.tlDot} aria-hidden="true" />
      <p className={styles.tlDate}>
        {event.timeLabel}
        <span className={styles.catChip}>{CATEGORY_SHORT[event.category]}</span>
      </p>
      <p className={styles.tlText}>{event.title}</p>
      {open ? (
        <div className={styles.evidence}>
          <p className={styles.evidenceKey}>{JOURNAL.newEvidenceLabel}</p>
          <p className={styles.evidenceQuote}>&ldquo;{event.sourceText}&rdquo;</p>
          {event.frequency ? (
            <p className={styles.evoDesc} style={{ marginTop: 6 }}>Frequency: {event.frequency}</p>
          ) : null}
          {event.context ? (
            <p className={styles.evoDesc}>Context: {event.context}</p>
          ) : null}
        </div>
      ) : null}
      <div className={styles.tlActions}>
        {event.sourceText ? (
          <button type="button" className={styles.linkBtn} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <EyeIcon size={13} />
            {open ? "Hide source" : JOURNAL.viewEvidenceCta}
          </button>
        ) : null}
        <button type="button" className={styles.linkBtn} onClick={() => onOpenTopic(label)}>
          <PlusTrendIcon size={13} />
          {JOURNAL.topicHistoryHeading}
        </button>
      </div>
    </li>
  );
}

/**
 * JournalTimeline — the filterable, searchable record.
 *
 * Search covers only the user's own entries and events. It is not a
 * medical search engine, and it never returns an interpretation.
 */
export default function JournalTimeline({
  events,
  categories,
  filters,
  totalEvents,
  onFiltersChange,
  onClearFilters,
  onOpenTopic,
}: Props) {
  const active = events.length;
  const hasFilters =
    filters.query.trim() !== "" || filters.categories.length > 0 || filters.range !== "all";

  return (
    <section className={styles.panel} aria-labelledby="journal-timeline-heading">
      <div className={styles.panelHead}>
        <TimelineIcon size={17} />
        <h2 className={styles.panelTitle} id="journal-timeline-heading">
          {JOURNAL.timelineHeading}
        </h2>
        <span className={styles.panelCount}>
          {hasFilters ? `${active} / ${totalEvents}` : totalEvents}
        </span>
      </div>

      <div className={styles.panelBody}>
        <div className={styles.filters}>
          <div>
            <label htmlFor="story-search" className="sr-only">
              {JOURNAL.searchHeading}
            </label>
            <input
              id="story-search"
              className={styles.input}
              type="search"
              placeholder={JOURNAL.searchPlaceholder}
              value={filters.query}
              onChange={(e) => onFiltersChange({ query: e.target.value })}
            />
          </div>

          <div>
            <p className={styles.baKey} style={{ marginBottom: 7 }}>{JOURNAL.viewPeriodHeading}</p>
            <div className={styles.filterRow} role="group" aria-label={JOURNAL.viewPeriodHeading}>
              {JOURNAL.timeRanges.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={styles.rangeBtn}
                  data-active={filters.range === r.id}
                  aria-pressed={filters.range === r.id}
                  onClick={() => onFiltersChange({ range: r.id as TimeRangeId })}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {filters.range === "custom" ? (
            <div className={styles.filterRow}>
              <label className={styles.sub} htmlFor="range-from">{JOURNAL.customFrom}</label>
              <input
                id="range-from"
                type="date"
                className={styles.select}
                value={filters.from ?? ""}
                onChange={(e) => onFiltersChange({ from: e.target.value })}
              />
              <label className={styles.sub} htmlFor="range-to">{JOURNAL.customTo}</label>
              <input
                id="range-to"
                type="date"
                className={styles.select}
                value={filters.to ?? ""}
                onChange={(e) => onFiltersChange({ to: e.target.value })}
              />
            </div>
          ) : null}

          {categories.length > 1 ? (
            <div>
              <p className={styles.baKey} style={{ marginBottom: 7 }}>{JOURNAL.categoryFilterHeading}</p>
              <div className={styles.filterRow} role="group" aria-label={JOURNAL.categoryFilterHeading}>
                {FILTER_CATEGORIES.filter((c) => categories.includes(c.id)).map((c) => {
                  const on = filters.categories.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={styles.catToggle}
                      data-active={on}
                      aria-pressed={on}
                      onClick={() =>
                        onFiltersChange({
                          categories: on
                            ? filters.categories.filter((x) => x !== c.id)
                            : [...filters.categories, c.id],
                        })
                      }
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {hasFilters ? (
            <div>
              <button type="button" className={styles.linkBtn} onClick={onClearFilters}>
                {JOURNAL.clearFiltersCta}
              </button>
            </div>
          ) : null}
        </div>

        {active === 0 ? (
          <div className={styles.empty}>
            <QuoteIcon size={20} style={{ margin: "0 auto 8px", display: "block", color: "var(--ink-300)" }} />
            {hasFilters ? JOURNAL.emptySearch : JOURNAL.emptyTimelineBody}
          </div>
        ) : (
          <ol className={styles.timeline}>
            {events.map((event) => (
              <TimelineItem key={event.id} event={event} onOpenTopic={onOpenTopic} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
