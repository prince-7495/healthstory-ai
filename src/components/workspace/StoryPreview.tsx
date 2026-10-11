"use client";

import { useMemo } from "react";
import { EMPTY_STATE, RESULT } from "@/lib/health/options";
import { previewOrganizedStory } from "@/lib/health/analyzeHealthStory";
import type { HealthStory, OrganizedStory, TimelineEntry } from "@/lib/health/types";
import { SparkIcon } from "../icons";
import EmptyState from "./EmptyState";
import styles from "./workspace.module.css";

const MAX_PREVIEW_EVENTS = 4;

/* ---------- TimelinePreview ---------- */
function TimelinePreview({ entries }: { entries: TimelineEntry[] }) {
  const shown = entries.slice(0, MAX_PREVIEW_EVENTS);
  const hidden = entries.length - shown.length;

  return (
    <section>
      <h3 className={styles.railTitle}>Timeline preview</h3>

      {entries.length === 0 ? (
        <p className={styles.nothingYet}>{EMPTY_STATE.previewEmpty}</p>
      ) : (
        <>
          <ol className={styles.tl}>
            {shown.map((entry) => (
              <li key={entry.id} className={styles.tlItem} data-prov={entry.provenance}>
                <span className={styles.tlDot} aria-hidden="true" />
                <p className={styles.tlPeriod}>
                  {entry.period}
                  <span className={entry.provenance === "user" ? styles.tagUser : styles.tagAi}>
                    {entry.provenance === "user" ? RESULT.provenance.user : RESULT.provenance.ai}
                  </span>
                </p>
                <p className={styles.tlHead}>{entry.headline}</p>
                {entry.detail ? <p className={styles.tlDetail}>{entry.detail}</p> : null}
              </li>
            ))}
          </ol>
          {hidden > 0 ? (
            <p className={styles.previewMore}>
              + {hidden} more {hidden === 1 ? "entry" : "entries"} in your full story
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

/* ---------- AIOrganizedItems ----------
   What the extractor grouped, separated from what the user typed, so the
   preview never blurs the line before the result screen does. */
function AIOrganizedItems({ story }: { story: OrganizedStory }) {
  const grouped = story.notableChanges.length + story.context.length;

  if (grouped === 0) {
    return (
      <section className={styles.previewSection}>
        <h3 className={styles.railTitle}>AI organized</h3>
        <p className={styles.nothingYet}>
          Nothing to group yet. Patterns and changes appear here as you write.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.previewSection}>
      <h3 className={styles.railTitle}>AI organized</h3>
      <div className={styles.previewFacts}>
        {story.notableChanges.slice(0, 3).map((change) => (
          <p key={change.id} className={styles.fact}>
            <span className={styles.factDot} aria-hidden="true" />
            <span>{change.text}</span>
          </p>
        ))}
        {story.context.slice(0, 1).map((item) => (
          <p key={item} className={styles.fact}>
            <span className={styles.factDot} aria-hidden="true" />
            <span>{item}</span>
          </p>
        ))}
      </div>
    </section>
  );
}

/* ---------- StructuredInfo ---------- */
function StructuredInfo({ story }: { story: OrganizedStory }) {
  const hasAny =
    story.symptoms.length > 0 ||
    Boolean(story.time.firstNoticed) ||
    Boolean(story.time.recentChange) ||
    story.context.length > 0 ||
    story.other.length > 0;

  return (
    <section className={styles.previewSection}>
      <h3 className={styles.railTitle}>Structured information</h3>

      {!hasAny ? (
        <p className={styles.nothingYet}>
          Symptoms and timing appear here once they are recognised in your words.
        </p>
      ) : (
        <div className={styles.previewFacts}>
          {story.symptoms.length > 0 ? (
            <div className={styles.symptomRow}>
              {story.symptoms.map((symptom) => (
                <span key={symptom.id} className={styles.symptomChip}>
                  {symptom.label}
                  {symptom.mentions > 1 ? (
                    <span className={styles.symptomCount}>&times;{symptom.mentions}</span>
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}

          {/* Timing rows are always shown. A blank is a fact about the
              story, and hiding it would imply the extractor missed it. */}
          <p className={styles.fact}>
            <span className={styles.factDot} aria-hidden="true" />
            <span>
              <strong>First noticed:</strong>{" "}
              {story.time.firstNoticed ?? <em className={styles.absent}>Not stated yet</em>}
            </span>
          </p>

          <p className={styles.fact}>
            <span className={styles.factDot} aria-hidden="true" />
            <span>
              <strong>Recent change:</strong>{" "}
              {story.time.recentChange ?? (
                <em className={styles.absent}>No dated change recorded</em>
              )}
            </span>
          </p>

          {story.context.slice(0, 2).map((item) => (
            <p key={item} className={styles.fact}>
              <span className={styles.factDot} aria-hidden="true" />
              <span>{item}</span>
            </p>
          ))}

          {story.other.slice(0, 2).map((item) => (
            <p key={item} className={styles.fact}>
              <span className={styles.factDot} aria-hidden="true" />
              <span>{item}</span>
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

type Props = {
  story: HealthStory;
  onWriteFirstNote: () => void;
};

/**
 * StoryPreview — the live right-hand column.
 *
 * Runs the same extractor as the submit button, synchronously and
 * without the staged delays, so what the user sees while typing is
 * exactly what they get when they press Organize. No separate
 * "preview rendering" that might disagree with the real result.
 */
export default function StoryPreview({ story, onWriteFirstNote }: Props) {
  const organized = useMemo(() => previewOrganizedStory(story), [story]);

  return (
    <aside className={styles.preview} aria-label="Live story preview">
      <div className={styles.previewHead}>
        <SparkIcon size={17} className={styles.blockTitleIcon} />
        <span className={styles.previewTitle}>Your Story</span>
        {organized ? (
          <span className={styles.previewLive}>
            <span className={styles.previewLiveDot} aria-hidden="true" />
            Live
          </span>
        ) : null}
      </div>

      <div className={styles.previewBody}>
        {!organized ? (
          <EmptyState onWrite={onWriteFirstNote} />
        ) : (
          <>
            <TimelinePreview entries={organized.timeline} />
            <AIOrganizedItems story={organized} />
            <StructuredInfo story={organized} />
          </>
        )}
      </div>
    </aside>
  );
}