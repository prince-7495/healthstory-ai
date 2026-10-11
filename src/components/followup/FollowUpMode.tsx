"use client";

import { useMemo, useState } from "react";
import { FOLLOWUP } from "@/lib/followup/options";
import {
  FOLLOWUP_TYPE_LABELS,
  SOURCE_LABELS,
  type FollowUpEntry,
  type StoryJournal,
} from "@/lib/journal/types";
import {
  applyFollowUp,
  createSnapshotFromFollowUp,
  filterFollowUps,
  followUpSummary,
  processFollowUp,
  type FollowUpDecisions,
  type FollowUpDraft,
  type FollowUpInput,
  type FollowUpStage,
} from "@/lib/followup/engine";
import { shortLabel } from "@/lib/health/dates";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  LockIcon,
  PlusIcon,
  QuoteIcon,
  SparkIcon,
  TimelineIcon,
} from "../icons";
import FollowUpForm from "./FollowUpForm";
import FollowUpReview from "./FollowUpReview";
import styles from "./followup.module.css";

type Phase = "home" | "add" | "review" | "detail";

type Props = {
  journal: StoryJournal;
  onUpdateJournal: (journal: StoryJournal) => void;
  onExit: () => void;
};

function formatWhen(iso?: string): string {
  if (!iso) return "Date not recorded";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/**
 * FollowUpMode — Stage 7 orchestrator.
 *
 * Add a follow-up → organize → review/confirm → carry it into the story.
 * Everything is reviewed before it becomes part of the confirmed story.
 */
export default function FollowUpMode({ journal, onUpdateJournal, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>("home");
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<FollowUpStage | null>(null);
  const [draft, setDraft] = useState<FollowUpDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [applied, setApplied] = useState<{ entry: FollowUpEntry; added: number; changes: number; questions: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<FollowUpEntry["type"][]>([]);
  const [range, setRange] = useState<"all" | "30d" | "3m" | "6m">("all");

  const followUps = useMemo(() => journal.followUps ?? [], [journal.followUps]);
  const filtered = useMemo(() => filterFollowUps(followUps, { query, types, range }), [followUps, query, types, range]);
  const timelineEvents = useMemo(
    () =>
      [...journal.events]
        .filter((e) => e.status !== "REMOVED" && e.date)
        .sort((a, b) => (a.date! < b.date! ? -1 : 1))
        .slice(-8),
    [journal.events],
  );
  const openQuestions = (journal.questions ?? []).filter((q) => q.status === "OPEN").length;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  async function organize(input: FollowUpInput) {
    setProcessing(true);
    setError(null);
    setStage(null);
    try {
      const result = await processFollowUp(journal, input, { onStage: setStage });
      setDraft(result);
      setPhase("review");
    } catch {
      setError("We couldn't organize that follow-up. Your words are still here — you can try again.");
    } finally {
      setProcessing(false);
      setStage(null);
    }
  }

  function apply(decisions: FollowUpDecisions) {
    if (!draft) return;
    const next = applyFollowUp(journal, draft, decisions, new Date());
    const addedEvents = next.events.length - journal.events.length;
    const changes = (next.evolutions.length - journal.evolutions.length);
    const questions = (next.questions?.length ?? 0) - (journal.questions?.length ?? 0);
    onUpdateJournal(next);
    setApplied({ entry: draft.entry, added: addedEvents, changes, questions: Math.max(questions, 0) });
    setDraft(null);
    setPhase("home");
    notify(FOLLOWUP.updatedHeading);
  }

  function saveSnapshot() {
    const name = applied?.entry.eventDate ? `After ${formatWhen(applied.entry.eventDate)}` : "";
    onUpdateJournal(createSnapshotFromFollowUp(journal, name));
    notify("Snapshot saved.");
  }

  const detail = detailId ? followUps.find((f) => f.id === detailId) ?? null : null;

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.badgeRow}>
          <span className={styles.badge}>
            <SparkIcon size={14} />
            {FOLLOWUP.featureName}
          </span>
          <span className={`${styles.badge} ${styles.badgeGhost}`}>{FOLLOWUP.promise}</span>
          {journal.preferences.demoMode ? (
            <span className={`${styles.badge} ${styles.badgeWarn}`}>{FOLLOWUP.demoLabel}</span>
          ) : null}
        </div>
        <h1 className={styles.title}>{FOLLOWUP.homeHeading}</h1>
        <p className={styles.lead}>{FOLLOWUP.homeSupporting}</p>
      </header>

      {applied ? (
        <div className={styles.banner} role="status">
          <h2 className={styles.bannerTitle}>{FOLLOWUP.updatedHeading}</h2>
          <p className={styles.bannerSub}>{followUpSummary(applied.entry)}</p>
          <div className={styles.row} style={{ justifyContent: "center", marginTop: 16 }}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={saveSnapshot}>
              {FOLLOWUP.snapshotCta}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onExit}>
              {FOLLOWUP.reviewUpdatedSummaryCta}
            </button>
          </div>
        </div>
      ) : null}

      {phase === "add" ? (
        <FollowUpForm
          processing={processing}
          stage={stage}
          error={error}
          hasEntries={followUps.length > 0}
          onOrganize={organize}
          onCancel={() => setPhase("home")}
        />
      ) : phase === "review" && draft ? (
        <FollowUpReview draft={draft} onApply={apply} onDiscard={() => setPhase("home")} />
      ) : phase === "detail" && detail ? (
        <FollowUpDetail entry={detail} onBack={() => setPhase("home")} />
      ) : (
        <>
          <section className={styles.panel}>
            <div className={styles.panelBody} style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p className={styles.panelTitle}>{FOLLOWUP.homeHeading}</p>
                <p className={styles.sub} style={{ marginTop: 4 }}>Add a follow-up to your HealthStory.</p>
              </div>
              <div className={styles.row}>
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setPhase("add")}>
                  <PlusIcon size={16} />
                  {FOLLOWUP.addCta}
                </button>
                <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setPhase("add")}>
                  {FOLLOWUP.historyCta}
                </button>
              </div>
            </div>
          </section>

          <div className={styles.layout}>
            <div className={styles.col}>
              <section className={styles.panel} aria-labelledby="fu-history-heading">
                <div className={styles.panelHead}>
                  <TimelineIcon size={16} />
                  <h2 className={styles.panelTitle} id="fu-history-heading">{FOLLOWUP.historyHeading}</h2>
                  <span className={styles.panelCount}>{followUps.length}</span>
                </div>
                <div className={styles.panelBody}>
                  <label htmlFor="fu-search" className="sr-only">{FOLLOWUP.searchPlaceholder}</label>
                  <input
                    id="fu-search"
                    type="search"
                    className={styles.input}
                    placeholder={FOLLOWUP.searchPlaceholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />

                  <div style={{ marginTop: 12 }}>
                    <p className={styles.key}>{FOLLOWUP.filterTypesLabel}</p>
                    <div className={styles.row}>
                      {Object.entries(FOLLOWUP_TYPE_LABELS).map(([id, label]) => {
                        const on = types.includes(id as FollowUpEntry["type"]);
                        return (
                          <button
                            key={id}
                            type="button"
                            className={styles.btn + " " + styles.btnSm + " " + (on ? styles.btnPrimary : styles.btnGhost)}
                            aria-pressed={on}
                            onClick={() =>
                              setTypes((prev) =>
                                prev.includes(id as FollowUpEntry["type"])
                                  ? prev.filter((t) => t !== id)
                                  : [...prev, id as FollowUpEntry["type"]],
                              )
                            }
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <p className={styles.key}>{FOLLOWUP.filterRangeLabel}</p>
                    <div className={styles.row}>
                      {FOLLOWUP.rangeOptions.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className={styles.btn + " " + styles.btnSm + " " + (range === r.id ? styles.btnPrimary : styles.btnGhost)}
                          aria-pressed={range === r.id}
                          onClick={() => setRange(r.id)}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    {followUps.length === 0 ? (
                      <p className={styles.sub}>{FOLLOWUP.noHistory}</p>
                    ) : filtered.length === 0 ? (
                      <p className={styles.sub}>{FOLLOWUP.noResults}</p>
                    ) : (
                      filtered.map((f) => (
                        <div key={f.id} className={styles.historyItem}>
                          <div className={styles.historyTop}>
                            <div>
                              <p className={styles.historyDate}>{formatWhen(f.eventDate ?? f.createdAt)}</p>
                              <p className={styles.historyText}>{FOLLOWUP_TYPE_LABELS[f.type]}</p>
                            </div>
                            <button
                              type="button"
                              className={styles.linkBtn}
                              onClick={() => {
                                setDetailId(f.id);
                                setPhase("detail");
                              }}
                            >
                              <EyeIcon size={13} />
                              {FOLLOWUP.viewDetailCta}
                            </button>
                          </div>
                          <p className={styles.historyText} style={{ marginTop: 6 }}>{followUpSummary(f)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <section className={styles.panel} aria-labelledby="fu-timeline-heading">
                <div className={styles.panelHead}>
                  <TimelineIcon size={16} />
                  <h2 className={styles.panelTitle} id="fu-timeline-heading">Story Timeline</h2>
                </div>
                <div className={styles.panelBody}>
                  {timelineEvents.length === 0 ? (
                    <p className={styles.sub}>No dated events yet.</p>
                  ) : (
                    <ol className={styles.timeline}>
                      {timelineEvents.map((e) => {
                        const isFollowUp = followUps.some((f) => f.relatedEventIds.includes(e.id));
                        return (
                          <li key={e.id} className={styles.tlItem} data-followup={isFollowUp}>
                            <span className={styles.tlDot} aria-hidden="true" />
                            <p className={styles.tlDate}>{shortLabel(e.timeLabel)}</p>
                            <p className={styles.tlText}>{e.title}</p>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              </section>
            </div>

            <div className={styles.col}>
              <section className={styles.panel} aria-labelledby="fu-changes-heading">
                <div className={styles.panelHead}>
                  <SparkIcon size={16} />
                  <h2 className={styles.panelTitle} id="fu-changes-heading">Story Changes</h2>
                </div>
                <div className={styles.panelBody}>
                  {applied ? (
                    <div className={styles.storyDiff}>
                      <div>
                        <p className={styles.key}>{FOLLOWUP.addedLabel}</p>
                        <ul className={styles.diffCol}>
                          {applied.added > 0 ? <li>{applied.added} new event{applied.added === 1 ? "" : "s"}</li> : null}
                          {applied.changes > 0 ? <li>{applied.changes} change{applied.changes === 1 ? "" : "s"} recorded</li> : null}
                          {applied.questions > 0 ? <li>{applied.questions} new question{applied.questions === 1 ? "" : "s"}</li> : null}
                        </ul>
                      </div>
                      <div>
                        <p className={styles.key}>{FOLLOWUP.updatedLabel}</p>
                        <ul className={styles.diffCol}>
                          <li>Timeline</li>
                          <li>Recent activity</li>
                          {openQuestions > 0 ? <li>{openQuestions} open question{openQuestions === 1 ? "" : "s"}</li> : null}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <ul className={styles.diffCol}>
                      <li>{followUps.length} follow-up{followUps.length === 1 ? "" : "s"} recorded</li>
                      <li>{openQuestions} open question{openQuestions === 1 ? "" : "s"}</li>
                    </ul>
                  )}
                  <div className={styles.okNote} style={{ marginTop: 12 }}>
                    <CheckIcon size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                    {FOLLOWUP.summaryStale}
                  </div>
                  <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} style={{ marginTop: 10 }} onClick={onExit}>
                    {FOLLOWUP.reviewUpdatedSummaryCta}
                  </button>
                </div>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <LockIcon size={16} />
                  <h2 className={styles.panelTitle}>Safety</h2>
                </div>
                <div className={styles.panelBody}>
                  <p className={styles.disclaimer}>{FOLLOWUP.safetyFooter}</p>
                  <div className={styles.alert} style={{ marginTop: 12 }}>
                    <p className={styles.alertTitle}>
                      <AlertIcon size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                      Emergency boundary
                    </p>
                    <p className={styles.alertText}>{FOLLOWUP.emergencyNotice}</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      {toast ? (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FollowUpDetail({ entry, onBack }: { entry: FollowUpEntry; onBack: () => void }) {
  const byType = (t: FollowUpEntry["extractedItems"][number]["type"]) =>
    entry.extractedItems.filter((i) => i.type === t && i.status !== "DISMISSED");

  return (
    <section className={styles.panel} aria-labelledby="fu-detail-heading">
      <div className={styles.panelHead}>
        <TimelineIcon size={16} />
        <h2 className={styles.panelTitle} id="fu-detail-heading">
          {FOLLOWUP.detailHeading}
        </h2>
        <span className={styles.panelCount}>{FOLLOWUP_TYPE_LABELS[entry.type]}</span>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.row}>
          <span className={`${styles.tag} ${styles.tagType}`}>{FOLLOWUP.detailDate}: {formatWhen(entry.eventDate ?? entry.createdAt)}</span>
          <span className={`${styles.tag} ${styles.tagType}`}>{FOLLOWUP.detailType}: {FOLLOWUP_TYPE_LABELS[entry.type]}</span>
          {entry.who ? <span className={`${styles.tag} ${styles.tagType}`}>{FOLLOWUP.detailWho}: {entry.who}</span> : null}
        </div>

        <div className={styles.evidence} style={{ marginTop: 14 }}>
          <p className={styles.key}>{FOLLOWUP.originalHeading}</p>
          <p className={styles.evidenceQuote}>
            <QuoteIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            &ldquo;{entry.originalText}&rdquo;
          </p>
        </div>

        {(["EVENT", "DATE", "INFORMATION", "CHANGE", "QUESTION"] as const).map((type) => {
          const items = byType(type);
          if (items.length === 0) return null;
          return (
            <div key={type} style={{ marginTop: 16 }}>
              <p className={styles.key}>{type === "EVENT" ? FOLLOWUP.groupNewInfo : type === "INFORMATION" ? FOLLOWUP.groupReceived : type === "CHANGE" ? FOLLOWUP.groupChanges : type === "QUESTION" ? FOLLOWUP.groupQuestions : FOLLOWUP.groupDates}</p>
              {items.map((item) => (
                <div key={item.id} className={styles.item}>
                  <p className={styles.itemText}>{item.text}</p>
                  <div className={styles.itemMeta}>
                    <span className={`${styles.tag} ${item.sourceType === "PROFESSIONAL_CONVERSATION" ? styles.tagProf : styles.tagSource}`}>
                      {SOURCE_LABELS[item.sourceType]}
                    </span>
                    <span className={`${styles.tag} ${styles.tagConfirmed}`}>{item.status.replace("_", " ").toLowerCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        <div className={styles.row} style={{ marginTop: 18 }}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onBack}>
            <ArrowRightIcon size={15} style={{ transform: "rotate(180deg)" }} />
            {FOLLOWUP.cancelCta}
          </button>
        </div>
        <p className={styles.disclaimer} style={{ marginTop: 12 }}>{FOLLOWUP.safetyFooter}</p>
      </div>
    </section>
  );
}
