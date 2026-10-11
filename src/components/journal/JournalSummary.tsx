"use client";

import { useState } from "react";
import { JOURNAL } from "@/lib/journal/options";
import type { SummaryState } from "@/lib/journal/engine";
import type { SummaryLength } from "@/lib/health/summary";
import type { StoryJournal } from "@/lib/journal/types";
import { EyeIcon, PlusIcon, SparkIcon, TrashIcon } from "../icons";
import styles from "./journal.module.css";

type Props = {
  journal: StoryJournal;
  state: SummaryState;
  onGenerate: (length: SummaryLength) => void;
  onExport: () => void;
  onDeleteSummary: (id: string) => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/**
 * JournalSummary — the summary's longitudinal status.
 *
 * The summary is never regenerated automatically. When the story has
 * new information the user is told, and choosing "Update Summary"
 * creates a new version while keeping the previous ones.
 */
export default function JournalSummary({ journal, state, onGenerate, onExport, onDeleteSummary }: Props) {
  const [length, setLength] = useState<SummaryLength>("standard");
  const [openId, setOpenId] = useState<string | null>(null);

  const latest = state.latest;
  const open = journal.summaries.find((s) => s.id === openId) ?? null;

  return (
    <section className={styles.panel} aria-labelledby="summary-panel-heading">
      <div className={styles.panelHead}>
        <SparkIcon size={17} />
        <h2 className={styles.panelTitle} id="summary-panel-heading">
          {JOURNAL.summariesHeading}
        </h2>
      </div>
      <div className={styles.panelBody}>
        {!state.hasSummary ? (
          <>
            <p className={styles.sub}>{JOURNAL.noSummaryYet}</p>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
              style={{ marginTop: 12 }}
              onClick={() => onGenerate(length)}
            >
              <PlusIcon size={14} />
              {JOURNAL.updateSummaryCta}
            </button>
          </>
        ) : (
          <>
            <p className={styles.summaryStatus}>
              <span className={styles.statusDot} data-ok={!state.outOfDate} aria-hidden="true" />
              {state.outOfDate ? JOURNAL.summaryUpdateAvailable : JOURNAL.summaryUpToDate}
            </p>
            <p className={styles.sectionNote} style={{ marginTop: 6 }}>
              {JOURNAL.summaryLastUpdated}: {latest?.generatedAt ? formatDate(latest.generatedAt) : "Not provided"}
            </p>

            {state.outOfDate ? (
              <div className={styles.alert} style={{ marginTop: 12 }}>
                <p className={styles.alertText}>{JOURNAL.summaryMayBeOutOfDate}</p>
              </div>
            ) : null}

            <div className={styles.filterRow} style={{ marginTop: 12 }} role="group" aria-label="Summary length">
              {([
                { id: "brief", label: "Brief" },
                { id: "standard", label: "Standard" },
                { id: "detailed", label: "Detailed" },
              ] as const).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={styles.rangeBtn}
                  data-active={length === o.id}
                  aria-pressed={length === o.id}
                  onClick={() => setLength(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div className={styles.btnRow} style={{ marginTop: 12 }}>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => onGenerate(length)}>
                {state.outOfDate ? JOURNAL.reviewUpdatedSummaryCta : JOURNAL.updateSummaryCta}
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={onExport}>
                {JOURNAL.exportLatestCta}
              </button>
            </div>
          </>
        )}

        {journal.summaries.length > 0 ? (
          <div style={{ marginTop: 18 }}>
            <p className={styles.drawerKey}>{JOURNAL.previousSummariesHeading}</p>
            {journal.summaries.slice(0, 5).map((s) => (
              <div key={s.id} className={styles.prevSummary}>
                <div>
                  <p className={styles.prevTitle}>Summary v{s.version}</p>
                  <p className={styles.prevMeta}>{formatDate(s.generatedAt)} · {s.length}</p>
                </div>
                <div className={styles.btnRow}>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    aria-expanded={openId === s.id}
                    onClick={() => setOpenId((v) => (v === s.id ? null : s.id))}
                  >
                    <EyeIcon size={13} />
                    {JOURNAL.viewPreviousSummaryCta}
                  </button>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => onDeleteSummary(s.id)}
                    aria-label={`Delete summary v${s.version}`}
                  >
                    <TrashIcon size={13} />
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {open ? (
              <div className={styles.evidence} style={{ marginTop: 12 }}>
                <p className={styles.evidenceKey}>{JOURNAL.readOnlyVersionNote}</p>
                <p className={styles.evoDesc} style={{ marginTop: 6 }}>{open.mainConcern}</p>
                {open.timeline.length > 0 ? (
                  <ul style={{ marginTop: 8 }}>
                    {open.timeline.map((t) => (
                      <li key={t.eventId} className={styles.changeLine}>
                        {t.dateText}: {t.description}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className={styles.sectionNote}>
                  Version {open.version} · {formatDate(open.generatedAt)} · {open.reviewStatus.toLowerCase().replace("_", " ")}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <p className={styles.sectionNote} style={{ marginTop: 14 }}>
          {JOURNAL.savedLocally}
        </p>
      </div>
    </section>
  );
}
