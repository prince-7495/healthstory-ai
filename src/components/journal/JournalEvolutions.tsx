"use client";

import { useState } from "react";
import { JOURNAL } from "@/lib/journal/options";
import {
  EVOLUTION_STATUS_LABELS,
  type EvolutionStatus,
  type StoryEvolution,
} from "@/lib/journal/types";
import { CheckIcon, CloseIcon, EyeIcon, PencilIcon } from "../icons";
import styles from "./journal.module.css";

type Props = {
  evolutions: StoryEvolution[];
  onStatus: (id: string, status: EvolutionStatus) => void;
  onEdit: (id: string, updates: { previousValue?: string; currentValue?: string }) => void;
};

function Row({
  evolution,
  onStatus,
  onEdit,
}: {
  evolution: StoryEvolution;
  onStatus: (id: string, status: EvolutionStatus) => void;
  onEdit: (id: string, updates: { previousValue?: string; currentValue?: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [evidence, setEvidence] = useState(false);
  const [prev, setPrev] = useState(evolution.previousValue ?? "");
  const [curr, setCurr] = useState(evolution.currentValue ?? "");
  const status = evolution.status;

  return (
    <div className={styles.evoCard} data-status={status}>
      <div className={styles.evoTop}>
        <span className={styles.evoCat}>{evolution.category}</span>
        <span className={styles.statusPill} data-status={status}>
          {EVOLUTION_STATUS_LABELS[status]}
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

      {evidence && (evolution.previousSourceText || evolution.currentSourceText) ? (
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
                onEdit(evolution.id, { previousValue: prev, currentValue: curr });
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
              className={`${styles.btn} ${styles.btnSm} ${status === "CONFIRMED" ? styles.btnGhost : styles.btnPrimary}`}
              onClick={() => onStatus(evolution.id, status === "CONFIRMED" ? "AI_ORGANIZED" : "CONFIRMED")}
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
              onClick={() => onStatus(evolution.id, status === "DISMISSED" ? "AI_ORGANIZED" : "DISMISSED")}
            >
              <CloseIcon size={13} />
              {JOURNAL.dismissCta}
            </button>
            {evolution.previousSourceText || evolution.currentSourceText ? (
              <button type="button" className={styles.linkBtn} aria-expanded={evidence} onClick={() => setEvidence((v) => !v)}>
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
 * JournalEvolutions — the persistent "what changed" record.
 *
 * Every comparison stays editable after the update is applied: the user
 * can confirm it, correct the wording, or dismiss it so it is no longer
 * treated as part of the story. "AI detects. Humans verify."
 */
export default function JournalEvolutions({ evolutions, onStatus, onEdit }: Props) {
  const visible = evolutions.filter(
    (e) => e.changeType !== "new_information" && e.changeType !== "continued",
  );

  return (
    <section className={styles.panel} aria-labelledby="journal-evolutions-heading">
      <div className={styles.panelHead}>
        <CheckIcon size={17} />
        <h2 className={styles.panelTitle} id="journal-evolutions-heading">
          {JOURNAL.changedSinceHeading}
        </h2>
        <span className={styles.panelCount}>{visible.length}</span>
      </div>
      <div className={styles.panelBody}>
        {visible.length === 0 ? (
          <div className={styles.empty}>{JOURNAL.noChangeBody}</div>
        ) : (
          visible.map((e) => (
            <Row key={e.id} evolution={e} onStatus={onStatus} onEdit={onEdit} />
          ))
        )}
        <p className={styles.sectionNote}>
          Dismissed comparisons are kept out of your established story. Confirmed ones appear in an
          updated summary.
        </p>
      </div>
    </section>
  );
}
