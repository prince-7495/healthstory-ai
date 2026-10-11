"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SUMMARY } from "@/lib/health/options";
import {
  SECTION_ORDER,
  addNote,
  addQuestion,
  buildHealthSummary,
  diffSummaries,
  generateHealthSummary,
  makeClearer,
  removeNote,
  removeQuestion,
  setMainConcern,
  sourcesFor,
  summarySourceSignature,
  toggleSection,
  updateQuestion,
  type HealthSummary,
  type ResolvedSource,
  type SummaryDiff,
  type SummaryReviewStatus,
  type SummarySectionKey,
  type SummaryStage,
} from "@/lib/health/summary";
import type { AnalyzedEvent, OrganizedStory } from "@/lib/health/types";
import { AlertIcon, ArrowRightIcon, PencilIcon, ShieldIcon, SparkIcon } from "../../icons";
import SummaryPreparing from "./SummaryPreparing";
import SummarySections from "./SummarySections";
import SummarySidePanel from "./SummarySidePanel";
import SummarySourceDrawer from "./SummarySourceDrawer";
import styles from "./summary.module.css";

type Phase = "PREPARING" | "DRAFT" | "ERROR";

type Props = {
  story: OrganizedStory;
  storyText: string;
  events: AnalyzedEvent[];
  isDemo: boolean;
  onBackToTimeline: () => void;
  onEditStory: () => void;
  onStartOver: () => void;
  /** Stage 5 — hand the confirmed story to the longitudinal journal. */
  onContinueToJournal: () => void;
};

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

