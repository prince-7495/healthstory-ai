"use client";

import { JOURNAL } from "@/lib/journal/options";
import { shortLabel } from "@/lib/health/dates";
import type { FrequencyPoint, PatternSequence } from "@/lib/journal/engine";
import type { StoryActivity } from "@/lib/journal/types";
import type { AnalyzedEvent } from "@/lib/health/types";
import { PlusTrendIcon, SparkIcon, TimelineIcon } from "../icons";
import styles from "./journal.module.css";

type Props = {
  events: AnalyzedEvent[];
  patterns: PatternSequence[];
  frequencySeries: FrequencyPoint[];
  activity: StoryActivity[];
  onOpenTopic: (label: string) => void;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * JournalInsights — the descriptive, non-clinical analytics.
 *
 * Everything here describes what the user recorded: the sequence of
 * values over time, the topics mentioned together, and organizational
 * activity. There are no trends, scores, predictions or causal arrows.
 */
export default function JournalInsights({ events, patterns, frequencySeries, activity, onOpenTopic }: Props) {
  // Evolution points: dated events, de-duplicated by date + title.
  const seen = new Set<string>();
  const points = [...events]
    .filter((e) => e.status !== "REMOVED" && e.date)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1))
    .filter((e) => {
      const key = `${e.date}::${e.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 7);

  const hasEnoughForFrequency = frequencySeries.length >= 3;
  const recentActivity = activity.slice(0, 6);

  return (
    <>
      {/* Story evolution visualization */}
      <section className={styles.panel} aria-labelledby="evolution-viz-heading">
        <div className={styles.panelHead}>
          <TimelineIcon size={17} />
          <h2 className={styles.panelTitle} id="evolution-viz-heading">
            Story Evolution
          </h2>
        </div>
        <div className={styles.panelBody}>
          {points.length < 2 ? (
            <div className={styles.empty}>
              <p className={styles.panelTitle} style={{ fontSize: 14 }}>{JOURNAL.notEnoughForComparison}</p>
              <p className={styles.sub} style={{ marginTop: 6 }}>{JOURNAL.notEnoughBody}</p>
            </div>
          ) : (
            <div className={styles.viz}>
              <ol className={styles.vizTrack}>
                {points.map((p) => (
                  <li key={p.id} className={styles.vizPoint}>
                    <span className={styles.vizDot} aria-hidden="true" />
                    <p className={styles.vizMonth}>{shortLabel(p.timeLabel)}</p>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      style={{ marginTop: 2 }}
                      onClick={() => onOpenTopic(p.label || p.title)}
                    >
                      <span className={styles.vizLabel}>{p.label || p.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>

      {/* Story patterns */}
      <section className={styles.panel} aria-labelledby="patterns-heading">
        <div className={styles.panelHead}>
          <SparkIcon size={17} />
          <h2 className={styles.panelTitle} id="patterns-heading">
            {JOURNAL.patternsHeading}
          </h2>
        </div>
        <div className={styles.panelBody}>
          {patterns.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.panelTitle} style={{ fontSize: 14 }}>{JOURNAL.notEnoughForComparison}</p>
              <p className={styles.sub} style={{ marginTop: 6 }}>{JOURNAL.notEnoughBody}</p>
            </div>
          ) : (
            patterns.map((pattern) => {
              const isContext = pattern.category === "Context mentioned";
              return (
                <div key={pattern.category} className={styles.patternRow}>
                  <p className={styles.patternKey}>{pattern.category}</p>
                  <div className={styles.patternVals}>
                    {pattern.values.map((value, i) => (
                      <span key={`${value}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {!isContext && i > 0 ? <span className={styles.patternArrow} aria-hidden="true">→</span> : null}
                        <span className={styles.patternVal}>{value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {hasEnoughForFrequency ? (
            <div className={styles.patternRow} style={{ marginTop: 6 }}>
              <p className={styles.patternKey}>Reported frequency</p>
              <div style={{ marginTop: 7 }}>
                {frequencySeries.map((f, i) => (
                  <div key={`${f.dateLabel}-${i}`} className={styles.patternVals} style={{ marginBottom: 4 }}>
                    <span className={styles.baKey} style={{ minWidth: 84, display: "inline-block" }}>
                      {f.dateLabel}
                    </span>
                    <span aria-hidden="true" style={{ color: "var(--brand-500)", letterSpacing: 2 }}>
                      {"●".repeat(Math.min(f.rank, 7))}
                    </span>
                    <span className={styles.sub}>{f.value}</span>
                  </div>
                ))}
              </div>
              <p className={styles.sectionNote}>
                This shows the words you recorded, not a calculated severity.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Story activity */}
      <section className={styles.panel} aria-labelledby="activity-heading">
        <div className={styles.panelHead}>
          <PlusTrendIcon size={17} />
          <h2 className={styles.panelTitle} id="activity-heading">
            {JOURNAL.activityHeading}
          </h2>
        </div>
        <div className={styles.panelBody}>
          {recentActivity.length === 0 ? (
            <p className={styles.sub}>No activity yet.</p>
          ) : (
            recentActivity.map((a) => (
              <div key={a.id} className={styles.activityItem}>
                <span className={styles.activityDot} aria-hidden="true" />
                <span style={{ flex: 1 }}>{a.label}</span>
                <span className={styles.muted}>{formatWhen(a.at)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
