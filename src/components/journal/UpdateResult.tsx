"use client";

import { useState } from "react";
import { JOURNAL } from "@/lib/journal/options";
import {
  EVOLUTION_STATUS_LABELS,
  EVOLUTION_TYPE_LABELS,
  type EvolutionStatus,
  type StoryEvolution,
  type UpdateAnalysis,
} from "@/lib/journal/types";
import {
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  EyeIcon,
  InfoIcon,
  PencilIcon,
  QuoteIcon,
  SparkIcon,
} from "../icons";
import styles from "./journal.module.css";

export interface UpdateDecisions {
  status: Record<string, EvolutionStatus>;
  /** correction id -> "replace" | "keep" */
  correction: Record<string, "replace" | "keep">;
  /** existing topic id -> merge the suggested new topic into it. */
  merge: Record<string, boolean>;
}

type Props = {
  analysis: UpdateAnalysis;
  onApply: (decisions: UpdateDecisions) => void;
  onDiscard: () => void;
};

function EvolutionCard({
  evolution,
  status,
  onStatus,
  onEdit,
}: {
  evolution: StoryEvolution;
  status: EvolutionStatus;
  onStatus: (status: EvolutionStatus) => void;
  onEdit: (updates: { previousValue?: string; currentValue?: string }) => void;
}) {
  const [evidence, setEvidence] = useState(false);
  const [editing, setEditing] = useState(false);
  const [prev, setPrev] = useState(evolution.previousValue ?? "");
  const [curr, setCurr] = useState(evolution.currentValue ?? "");

  const hasEvidence = Boolean(evolution.previousSourceText || evolution.currentSourceText);

  return (
    <div className={styles.evoCard} data-status={status}>
      <div className={styles.evoTop}>
        <span className={styles.evoCat}>{evolution.category}</span>
        <span className={styles.statusPill} data-status={status}>
          {EVOLUTION_STATUS_LABELS[status]}
        </span>
        <span className={styles.srcBadge}>
          <QuoteIcon size={12} />
          {JOURNAL.basedOnEntries}
        </span>
      </div>

      <div className={styles.evoBA}>
        <div className={styles.baCol}>
          <p className={styles.baKey}>{JOURNAL.previousLabel}</p>
          {editing ? (
            <input className={styles.input} value={prev} onChange={(e) => setPrev(e.target.value)} aria-label={JOURNAL.previousLabel} />
          ) : (
            <p className={styles.baVal}>{evolution.previousValue || "Not mentioned"}</p>
          )}
        </div>
        <span className={styles.baArrow} aria-hidden="true">→</span>
        <div className={styles.baCol}>
          <p className={styles.baKey}>{JOURNAL.nowLabel}</p>
          {editing ? (
            <input className={styles.input} value={curr} onChange={(e) => setCurr(e.target.value)} aria-label={JOURNAL.nowLabel} />
          ) : (
            <p className={`${styles.baVal} ${styles.baValNew}`}>{evolution.currentValue || "Reported"}</p>
          )}
        </div>
      </div>

      <p className={styles.evoDesc}>{evolution.description}</p>

      {evidence && hasEvidence ? (
        <div className={styles.evidence}>
          {evolution.previousSourceText ? (
            <>
              <p className={styles.evidenceKey}>{JOURNAL.previousEvidenceLabel}</p>
              <p className={styles.evidenceQuote}>&ldquo;{evolution.previousSourceText}&rdquo;</p>
            </>
          ) : null}
          {evolution.currentSourceText ? (
            <>
              <p className={styles.evidenceKey} style={{ marginTop: 8 }}>{JOURNAL.newEvidenceLabel}</p>
              <p className={styles.evidenceQuote}>&ldquo;{evolution.currentSourceText}&rdquo;</p>
            </>
          ) : null}
        </div>
      ) : null}

      <div className={styles.evoActions}>
        {editing ? (
          <>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
              onClick={() => {
                onEdit({ previousValue: prev, currentValue: curr });
                setEditing(false);
              }}
            >
              <CheckIcon size={13} />
              {JOURNAL.saveCta}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => setEditing(false)}>
              {JOURNAL.cancelCta}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
              onClick={() => onStatus(status === "CONFIRMED" ? "AI_ORGANIZED" : "CONFIRMED")}
              aria-pressed={status === "CONFIRMED"}
            >
              <CheckIcon size={13} />
              {status === "CONFIRMED" ? EVOLUTION_STATUS_LABELS.CONFIRMED : JOURNAL.confirmCta}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => setEditing(true)}>
              <PencilIcon size={13} />
              {JOURNAL.editCta}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
              onClick={() => onStatus(status === "DISMISSED" ? "AI_ORGANIZED" : "DISMISSED")}
            >
              <CloseIcon size={13} />
              {JOURNAL.dismissCta}
            </button>
            {hasEvidence ? (
              <button
                type="button"
                className={styles.linkBtn}
                aria-expanded={evidence}
                onClick={() => setEvidence((v) => !v)}
              >
                <EyeIcon size={13} />
                {JOURNAL.viewEvidenceCta}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * UpdateResult — the Stage 5 "wow" screen.
 *
 * Shows what the AI organized from the new update, compares it with the
 * previous story, exposes both source phrases, and lets the user confirm,
 * edit or dismiss before anything is added to their timeline.
 */
export default function UpdateResult({ analysis, onApply, onDiscard }: Props) {
  const [status, setStatus] = useState<Record<string, EvolutionStatus>>({});
  const [correction, setCorrection] = useState<Record<string, "replace" | "keep">>({});
  const [merge, setMerge] = useState<Record<string, boolean>>({});
  const [evolutions, setEvolutions] = useState(analysis.evolutions);

  const statusOf = (id: string): EvolutionStatus => status[id] ?? "AI_ORGANIZED";

  function setEvolution(id: string, value: EvolutionStatus) {
    setStatus((prev) => ({ ...prev, [id]: value }));
  }

  function editEvolution(id: string, updates: { previousValue?: string; currentValue?: string }) {
    setEvolutions((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    setStatus((prev) => ({ ...prev, [id]: "CONFIRMED" }));
  }

  const hasChange =
    analysis.evolutions.some((e) => e.changeType !== "new_information") ||
    analysis.contradictions.length > 0 ||
    analysis.corrections.length > 0;
  const newInfo = evolutions.filter((e) => e.changeType === "new_information");
  const changed = evolutions.filter((e) => e.changeType !== "new_information");

  return (
    <section className={styles.panel} aria-labelledby="update-result-heading">
      <div className={styles.panelHead}>
        <SparkIcon size={17} />
        <h2 className={styles.panelTitle} id="update-result-heading">
          {hasChange ? JOURNAL.storyUpdatedHeading : JOURNAL.updateRecordedHeading}
        </h2>
      </div>

      <div className={styles.panelBody}>
        <p className={styles.sub}>
          {analysis.contradictions.length > 0 || analysis.corrections.length > 0
            ? JOURNAL.clarificationBody
            : hasChange
              ? JOURNAL.changedSinceHeading
              : analysis.events.length > 0
                ? JOURNAL.noChangeBody
                : JOURNAL.updateRecordedBody}
        </p>

        {analysis.contradictions.map((c) => (
          <div key={c.id} className={styles.alert} style={{ marginTop: 16 }}>
            <p className={styles.alertTitle}>{JOURNAL.clarificationHeading}</p>
            <p className={styles.alertText}>{JOURNAL.clarificationBody}</p>
            <div className={styles.compareCols}>
              <div>
                <p className={styles.evidenceKey}>{JOURNAL.earlierEntryLabel}</p>
                <p className={styles.evidenceQuote}>&ldquo;{c.previousSourceText}&rdquo;</p>
              </div>
              <div>
                <p className={styles.evidenceKey}>{JOURNAL.laterEntryLabel}</p>
                <p className={styles.evidenceQuote}>&ldquo;{c.currentSourceText}&rdquo;</p>
              </div>
            </div>
            <div className={styles.alertActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                onClick={() => setEvolution(c.id, "CONFIRMED")}
              >
                {JOURNAL.keepEarlierCta}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                onClick={() => setEvolution(c.id, "CONFIRMED")}
              >
                {JOURNAL.keepLaterCta}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                onClick={() => setEvolution(c.id, "AI_ORGANIZED")}
              >
                {JOURNAL.addClarificationCta}
              </button>
            </div>
          </div>
        ))}

        {analysis.corrections.map((c) => (
          <div key={c.id} className={styles.alert} style={{ marginTop: 16 }}>
            <p className={styles.alertTitle}>{JOURNAL.correctionHeading}</p>
            <p className={styles.alertText}>{c.correctionPrompt ?? JOURNAL.correctionBody}</p>
            <p className={styles.evidenceQuote} style={{ marginTop: 8 }}>&ldquo;{c.currentSourceText}&rdquo;</p>
            <div className={styles.alertActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                onClick={() => {
                  setCorrection((prev) => ({ ...prev, [c.id]: "replace" }));
                  setEvolution(c.id, "CONFIRMED");
                }}
              >
                {JOURNAL.replaceCta}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                onClick={() => {
                  setCorrection((prev) => ({ ...prev, [c.id]: "keep" }));
                  setEvolution(c.id, "CONFIRMED");
                }}
              >
                {JOURNAL.keepBothCta}
              </button>
            </div>
          </div>
        ))}

        {analysis.possibleMatches.map((m, i) => (
          <div key={`${m.existingTopicId}-${i}`} className={styles.possibleMatch} style={{ marginTop: 14 }}>
            <p className={styles.possibleText}>
              {JOURNAL.possibleMatchHeading} &ldquo;{m.label}&rdquo; / &ldquo;{m.newLabel}&rdquo;
            </p>
            <div className={styles.btnRow} style={{ marginTop: 8 }}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm} ${merge[m.existingTopicId] ? styles.btnPrimary : styles.btnGhost}`}
                aria-pressed={Boolean(merge[m.existingTopicId])}
                onClick={() => setMerge((prev) => ({ ...prev, [m.existingTopicId]: true }))}
              >
                {JOURNAL.mergeCta}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm} ${merge[m.existingTopicId] === false ? styles.btnPrimary : styles.btnGhost}`}
                aria-pressed={merge[m.existingTopicId] === false}
                onClick={() => setMerge((prev) => ({ ...prev, [m.existingTopicId]: false }))}
              >
                {JOURNAL.keepSeparateCta}
              </button>
            </div>
          </div>
        ))}

        {changed.length > 0 ? (
          <div style={{ marginTop: 18 }}>
            {changed.map((e) => (
              <EvolutionCard
                key={e.id}
                evolution={e}
                status={statusOf(e.id)}
                onStatus={(value) => setEvolution(e.id, value)}
                onEdit={(updates) => editEvolution(e.id, updates)}
              />
            ))}
          </div>
        ) : null}

        {newInfo.length > 0 ? (
          <div style={{ marginTop: 18 }}>
            <p className={styles.panelTitle} style={{ fontSize: 14, marginBottom: 10 }}>
              {EVOLUTION_TYPE_LABELS.new_information}
            </p>
            {newInfo.map((e) => (
              <EvolutionCard
                key={e.id}
                evolution={e}
                status={statusOf(e.id)}
                onStatus={(value) => setEvolution(e.id, value)}
                onEdit={(updates) => editEvolution(e.id, updates)}
              />
            ))}
          </div>
        ) : null}

        {analysis.events.length === 0 &&
        analysis.contradictions.length === 0 &&
        analysis.corrections.length === 0 ? (
          <div className={styles.empty} role="status">
            <InfoIcon size={20} style={{ margin: "0 auto 8px", display: "block", color: "var(--ink-300)" }} />
            We couldn&apos;t organize this update automatically. Your text will be saved so nothing is lost.
          </div>
        ) : null}

        <div className={styles.btnRow} style={{ marginTop: 22 }}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onApply({ status, correction, merge })}>
            Add to My Story
            <ArrowRightIcon size={17} className="btn__arrow" />
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onDiscard}>
            {JOURNAL.cancelCta}
          </button>
        </div>

        <p className={styles.sectionNote}>
          Nothing is added to your story until you choose <strong>Add to My Story</strong>. Dismissed
          comparisons are never treated as an established change.
        </p>
      </div>
    </section>
  );
}
