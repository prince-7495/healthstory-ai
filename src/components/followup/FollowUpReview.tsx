"use client";

import { useState } from "react";
import { FOLLOWUP } from "@/lib/followup/options";
import type { FollowUpDecisions, FollowUpDraft } from "@/lib/followup/engine";
import {
  SOURCE_LABELS,
  type FollowUpItem,
  type FollowUpItemStatus,
} from "@/lib/journal/types";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  EyeIcon,
  PencilIcon,
  QuoteIcon,
  SparkIcon,
  TrashIcon,
} from "../icons";
import styles from "./followup.module.css";

type Props = {
  draft: FollowUpDraft;
  onApply: (decisions: FollowUpDecisions) => void;
  onDiscard: () => void;
};

function ItemCard({
  item,
  status,
  editing,
  editText,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onStatus,
  connect,
  onConnect,
}: {
  item: FollowUpItem;
  status: FollowUpItemStatus;
  editing: boolean;
  editText: string;
  onStartEdit: () => void;
  onEditChange: (t: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStatus: (s: FollowUpItemStatus) => void;
  connect?: boolean;
  onConnect?: (v: boolean) => void;
}) {
  const [evidence, setEvidence] = useState(false);
  const topicLabel = item.suggestedTopicLabel;

  return (
    <div className={styles.item} data-status={status}>
      <div className={styles.itemTop}>
        {editing ? (
          <textarea className={styles.itemEditor} value={editText} onChange={(e) => onEditChange(e.target.value)} aria-label={FOLLOWUP.editCta} />
        ) : (
          <p className={styles.itemText}>{item.text}</p>
        )}
      </div>

      <div className={styles.itemMeta}>
        <span className={`${styles.tag} ${item.sourceType === "PROFESSIONAL_CONVERSATION" ? styles.tagProf : styles.tagSource}`}>
          {SOURCE_LABELS[item.sourceType]}
        </span>
        <span className={styles.tag + " " + styles.tagConf} title={FOLLOWUP.confidenceMeaning[item.confidence]}>
          {FOLLOWUP.confidenceLabel}: {item.confidence}
        </span>
        {status === "CONFIRMED" ? <span className={styles.tag + " " + styles.tagConfirmed}>{FOLLOWUP.confirmCta}</span> : null}
        {status === "DISMISSED" ? <span className={styles.tag + " " + styles.tagDismissed}>{FOLLOWUP.removeCta}</span> : null}
      </div>

      {topicLabel ? (
        <div className={styles.topicMatch} style={{ marginTop: 10 }}>
          <p className={styles.topicText}>
            {FOLLOWUP.topicMatchHeading}: &ldquo;{topicLabel}&rdquo;
          </p>
          <div className={styles.row} style={{ marginTop: 8 }}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${connect ? styles.btnPrimary : styles.btnGhost}`}
              aria-pressed={Boolean(connect)}
              onClick={() => onConnect?.(true)}
            >
              {FOLLOWUP.connectCta}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${connect === false ? styles.btnPrimary : styles.btnGhost}`}
              aria-pressed={connect === false}
              onClick={() => onConnect?.(false)}
            >
              {FOLLOWUP.keepSeparateCta}
            </button>
          </div>
        </div>
      ) : null}

      {evidence ? (
        <div className={styles.evidence}>
          <p className={styles.key}>{FOLLOWUP.whyAddedCta}</p>
          <p>{FOLLOWUP.whyAddedBody.replace("{date}", item.sourceText ? "recorded entry" : "this follow-up")}</p>
          <p style={{ marginTop: 6 }}>
            <QuoteIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            <span className={styles.evidenceQuote}>&ldquo;{item.sourceText}&rdquo;</span>
          </p>
        </div>
      ) : null}

      <div className={styles.row} style={{ marginTop: 10 }}>
        {editing ? (
          <>
            <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={onSaveEdit}>
              <CheckIcon size={13} />
              {FOLLOWUP.saveCta}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onCancelEdit}>
              {FOLLOWUP.cancelCta}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${status === "CONFIRMED" ? styles.btnGhost : styles.btnPrimary}`}
              onClick={() => onStatus(status === "CONFIRMED" ? "AI_ORGANIZED" : "CONFIRMED")}
              aria-pressed={status === "CONFIRMED"}
            >
              <CheckIcon size={13} />
              {FOLLOWUP.confirmCta}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onStartEdit}>
              <PencilIcon size={13} />
              {FOLLOWUP.editCta}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
              onClick={() => onStatus(status === "DISMISSED" ? "AI_ORGANIZED" : "DISMISSED")}
            >
              <TrashIcon size={13} />
              {FOLLOWUP.removeCta}
            </button>
            <button type="button" className={styles.linkBtn} aria-expanded={evidence} onClick={() => setEvidence((v) => !v)}>
              <EyeIcon size={13} />
              {evidence ? FOLLOWUP.hideOriginalCta : FOLLOWUP.whyAddedCta}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * FollowUpReview — "We organized your follow-up".
 *
 * Every item is attributable, editable and reviewable. Nothing is written
 * into the confirmed story until the user chooses to add it.
 */
export default function FollowUpReview({ draft, onApply, onDiscard }: Props) {
  const { entry, analysis } = draft;
  const [status, setStatus] = useState<Record<string, FollowUpItemStatus>>({});
  const [connect, setConnect] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showOriginal, setShowOriginal] = useState(false);

  const items = entry.extractedItems;
  const statusOf = (i: FollowUpItem) => status[i.id] ?? "AI_ORGANIZED";
  const setItemStatus = (id: string, s: FollowUpItemStatus) => setStatus((p) => ({ ...p, [id]: s }));

  const groups: { label: string; types: FollowUpItem["type"][] }[] = [
    { label: FOLLOWUP.groupNewInfo, types: ["EVENT", "DATE"] },
    { label: FOLLOWUP.groupReceived, types: ["INFORMATION"] },
    { label: FOLLOWUP.groupChanges, types: ["CHANGE"] },
    { label: FOLLOWUP.groupQuestions, types: ["QUESTION"] },
  ];

  const topics = analysis ? [] : [];
  const lowConfidence = items.some((i) => i.confidence === "LOW");

  void topics;

  return (
    <section className={styles.panel} aria-labelledby="followup-review-heading">
      <div className={styles.panelHead}>
        <SparkIcon size={16} />
        <h2 className={styles.panelTitle} id="followup-review-heading">
          {FOLLOWUP.reviewHeading}
        </h2>
        <span className={styles.panelCount}>{items.length}</span>
      </div>
      <div className={styles.panelBody}>
        <p className={styles.sub}>{FOLLOWUP.reviewSupporting}</p>

        <div className={styles.row} style={{ marginTop: 12 }}>
          <span className={`${styles.tag} ${styles.tagType}`}>{entry.type.replace("_", " ").toLowerCase()}</span>
          {entry.eventDate ? <span className={`${styles.tag} ${styles.tagType}`}>{entry.eventDate}</span> : null}
          {entry.who ? <span className={`${styles.tag} ${styles.tagType}`}>{FOLLOWUP.whoLabel} {entry.who}</span> : null}
          <button type="button" className={styles.linkBtn} aria-expanded={showOriginal} onClick={() => setShowOriginal((v) => !v)}>
            <EyeIcon size={13} />
            {showOriginal ? FOLLOWUP.hideOriginalCta : FOLLOWUP.viewOriginalCta}
          </button>
        </div>

        {showOriginal ? (
          <div className={styles.evidence} style={{ marginTop: 10 }}>
            <p className={styles.key}>{FOLLOWUP.originalHeading}</p>
            <p className={styles.evidenceQuote}>&ldquo;{entry.originalText}&rdquo;</p>
          </div>
        ) : null}

        {lowConfidence ? (
          <div className={styles.alert} style={{ marginTop: 14 }}>
            <p className={styles.alertText}>{FOLLOWUP.lowConfidenceNote}</p>
          </div>
        ) : null}

        {analysis.contradictions.map((c) => (
          <div key={c.id} className={styles.conflict} style={{ marginTop: 14 }}>
            <p className={styles.conflictTitle}>
              <AlertIcon size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              {FOLLOWUP.conflictHeading}
            </p>
            <p className={styles.conflictText}>{FOLLOWUP.conflictBody}</p>
            <div className={styles.conflictCols}>
              <div>
                <p className={styles.key}>Earlier</p>
                <p className={styles.quote}>&ldquo;{c.previousSourceText}&rdquo;</p>
              </div>
              <div>
                <p className={styles.key}>Later</p>
                <p className={styles.quote}>&ldquo;{c.currentSourceText}&rdquo;</p>
              </div>
            </div>
            <div className={styles.row} style={{ marginTop: 10 }}>
              <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => setItemStatus(c.id, "CONFIRMED")}>
                {FOLLOWUP.keepEarlierCta}
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => setItemStatus(c.id, "CONFIRMED")}>
                {FOLLOWUP.keepLaterCta}
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => setItemStatus(c.id, "AI_ORGANIZED")}>
                {FOLLOWUP.addClarificationCta}
              </button>
            </div>
          </div>
        ))}

        {analysis.corrections.map((c) => (
          <div key={c.id} className={styles.conflict} style={{ marginTop: 14 }}>
            <p className={styles.conflictTitle}>{FOLLOWUP.correctionHeading}</p>
            <p className={styles.conflictText}>{FOLLOWUP.correctionBody}</p>
            <p className={styles.quote}>&ldquo;{c.currentSourceText}&rdquo;</p>
            <div className={styles.row} style={{ marginTop: 10 }}>
              <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={() => setItemStatus(c.id, "CONFIRMED")}>
                {FOLLOWUP.applyCorrectionCta}
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => setItemStatus(c.id, "AI_ORGANIZED")}>
                {FOLLOWUP.keepBothCta}
              </button>
            </div>
          </div>
        ))}

        {groups.map((group) => {
          const groupItems = items.filter((i) => group.types.includes(i.type));
          return (
            <div key={group.label} style={{ marginTop: 18 }}>
              <p className={styles.key}>{group.label}</p>
              {groupItems.length === 0 ? (
                <p className={styles.note}>{FOLLOWUP.groupEmpty}</p>
              ) : (
                groupItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    status={statusOf(item)}
                    editing={editingId === item.id}
                    editText={editText}
                    onStartEdit={() => {
                      setEditingId(item.id);
                      setEditText(item.text);
                    }}
                    onEditChange={setEditText}
                    onSaveEdit={() => setEditingId(null)}
                    onCancelEdit={() => setEditingId(null)}
                    onStatus={(s) => setItemStatus(item.id, s)}
                    connect={connect[item.id]}
                    onConnect={(v) => setConnect((p) => ({ ...p, [item.id]: v }))}
                  />
                ))
              )}
            </div>
          );
        })}

        <div className={styles.row} style={{ marginTop: 22 }}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onApply({ itemStatus: status, connect })}>
            {FOLLOWUP.applyCta}
            <ArrowRightIcon size={17} className="btn__arrow" />
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onDiscard}>
            <CloseIcon size={14} />
            {FOLLOWUP.discardCta}
          </button>
        </div>

        <p className={styles.disclaimer} style={{ marginTop: 12 }}>{FOLLOWUP.safetyFooter}</p>
      </div>
    </section>
  );
}
