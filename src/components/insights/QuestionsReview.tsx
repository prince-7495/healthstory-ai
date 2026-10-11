"use client";

import { useState } from "react";
import { INSIGHTS_OPTIONS } from "@/lib/insights/options";
import type {
  CompletenessCategory,
  ConflictItem,
  InformationGap,
  StoryCompleteness,
  StoryConsistency,
  UnclearItem,
} from "@/lib/insights/types";
import type { StoryJournalEntry, StoryQuestion } from "@/lib/journal/types";
import type { AnalyzedEvent } from "@/lib/health/types";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  QuestionIcon,
  TrashIcon,
} from "../icons";
import styles from "./insights.module.css";

type CompletionItems = {
  completeness: StoryCompleteness;
};

type Props = CompletionItems & {
  gaps: InformationGap[];
  handledGapIds: string[];
  consistency: StoryConsistency;
  handledDupIds: string[];
  unclearItems: UnclearItem[];
  questions: StoryQuestion[];
  demoMode: boolean;
  entries: StoryJournalEntry[];
  events: AnalyzedEvent[];
  onResolveGap: (id: string) => void;
  onAddDate: (eventRefId: string, iso: string) => void;
  onConfirmEvent: (eventRefId: string) => void;
  onDiscussedQuestion: (id: string) => void;
  onRemoveQuestion: (id: string) => void;
  onGoToUnderstand: () => void;
  onResolveDup: (id: string, action: "MERGED" | "KEPT_SEPARATE" | "DISMISSED") => void;
  onResolveConflict: (id: string) => void;
};

function completenessCategoryLabel(category: CompletenessCategory): string {
  return INSIGHTS_OPTIONS.completeness.levels[category];
}

function gapActionLabel(action: InformationGap["actions"][number]): string {
  const o = INSIGHTS_OPTIONS.gaps;
  switch (action) {
    case "add_date": return o.addDate;
    case "keep_approximate": return o.keepApproximate;
    case "ignore": return o.ignore;
    case "leave_as_is": return o.leaveAsIs;
    case "not_sure": return o.notSure;
    case "review": return o.review;
    case "confirm": return o.confirm;
    case "mark_discussed": return o.markDiscussed;
    default: return action;
  }
}

/**
 * QuestionsReview — the "Questions & Review" tab.
 * Open questions, information to review (gaps), possible duplicates,
 * conflicts, and story completeness. Nothing forces completion.
 */