export default function SummaryExperience({
  story,
  storyText,
  events,
  isDemo,
  onBackToTimeline,
  onEditStory,
  onStartOver,
  onContinueToJournal,
}: Props) {
  const [phase, setPhase] = useState<Phase>("PREPARING");
  const [stage, setStage] = useState<SummaryStage | null>(null);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [original, setOriginal] = useState<HealthSummary | null>(null);
  const [checked, setChecked] = useState<boolean[]>(() => SUMMARY.reviewItems.map(() => false));
  const [selectedSections, setSelectedSections] = useState<SummarySectionKey[]>([...SECTION_ORDER]);
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [drawer, setDrawer] = useState<{ statement: string; sources: ResolvedSource[] } | null>(null);
  const [clearerNotice, setClearerNotice] = useState(false);
  const [changed, setChanged] = useState(false);
  const [pending, setPending] = useState<{ next: HealthSummary; diffs: SummaryDiff[] } | null>(null);

  const sourceSigRef = useRef(summarySourceSignature(events));

  const generate = useCallback(
    async (instant = false, signal?: AbortSignal) => {
      try {
        const result = await generateHealthSummary(
          { story, storyText, events, isDemo, now: new Date() },
          { signal, onStage: setStage, instant },
        );
        if (signal?.aborted) return;
        setSummary(result);
        setOriginal(result);
        setSelectedSections(SECTION_ORDER.filter((k) => !result.removedSections.includes(k)));
        setPhase("DRAFT");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPhase("ERROR");
      }
    },
    [story, storyText, events, isDemo],
  );

  const retry = useCallback(() => {
    setPhase("PREPARING");
    setStage(null);
    void generate(false);
  }, [generate]);

  useEffect(() => {
    const controller = new AbortController();
    // Deferred so the first render commits before generation begins; this
    // also keeps the call out of the synchronous effect body.
    const timer = window.setTimeout(() => {
      void generate(false, controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [generate]);

  // Notice when the underlying confirmed story changes while a summary exists.
  useEffect(() => {
    if (!summary) return;
    if (summarySourceSignature(events) !== sourceSigRef.current) setChanged(true);
  }, [events, summary]);

  /* ---------- editing ---------- */

  function handleSetConcern(value: string) {
    setSummary((prev) => (prev ? setMainConcern(prev, value) : prev));
  }

  function handleClearer() {
    setSummary((prev) => (prev ? setMainConcern(prev, makeClearer(prev.mainConcern)) : prev));
    setClearerNotice(true);
  }

  function handleRestore() {
    if (!original) return;
    setSummary({
      ...original,
      notes: summary?.notes ?? [],
      removedSections: summary?.removedSections ?? [],
      length: summary?.length ?? "standard",
      version: (summary?.version ?? 1) + 1,
    });
    setClearerNotice(false);
  }

  function handleToggleSection(key: SummarySectionKey) {
    setSummary((prev) => (prev ? toggleSection(prev, key) : prev));
  }

  function handleAddQuestion(text: string) {
    setSummary((prev) => (prev ? addQuestion(prev, text) : prev));
  }
  function handleUpdateQuestion(id: string, text: string) {
    setSummary((prev) => (prev ? updateQuestion(prev, id, text) : prev));
  }
  function handleRemoveQuestion(id: string) {
    setSummary((prev) => (prev ? removeQuestion(prev, id) : prev));
  }
  function handleAddNote(note: string) {
    setSummary((prev) => (prev ? addNote(prev, note) : prev));
  }
  function handleRemoveNote(i: number) {
    setSummary((prev) => (prev ? removeNote(prev, i) : prev));
  }

  function applyLength(length: HealthSummary["length"]) {
    setSummary((prev) => {
      if (!prev) return prev;
      const base = buildHealthSummary({ story, storyText, events, isDemo, length, now: new Date() });
      return {
        ...base,
        mainConcern: prev.mainConcern,
        questions: [...base.questions, ...prev.questions.filter((q) => q.origin === "USER_ADDED")],
        notes: prev.notes,
        removedSections: prev.removedSections,
        length,
        editedByUser: true,
        version: prev.version + 1,
      };
    });
  }

  /* ---------- sources ---------- */

  function openSource(statement: string, ids: string[]) {
    setDrawer({ statement, sources: sourcesFor(ids, events) });
  }

  /* ---------- regenerate when the story changed ---------- */

  function requestUpdate() {
    if (!summary) return;
    const next = buildHealthSummary({ story, storyText, events, isDemo, length: summary.length, now: new Date() });
    setPending({ next, diffs: diffSummaries(summary, next) });
  }

  function acceptUpdate() {
    if (!pending || !summary) return;
    setSummary({
      ...pending.next,
      questions: [...pending.next.questions, ...summary.questions.filter((q) => q.origin === "USER_ADDED")],
      notes: summary.notes,
      removedSections: summary.removedSections,
      length: summary.length,
      editedByUser: true,
      version: summary.version + 1,
      reviewStatus: "REQUIRED",
    });
    sourceSigRef.current = summarySourceSignature(events);
    setPending(null);
    setChanged(false);
  }

  function keepCurrent() {
    sourceSigRef.current = summarySourceSignature(events);
    setPending(null);
    setChanged(false);
  }

  /* ---------- derived ---------- */

  const allChecked = checked.length > 0 && checked.every(Boolean);
  const reviewStatus: SummaryReviewStatus = allChecked ? "REVIEWED" : summary?.reviewStatus ?? "REQUIRED";
  const pendingCount = events.filter((e) => e.status === "AI_ORGANIZED").length;
  const edited = Boolean(summary?.editedByUser) || (original ? summary?.version !== original.version : false);
  const selectedForShare = selectedSections.filter((k) => !(summary?.removedSections ?? []).includes(k));

  /* ---------- render ---------- */

  return (
    <div className={styles.shell} data-phase={phase}>
      <div className="container">
        {phase === "PREPARING" ? (
          <SummaryPreparing current={stage} isDemo={isDemo} />
        ) : phase === "ERROR" ? (
          <div className={styles.errorBox}>
            <div className={styles.errorIcon} aria-hidden="true">
              <AlertIcon size={26} />
            </div>
            <h1 className={styles.title}>{SUMMARY.errorHeading}</h1>
            <p className={styles.lead}>{SUMMARY.errorBody}</p>
            <div className={styles.errorActions}>
              <button type="button" className="btn btn--primary" onClick={retry}>
                {SUMMARY.tryAgainCta}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onBackToTimeline}>
                {SUMMARY.viewTimelineCta}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onBackToTimeline}>
                {SUMMARY.createManuallyCta}
              </button>
            </div>
          </div>
        ) : summary ? (
          <div className={styles.page}>
            <header className={styles.head}>
              <h1 className={styles.title}>{SUMMARY.heading}</h1>
              <p className={styles.lead}>{SUMMARY.supporting}</p>
              <div className={styles.badgeRow}>
                <span className={styles.badge}>
                  <ShieldIcon size={14} />
                  {SUMMARY.safetyBadge}
                </span>
                <span className={styles.badgeGhost + " " + styles.badge}>
                  {SUMMARY.versionLabel} v{summary.version} ·{" "}
                  {edited
                    ? SUMMARY.editedBadge
                    : isDemo
                      ? SUMMARY.demoGenerated
                      : SUMMARY.organisedLabel}
                </span>
                {isDemo ? (
                  <span className={`${styles.badge} ${styles.badgeGhost}`}>Fictional demo data</span>
                ) : null}
              </div>
              <p className={styles.engineNote}>
                <SparkIcon size={16} />
                <span>
                  <strong>{summary.engine.label}.</strong> {summary.engine.description}
                </span>
              </p>
            </header>

            {changed ? (
              <div className={styles.changedBanner} role="status">
                <div>
                  <p className={styles.changedTitle}>{SUMMARY.regenerateHeading}</p>
                  <p className={styles.changedBody}>{SUMMARY.regenerateBody}</p>
                </div>
                <button type="button" className="btn btn--primary" onClick={requestUpdate}>
                  {SUMMARY.updateSummaryCta}
                </button>
              </div>
            ) : null}

            <div className={styles.grid}>
              <SummarySections
                summary={summary}
                onSetConcern={handleSetConcern}
                onToggleSection={handleToggleSection}
                onViewSource={openSource}
                onAddNote={handleAddNote}
                onRemoveNote={handleRemoveNote}
                onRestoreOriginal={handleRestore}
                onMakeClearer={handleClearer}
                clearerNotice={clearerNotice}
              />

              <SummarySidePanel
                summary={summary}
                events={events}
                reviewStatus={reviewStatus}
                checked={checked}
                onToggleCheck={(i, v) =>
                  setChecked((prev) => prev.map((c, idx) => (idx === i ? v : c)))
                }
                selectedSections={selectedForShare}
                onToggleSection={(key) =>
                  setSelectedSections((prev) =>
                    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
                  )
                }
                includeEvidence={includeEvidence}
                onToggleEvidence={setIncludeEvidence}
                showPreview={showPreview}
                setShowPreview={setShowPreview}
                onAddQuestion={handleAddQuestion}
                onUpdateQuestion={handleUpdateQuestion}
                onRemoveQuestion={handleRemoveQuestion}
                onViewSource={openSource}
                pendingCount={pendingCount}
              />
            </div>

            {/* Length control sits with the document controls */}
            <section className={styles.panel} style={{ marginTop: 24 }} aria-labelledby="s4-length-heading">
              <div className={styles.panelHead}>
                <SparkIcon size={16} />
                <h2 className={styles.panelTitle} id="s4-length-heading">
                  {SUMMARY.lengthHeading}
                </h2>
              </div>
              <div className={styles.panelBody}>
                <div className={styles.shareActions} style={{ marginTop: 0 }}>
                  {SUMMARY.lengthOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`${styles.miniBtn} ${summary.length === opt.id ? styles.miniBtnPrimary : ""}`}
                      aria-pressed={summary.length === opt.id}
                      onClick={() => applyLength(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className={styles.sectionNote}>
                  {SUMMARY.lengthOptions.find((o) => o.id === summary.length)?.hint}
                </p>
              </div>
            </section>

            <div className={styles.final}>
              <h2 className={styles.finalTitle}>{SUMMARY.finalHeading}</h2>
              <p className={styles.finalText}>{SUMMARY.finalSupporting}</p>
              <div className={styles.finalActions}>
                <button
                  type="button"
                  className="btn btn--light"
                  onClick={() => {
                    scrollToId("s4-review");
                  }}
                >
                  {SUMMARY.reviewSummaryCta}
                  <ArrowRightIcon size={18} className="btn__arrow" />
                </button>
                <button
                  type="button"
                  className="btn btn--onDark"
                  disabled={!allChecked}
                  aria-disabled={!allChecked}
                  onClick={() => {
                    setShowPreview(true);
                    scrollToId("s4-share");
                  }}
                >
                  {SUMMARY.exportCta}
                </button>
                <button type="button" className="btn btn--onDark" onClick={onEditStory}>
                  <PencilIcon size={15} />
                  {SUMMARY.editStoryCta}
                </button>
                <button type="button" className="btn btn--onDark" onClick={onContinueToJournal}>
                  Continue in My Story
                  <ArrowRightIcon size={18} className="btn__arrow" />
                </button>
              </div>
              <p className={styles.finalSafety}>{SUMMARY.finalSafety}</p>
            </div>

            <div className={styles.actions}>
              <button type="button" className="btn btn--ghost" onClick={onBackToTimeline}>
                ← {SUMMARY.viewTimelineCta}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onStartOver}>
                {SUMMARY.startOverCta}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {drawer ? (
        <SummarySourceDrawer
          statement={drawer.statement}
          sources={drawer.sources}
          onClose={() => setDrawer(null)}
        />
      ) : null}

      {pending ? (
        <>
          <div className={styles.overlay} onClick={keepCurrent} aria-hidden="true" />
          <div className={styles.drawer} role="dialog" aria-modal="true" aria-label={SUMMARY.diffHeading}>
            <div className={styles.drawerHead}>
              <h2 className={styles.drawerTitle}>{SUMMARY.diffHeading}</h2>
            </div>
            <div className={styles.drawerBody}>
              {pending.diffs.length === 0 ? (
                <p className={styles.absent}>No visible changes to the summary were identified.</p>
              ) : (
                pending.diffs.map((d, i) => (
                  <div key={`${d.label}-${i}`} className={styles.diffCard}>
                    <p className={styles.diffKey}>{d.label}</p>
                    <div className={styles.diffPair}>
                      <div>
                        <p className={styles.diffKey}>{SUMMARY.diffPreviousLabel}</p>
                        <p className={styles.diffPrev}>{d.previous}</p>
                      </div>
                      <div>
                        <p className={styles.diffKey}>{SUMMARY.diffUpdatedLabel}</p>
                        <p className={styles.diffNew}>{d.updated}</p>
                      </div>
                    </div>
                    {d.derivedFromTimeline ? (
                      <p className={styles.sectionNote}>{SUMMARY.diffFromTimeline}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            <div className={styles.drawerFoot} style={{ gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className={styles.miniBtn} onClick={keepCurrent}>
                {SUMMARY.keepCurrentCta}
              </button>
              <button type="button" className={`${styles.miniBtn} ${styles.miniBtnPrimary}`} onClick={acceptUpdate}>
                {SUMMARY.acceptUpdateCta}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
