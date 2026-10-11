"use client";

import { useState } from "react";
import { SUMMARY } from "@/lib/health/options";
import type { HealthSummary, SummarySectionKey } from "@/lib/health/summary";
import {
  AlertIcon,
  CheckIcon,
  DocumentIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  PlusTrendIcon,
  QuoteIcon,
  SparkIcon,
  TimelineIcon,
  TrashIcon,
} from "../../icons";
import styles from "./summary.module.css";

type Props = {
  summary: HealthSummary;
  onSetConcern: (value: string) => void;
  onToggleSection: (key: SummarySectionKey) => void;
  onViewSource: (statement: string, ids: string[]) => void;
  onAddNote: (note: string) => void;
  onRemoveNote: (index: number) => void;
  onRestoreOriginal: () => void;
  onMakeClearer: () => void;
  clearerNotice: boolean;
};

function ViewSource({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={styles.qBtn} onClick={onClick}>
      <EyeIcon size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
      {SUMMARY.viewSourceCta}
    </button>
  );
}

/**
 * SummarySections — the main (65%) column of the summary.
 *
 * Sections are individually removable and the main concern is editable.
 * Nothing here adds information: every panel renders only what the
 * confirmed story contains, and every statement links back to its source.
 */
export default function SummarySections({
  summary,
  onSetConcern,
  onToggleSection,
  onViewSource,
  onAddNote,
  onRemoveNote,
  onRestoreOriginal,
  onMakeClearer,
  clearerNotice,
}: Props) {
  const removed = (k: SummarySectionKey) => summary.removedSections.includes(k);

  const [editingConcern, setEditingConcern] = useState(false);
  const [concernDraft, setConcernDraft] = useState(summary.mainConcern);
  const [noteDraft, setNoteDraft] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  function saveConcern() {
    if (concernDraft.trim() && concernDraft !== summary.mainConcern) {
      onSetConcern(concernDraft.trim());
    }
    setEditingConcern(false);
  }

  const hidden = (["mainConcern", "timeline", "changes", "other", "questions", "missing"] as SummarySectionKey[]).filter(
    removed,
  );

  return (
    <div className={styles.main}>
      {hidden.length > 0 ? (
        <div className={styles.panel}>
          <div className={styles.panelBody} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span className={styles.prepKey} style={{ margin: 0 }}>
              Hidden sections
            </span>
            {hidden.map((key) => (
              <button key={key} type="button" className={styles.miniBtn} onClick={() => onToggleSection(key)}>
                Restore {key === "mainConcern" ? "main concern" : key}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* 1. Main concern */}
      {!removed("mainConcern") ? (
        <section className={styles.panel} aria-labelledby="s4-concern-heading">
          <div className={styles.panelHead}>
            <SparkIcon size={17} />
            <h2 className={styles.panelTitle} id="s4-concern-heading">
              {SUMMARY.mainConcernHeading}
            </h2>
            <button
              type="button"
              className={styles.qBtn}
              style={{ marginLeft: 4 }}
              onClick={() => onToggleSection("mainConcern")}
              aria-label={`${SUMMARY.removeSectionCta}: ${SUMMARY.mainConcernHeading}`}
            >
              <TrashIcon size={13} />
            </button>
          </div>
          <div className={styles.panelBody}>
            <p className={styles.prepKey}>Organized from your reported information</p>
            {editingConcern ? (
              <>
                <textarea
                  className={styles.concernEditor}
                  value={concernDraft}
                  onChange={(e) => setConcernDraft(e.target.value)}
                  aria-label={SUMMARY.mainConcernHeading}
                />
                <div className={styles.addQActions} style={{ marginTop: 10 }}>
                  <button type="button" className={`${styles.miniBtn} ${styles.miniBtnPrimary}`} onClick={saveConcern}>
                    <CheckIcon size={13} />
                    {SUMMARY.saveCta}
                  </button>
                  <button
                    type="button"
                    className={styles.miniBtn}
                    onClick={() => {
                      setConcernDraft(summary.mainConcern);
                      setEditingConcern(false);
                    }}
                  >
                    {SUMMARY.cancelCta}
                  </button>
                </div>
              </>
            ) : (
              <p className={styles.concern}>{summary.mainConcern}</p>
            )}

            {clearerNotice ? <p className={styles.sectionNote}>{SUMMARY.clearerNotice}</p> : null}

            <div className={styles.panelActions} style={{ padding: "14px 0 0" }}>
              {!editingConcern ? (
                <button
                  type="button"
                  className={styles.miniBtn}
                  onClick={() => {
                    setConcernDraft(summary.mainConcern);
                    setEditingConcern(true);
                  }}
                >
                  <PencilIcon size={13} />
                  {SUMMARY.editSectionCta}
                </button>
              ) : null}
              <button type="button" className={styles.miniBtn} onClick={onMakeClearer}>
                <SparkIcon size={13} />
                {SUMMARY.makeClearerCta}
              </button>
              {summary.editedByUser ? (
                <button type="button" className={styles.miniBtn} onClick={onRestoreOriginal}>
                  {SUMMARY.restoreOriginalCta}
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* 2. Timeline */}
      {!removed("timeline") ? (
        <section className={styles.panel} aria-labelledby="s4-timeline-heading">
          <div className={styles.panelHead}>
            <TimelineIcon size={17} />
            <h2 className={styles.panelTitle} id="s4-timeline-heading">
              {SUMMARY.timelineHeading}
            </h2>
            <span className={styles.panelCount}>{summary.timeline.length}</span>
            <button
              type="button"
              className={styles.qBtn}
              onClick={() => onToggleSection("timeline")}
              aria-label={`${SUMMARY.removeSectionCta}: ${SUMMARY.timelineHeading}`}
            >
              <TrashIcon size={13} />
            </button>
          </div>
          <div className={styles.panelBody}>
            {summary.timeline.length === 0 ? (
              <p className={styles.absent}>No timeline entries were included.</p>
            ) : (
              <ol className={styles.tl}>
                {summary.timeline.map((item) => (
                  <li key={item.eventId} className={styles.tlItem}>
                    <span className={styles.tlDot} aria-hidden="true" />
                    <p className={styles.tlPeriod}>{item.dateText}</p>
                    <p className={styles.tlText}>{item.description}</p>
                    <ViewSource onClick={() => onViewSource(item.description, item.sourceEventIds)} />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      ) : null}

      {/* 3. Changes reported */}
      {!removed("changes") ? (
        <section className={styles.panel} aria-labelledby="s4-changes-heading">
          <div className={styles.panelHead}>
            <PlusTrendIcon size={17} />
            <h2 className={styles.panelTitle} id="s4-changes-heading">
              {SUMMARY.changesHeading}
            </h2>
            <span className={styles.panelCount}>{summary.reportedChanges.length}</span>
            <button
              type="button"
              className={styles.qBtn}
              onClick={() => onToggleSection("changes")}
              aria-label={`${SUMMARY.removeSectionCta}: ${SUMMARY.changesHeading}`}
            >
              <TrashIcon size={13} />
            </button>
          </div>
          <div className={styles.panelBody}>
            {summary.reportedChanges.length === 0 ? (
              <p className={styles.absent}>No change was reported in the information you provided.</p>
            ) : (
              summary.reportedChanges.map((change) => (
                <div key={change.id} className={styles.changeRow}>
                  <div className={styles.changeTop}>
                    <span className={styles.changeCat}>{change.category}</span>
                    <span className={styles.ba}>
                      <span className={styles.pillBefore}>{change.before}</span>
                      <span className={styles.arrow} aria-hidden="true">
                        →
                      </span>
                      <span className={styles.pillAfter}>{change.after}</span>
                    </span>
                  </div>
                  <p className={styles.changeDesc}>{change.description}</p>
                  <ViewSource onClick={() => onViewSource(`${change.category}: ${change.before} → ${change.after}`, change.sourceEventIds)} />
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {/* 4. Other information */}
      {!removed("other") ? (
        <section className={styles.panel} aria-labelledby="s4-other-heading">
          <div className={styles.panelHead}>
            <DocumentIcon size={17} />
            <h2 className={styles.panelTitle} id="s4-other-heading">
              {SUMMARY.otherHeading}
            </h2>
            {summary.otherInformation.length > 0 ? (
              <span className={styles.panelCount}>{summary.otherInformation.length}</span>
            ) : null}
            <button
              type="button"
              className={styles.qBtn}
              onClick={() => onToggleSection("other")}
              aria-label={`${SUMMARY.removeSectionCta}: ${SUMMARY.otherHeading}`}
            >
              <TrashIcon size={13} />
            </button>
          </div>
          <div className={styles.panelBody}>
            {summary.otherInformation.length === 0 ? (
              <p className={styles.absent}>
                No medications, treatments, tests, appointments or lifestyle details were mentioned.
              </p>
            ) : (
              <div className={styles.infoList}>
                {summary.otherInformation.map((item) => (
                  <div key={item.id} className={styles.infoItem}>
                    <div className={styles.infoTop}>
                      <span className={styles.infoLabel}>{item.label}</span>
                      {item.timeText ? <span className={styles.infoTime}>{item.timeText}</span> : null}
                    </div>
                    <p className={item.detail === "None reported." ? styles.noneReported : styles.infoDetail}>
                      {item.detail === "None reported." ? "None reported" : item.detail}
                    </p>
                    {item.sourceEventIds.length > 0 ? (
                      <ViewSource onClick={() => onViewSource(item.detail, item.sourceEventIds)} />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* 5. Notes added by the user */}
      <section className={styles.panel} aria-labelledby="s4-notes-heading">
        <div className={styles.panelHead}>
          <QuoteIcon size={16} />
          <h2 className={styles.panelTitle} id="s4-notes-heading">
            {SUMMARY.notesHeading}
          </h2>
        </div>
        <div className={styles.panelBody}>
          {summary.notes.length > 0 ? (
            <ul className={styles.infoList}>
              {summary.notes.map((note, i) => (
                <li key={`${note}-${i}`} className={styles.infoItem}>
                  <p className={styles.infoDetail}>{note}</p>
                  <button type="button" className={styles.qBtn} onClick={() => onRemoveNote(i)}>
                    <TrashIcon size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                    {SUMMARY.removeQuestionCta}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.absent}>No notes added.</p>
          )}

          <div className={styles.addQ}>
            {addingNote ? (
              <div className={styles.addQForm}>
                <label htmlFor="s4-note" className="sr-only">
                  Add a note to your summary
                </label>
                <textarea
                  id="s4-note"
                  className={styles.qEditor}
                  rows={2}
                  value={noteDraft}
                  placeholder="Add a note to your summary…"
                  onChange={(e) => setNoteDraft(e.target.value)}
                />
                <div className={styles.addQActions}>
                  <button
                    type="button"
                    className={`${styles.miniBtn} ${styles.miniBtnPrimary}`}
                    onClick={() => {
                      if (noteDraft.trim()) onAddNote(noteDraft.trim());
                      setNoteDraft("");
                      setAddingNote(false);
                    }}
                  >
                    <CheckIcon size={13} />
                    {SUMMARY.saveCta}
                  </button>
                  <button
                    type="button"
                    className={styles.miniBtn}
                    onClick={() => {
                      setNoteDraft("");
                      setAddingNote(false);
                    }}
                  >
                    {SUMMARY.cancelCta}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className={styles.addQBtn} onClick={() => setAddingNote(true)}>
                <PlusIcon size={14} />
                Add a note
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 6. Information not provided */}
      {!removed("missing") ? (
        <section className={styles.panel} aria-labelledby="s4-missing-heading">
          <div className={styles.panelHead}>
            <AlertIcon size={17} />
            <h2 className={styles.panelTitle} id="s4-missing-heading">
              {SUMMARY.missingHeading}
            </h2>
            <span className={styles.panelCount}>{summary.missingInformation.length}</span>
            <button
              type="button"
              className={styles.qBtn}
              onClick={() => onToggleSection("missing")}
              aria-label={`${SUMMARY.removeSectionCta}: ${SUMMARY.missingHeading}`}
            >
              <TrashIcon size={13} />
            </button>
          </div>
          <div className={styles.panelBody}>
            {summary.missingInformation.length === 0 ? (
              <p className={styles.absent}>No gaps were identified in the information you provided.</p>
            ) : (
              <div className={styles.gapList}>
                {summary.missingInformation.map((gap, i) => (
                  <p key={`${gap}-${i}`} className={styles.gapItem}>
                    <AlertIcon size={15} />
                    <span>{gap}</span>
                  </p>
                ))}
              </div>
            )}
            <p className={styles.sectionNote}>
              Missing information is shown as <strong>not provided</strong> — never as a normal or negative finding.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