/** Find the verbatim source wording behind a duplicate candidate event. */
function entryTextFor(
  eventId: string,
  entries: StoryJournalEntry[],
  events: AnalyzedEvent[],
): string {
  const entry = entries.find((en) => en.extractedEventIds.includes(eventId));
  if (entry) return entry.content || "…";
  const ev = events.find((e) => e.id === eventId);
  return ev?.sourceText || ev?.description || "…";
}
export default function QuestionsReview({
  completeness,
  gaps,
  handledGapIds,
  consistency,
  handledDupIds,
  unclearItems,
  questions,
  demoMode,
  entries,
  events,
  onResolveGap,
  onAddDate,
  onConfirmEvent,
  onDiscussedQuestion,
  onRemoveQuestion,
  onGoToUnderstand,
  onResolveDup,
  onResolveConflict,
}: Props) {
  const o = INSIGHTS_OPTIONS;
  const [dateInputs, setDateInputs] = useState<Record<string, string>>({});
  const [compareKey, setCompareKey] = useState<string | null>(null);
  const [showUnclear, setShowUnclear] = useState(false);
  const [confirmedUnclear, setConfirmedUnclear] = useState<string[]>([]);

  const openQuestions = questions.filter((q) => q.status === "OPEN");
  const discussedQuestions = questions.filter((q) => q.status === "DISCUSSED");
  const visibleGaps = gaps.filter((g) => !handledGapIds.includes(g.id));
  const visibleDups = consistency.duplicates.filter((d) => !handledDupIds.includes(d.id));
  const openConflicts = consistency.conflicts.filter((c) => c.status === "OPEN");

  const handleGap = (gap: InformationGap) => {
    if (gap.actions.includes("add_date")) {
      setDateInputs((prev) => ({ ...prev, [gap.id]: dateInputs[gap.id] ?? "" }));
      return;
    }
    if (gap.type === "UNCONFIRMED_EVENT" && gap.targetRefId) {
      onConfirmEvent(gap.targetRefId);
      return;
    }
    if (gap.type === "UNLINKED_DOCUMENT") {
      onGoToUnderstand();
      return;
    }
    onResolveGap(gap.id);
  };

  const commitDate = (gap: InformationGap) => {
    const value = dateInputs[gap.id];
    if (!value || !gap.targetRefId) return;
    onAddDate(gap.targetRefId, value);
    onResolveGap(gap.id);
  };

  const handleUnclearReview = (item: UnclearItem) => {
    if (item.action === "review") {
      setConfirmedUnclear((prev) => [...prev, item.id]);
    } else if (item.action === "link") {
      onGoToUnderstand();
    }
  };

  return (
    <div className={styles.layout}>
      <div className={styles.col}>
        <section className={styles.panel} aria-labelledby="rr-questions">
          <div className={styles.panelHead}>
            <QuestionIcon size={16} />
            <h3 className={styles.panelTitle} id="rr-questions">{o.questions.heading}</h3>
            <span className={styles.panelCount}>{openQuestions.length}</span>
          </div>
          <div className={styles.panelBody}>
            {openQuestions.length === 0 ? (
              <p className={styles.sub}>{o.questions.empty}</p>
            ) : (
              openQuestions.map((q) => (
                <div key={q.id} className={styles.qRow}>
                  <p className={styles.qText}>{q.text}</p>
                  <div className={styles.qMeta}>
                    <span>
                      {q.source === "USER" ? o.questions.addedByUser : o.questions.addedByAi}
                    </span>
                    <span>
                      {o.questions.dateLabel}: {q.createdAt.slice(0, 10)}
                    </span>
                    <span className={styles.qStatusBadge} data-status="OPEN">Open</span>
                  </div>
                  <div className={`${styles.row} ${styles.qActions}`}>
                    <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={() => onDiscussedQuestion(q.id)}>
                      <CheckIcon size={13} />
                      {o.questions.markDiscussed}
                    </button>
                    <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`} onClick={() => onRemoveQuestion(q.id)}>
                      <TrashIcon size={13} />
                      {o.questions.remove}
                    </button>
                  </div>
                </div>
              ))
            )}
            {discussedQuestions.length > 0 ? (
              <p className={styles.note}>
                {discussedQuestions.length} question{discussedQuestions.length === 1 ? "" : "s"} marked as discussed. You control the status — it is not assumed.
              </p>
            ) : null}
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="rr-duplicates">
          <div className={styles.panelHead}>
            <AlertIcon size={16} />
            <h3 className={styles.panelTitle} id="rr-duplicates">{o.consistency.heading}</h3>
          </div>
          <div className={styles.panelBody}>
            <p className={styles.sub}>{o.consistency.sub}</p>

            <h4 className={styles.key} style={{ marginTop: 14 }}>{o.consistency.possibleDuplicate}</h4>
            {visibleDups.length === 0 ? (
              <p className={styles.sub}>{o.consistency.emptyDuplicates}</p>
            ) : (
              visibleDups.map((dup) => {
                const sourceA = entryTextFor(dup.eventAId, entries, events);
                const sourceB = entryTextFor(dup.eventBId, entries, events);
                return (
                  <div key={dup.id} className={styles.dupCard}>
                    <p className={styles.dupTitle}>
                      Possible duplicate · {dup.degree.toLowerCase()} similarity
                    </p>
                    {compareKey === dup.id ? (
                      <div className={styles.dupEvidence}>
                        <p className={styles.dupE}>Entry A: “{sourceA}”</p>
                        <p className={styles.dupE}>Entry B: “{sourceB}”</p>
                      </div>
                    ) : (
                      <p className={styles.note}>
                        Two of your entries share the same recorded topic label. Original sources stay untouched.
                      </p>
                    )}
                    <div className={styles.row} style={{ marginTop: 10 }}>
                      <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => setCompareKey((k) => (k === dup.id ? null : dup.id))}>
                        {o.consistency.compare}
                      </button>
                      <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={() => onResolveDup(dup.id, "MERGED")}>
                        {o.consistency.merge}
                      </button>
                      <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => onResolveDup(dup.id, "KEPT_SEPARATE")}>
                        {o.consistency.keepSeparate}
                      </button>
                      <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => onResolveDup(dup.id, "DISMISSED")}>
                        {o.consistency.dismiss}
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            <h4 className={styles.key} style={{ marginTop: 16 }}>{o.consistency.conflictHeading}</h4>
            {openConflicts.length === 0 ? (
              <p className={styles.sub}>{o.consistency.emptyConflicts}</p>
            ) : (
              openConflicts.map((conflict: ConflictItem) => (
                <div key={conflict.id} className={styles.conflictCard}>
                  <p className={styles.conflictTitle}>{conflict.title}</p>
                  <p className={styles.sub} style={{ marginTop: 4 }}>{conflict.message}</p>
                  <div className={styles.dupEvidence}>
                    <p className={styles.dupE}>Earlier: “{conflict.evidenceA}”</p>
                    <p className={styles.dupE}>Later: “{conflict.evidenceB}”</p>
                  </div>
                  <div className={styles.row} style={{ marginTop: 10 }}>
                    <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={() => onResolveConflict(conflict.id)}>
                      <CheckIcon size={13} />
                      Keep Separate
                    </button>
                  </div>
                </div>
              ))
            )}

            {consistency.unlinkedDocumentIds.length > 0 ? (
              <>
                <h4 className={styles.key} style={{ marginTop: 16 }}>{o.consistency.unlinkedHeading}</h4>
                <p className={styles.sub}>{o.consistency.unlinkedBody}</p>
                <div className={styles.row} style={{ marginTop: 8 }}>
                  <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onGoToUnderstand}>
                    Understand Documents
                    <ArrowRightIcon size={13} />
                  </button>
                </div>
              </>
            ) : null}

            {consistency.outdatedSummaries ? (
              <p className={styles.note} style={{ marginTop: 12 }}>
                {o.consistency.outdatedSummary}
              </p>
            ) : null}
            {consistency.unconfirmedEventIds.length > 0 ? (
              <p className={styles.note} style={{ marginTop: 8 }}>
                {o.consistency.unconfirmedNote}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <div className={styles.col}>
        <section className={styles.panel} aria-labelledby="rr-gaps">
          <div className={styles.panelHead}>
            <AlertIcon size={16} />
            <h3 className={styles.panelTitle} id="rr-gaps">{o.gaps.heading}</h3>
            <span className={styles.panelCount}>{visibleGaps.length}</span>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
              onClick={() => setShowUnclear((s) => !s)}
              style={{ marginLeft: "auto" }}
            >
              <QuestionIcon size={13} />
              {o.unclear.trigger}
            </button>
          </div>
          <div className={styles.panelBody}>
            <p className={styles.sub}>{o.gaps.sub}</p>
            {visibleGaps.length === 0 ? (
              <p className={styles.sub} style={{ marginTop: 10 }}>{o.gaps.empty}</p>
            ) : (
              visibleGaps.map((gap) => (
                <div key={gap.id} className={styles.gapCard}>
                  <p className={styles.gapTitle}>
                    {o.gaps.types[gap.type]}
                    {gap.targetRefId ? <span style={{ fontWeight: 500, color: "#a08030" }}> · {gap.targetRefId.slice(0, 18)}</span> : null}
                  </p>
                  <p className={styles.gapMessage}>{gap.message}</p>

                  {dateInputs[gap.id] !== undefined && gap.actions.includes("add_date") ? (
                    <div className={styles.row} style={{ marginTop: 8 }}>
                      <label className={styles.sub} htmlFor={`date-${gap.id}`}>Date</label>
                      <input
                        id={`date-${gap.id}`}
                        type="date"
                        className={styles.gapDateInput}
                        value={dateInputs[gap.id]}
                        onChange={(e) => setDateInputs((prev) => ({ ...prev, [gap.id]: e.target.value }))}
                      />
                      <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={() => commitDate(gap)}>
                        <CheckIcon size={13} />
                        {o.gaps.addDate}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.gapActions}>
                      {gap.actions.map((action) => (
                        <button
                          key={action}
                          type="button"
                          className={`${styles.btn} ${styles.btnSm} ${
                            action === "add_date" || action === "keep_approximate" ? styles.btnPrimary : styles.btnGhost
                          }`}
                          onClick={() => handleGap(gap)}
                        >
                          {gapActionLabel(action)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {unclearItems.length > 0 && (
          <section className={styles.panel} aria-labelledby="rr-unclear">
            <div className={styles.panelHead}>
              <QuestionIcon size={16} />
              <h3 className={styles.panelTitle} id="rr-unclear">{o.unclear.heading}</h3>
            </div>
            <div className={styles.panelBody}>
              {showUnclear ? (
                unclearItems.map((item) => (
                  <div key={item.id} className={styles.gapCard}>
                    <p className={styles.gapTitle}>
                      {item.message}
                    </p>
                    {confirmedUnclear.includes(item.id) ? (
                      <span className={styles.confirmedBadge}>{o.unclear.confirmed}</span>
                    ) : (
                      <div className={styles.gapActions}>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                          onClick={() => handleUnclearReview(item)}
                        >
                          {o.unclear.review}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => setShowUnclear(true)}
                >
                  {o.unclear.trigger}
                </button>
              )}
            </div>
          </section>
        )}

        <section className={styles.panel} aria-labelledby="rr-completeness">
          <div className={styles.panelHead}>
            <CheckIcon size={16} />
            <h3 className={styles.panelTitle} id="rr-completeness">{o.completeness.heading}</h3>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.completeness}>
              <span className={styles.completenessBadge} data-cat={completeness.category}>
                {completenessCategoryLabel(completeness.category)}
              </span>
            </div>
            <p className={styles.completenessLine} style={{ marginTop: 10 }}>
              {completeness.line}
            </p>
            <p className={styles.note}>
              {o.completeness.sub} {o.completeness.notHealth}
            </p>
            <p className={styles.note}>{o.completeness.noScores}</p>
            {demoMode ? (
              <p className={`${styles.badge} ${styles.badgeWarn}`} style={{ marginTop: 10 }}>
                {o.demoLabel}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}