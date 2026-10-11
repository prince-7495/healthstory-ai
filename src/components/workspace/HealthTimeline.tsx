"use client";

import { useState } from "react";
import { ANALYSIS } from "@/lib/health/options";
import {
  type AnalyzedEvent,
  type EventCategory,
  type EventStatus,
} from "@/lib/health/types";
import {
  CheckIcon,
  PencilIcon,
  SparkIcon,
  TimelineIcon,
  TrashIcon,
} from "../icons";
import styles from "./workspace.module.css";

/* ---------- helpers ---------- */

function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={styles.statusBadge} data-status={status}>
      {ANALYSIS.statusLabels[status] ?? status}
    </span>
  );
}

function CategoryChip({ category }: { category: EventCategory }) {
  return (
    <span className={styles.categoryChip} data-cat={category}>
      {ANALYSIS.categoryLabels[category] ?? category}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  return (
    <span className={styles.confBadge} data-conf={confidence}>
      {ANALYSIS.confidenceLabels[confidence] ?? confidence}
    </span>
  );
}

/* ---------- Inline edit form ---------- */

type EditDraft = {
  title: string;
  description: string;
  dateText: string;
  frequency: string;
  context: string;
};

function EditForm({
  event,
  onSave,
  onCancel,
}: {
  event: AnalyzedEvent;
  onSave: (draft: EditDraft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<EditDraft>({
    title: event.title,
    description: event.description,
    dateText: event.dateText,
    frequency: event.frequency ?? "",
    context: event.context ?? "",
  });

  function field(key: keyof EditDraft) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((d) => ({ ...d, [key]: e.target.value }));
  }

  return (
    <div className={styles.tl3EditForm} role="form" aria-label="Edit health event">
      <div className={styles.tl3EditRow}>
        <div className={styles.tl3EditField}>
          <label htmlFor={`edit-title-${event.id}`}>Title</label>
          <input
            id={`edit-title-${event.id}`}
            className={styles.tl3EditInput}
            value={draft.title}
            onChange={field("title")}
          />
        </div>
        <div className={styles.tl3EditField}>
          <label htmlFor={`edit-date-${event.id}`}>When (approximate is fine)</label>
          <input
            id={`edit-date-${event.id}`}
            className={styles.tl3EditInput}
            value={draft.dateText}
            onChange={field("dateText")}
            placeholder="e.g. a few months ago"
          />
        </div>
      </div>

      <div className={styles.tl3EditField}>
        <label htmlFor={`edit-desc-${event.id}`}>Description</label>
        <textarea
          id={`edit-desc-${event.id}`}
          className={styles.tl3EditInput}
          rows={2}
          value={draft.description}
          onChange={field("description")}
        />
      </div>

      <div className={styles.tl3EditRow}>
        <div className={styles.tl3EditField}>
          <label htmlFor={`edit-freq-${event.id}`}>Frequency (optional)</label>
          <input
            id={`edit-freq-${event.id}`}
            className={styles.tl3EditInput}
            value={draft.frequency}
            onChange={field("frequency")}
            placeholder="e.g. occasionally"
          />
        </div>
        <div className={styles.tl3EditField}>
          <label htmlFor={`edit-ctx-${event.id}`}>Context (optional)</label>
          <input
            id={`edit-ctx-${event.id}`}
            className={styles.tl3EditInput}
            value={draft.context}
            onChange={field("context")}
            placeholder="e.g. after studying"
          />
        </div>
      </div>

      <div className={styles.tl3EditActions}>
        <button
          type="button"
          className={styles.savePrimary}
          onClick={() => onSave(draft)}
        >
          <CheckIcon size={14} />
          {ANALYSIS.saveBtn}
        </button>
        <button type="button" className={styles.cancelGhost} onClick={onCancel}>
          {ANALYSIS.cancelBtn}
        </button>
      </div>
    </div>
  );
}

/* ---------- Single timeline event card ---------- */

function TimelineEventCard({
  event,
  onConfirm,
  onEdit,
  onRemove,
  onRestore,
}: {
  event: AnalyzedEvent;
  onConfirm: () => void;
  onEdit: (draft: EditDraft) => void;
  onRemove: () => void;
  onRestore: () => void;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [editing, setEditing] = useState(false);

  const isRemoved = event.status === "REMOVED";
  const isConfirmed = event.status === "CONFIRMED";

  const hasFacts =
    Boolean(event.frequency) ||
    Boolean(event.context) ||
    Boolean(event.severity);

  const evidenceText =
    event.evidence?.length ? event.evidence[0].text : event.sourceText;

  function handleSave(draft: EditDraft) {
    onEdit(draft);
    setEditing(false);
  }

  return (
    <li
      className={styles.tl3Item}
      data-category={event.category}
      data-status={event.status}
    >
      <span className={styles.tl3Dot} aria-hidden="true" />

      <div className={styles.tl3Card}>
        <div className={styles.tl3CardHead}>
          <div className={styles.tl3Meta}>
            <p className={styles.tl3Period}>
              {event.timeLabel}
              {event.datePrecision === "approximate" || event.datePrecision === "relative" ? (
                <span style={{ fontWeight: 400, color: "var(--ink-400)", fontSize: "11px" }}>
                  approx.
                </span>
              ) : null}
              {event.datePrecision === "unknown" ? (
                <span style={{ fontWeight: 400, color: "var(--ink-400)", fontSize: "11px" }}>
                  date not provided
                </span>
              ) : null}
              <CategoryChip category={event.category} />
            </p>
            <p className={styles.tl3Title}>{event.title}</p>
            {event.description !== event.title ? (
              <p className={styles.tl3Desc}>{event.description}</p>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
            <StatusBadge status={event.status ?? "AI_ORGANIZED"} />
            {event.extractionConfidence && event.origin !== "user" ? (
              <ConfidenceBadge confidence={event.extractionConfidence} />
            ) : null}
          </div>
        </div>

        {hasFacts ? (
          <div className={styles.tl3Facts}>
            {event.frequency ? (
              <span className={styles.tl3Fact}>
                <span className={styles.tl3FactLabel}>Frequency:</span>
                {event.frequency}
              </span>
            ) : null}
            {event.context ? (
              <span className={styles.tl3Fact}>
                <span className={styles.tl3FactLabel}>Context:</span>
                {event.context}
              </span>
            ) : null}
            {event.severity ? (
              <span className={styles.tl3Fact}>
                <span className={styles.tl3FactLabel}>Severity:</span>
                {event.severity}
              </span>
            ) : null}
          </div>
        ) : null}

        {showEvidence && evidenceText ? (
          <div className={styles.tl3Evidence}>
            <p className={styles.tl3EvidenceLabel}>{ANALYSIS.evidenceLabel}</p>
            <p className={styles.tl3EvidenceQuote}>{evidenceText}</p>
          </div>
        ) : null}

        {editing ? (
          <EditForm
            event={event}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        ) : null}

        <div className={styles.tl3Actions}>
          {isRemoved ? (
            <button
              type="button"
              className={styles.restoreSmBtn}
              onClick={onRestore}
            >
              {ANALYSIS.restoreBtn}
            </button>
          ) : (
            <>
              <button
                type="button"
                className={styles.confirmBtn}
                data-active={isConfirmed ? "true" : "false"}
                onClick={onConfirm}
                aria-pressed={isConfirmed}
              >
                <CheckIcon size={13} />
                {isConfirmed ? "Confirmed" : ANALYSIS.confirmBtn}
              </button>

              {!editing ? (
                <button
                  type="button"
                  className={styles.editSmBtn}
                  onClick={() => setEditing(true)}
                  aria-label={`Edit event: ${event.title}`}
                >
                  <PencilIcon size={13} />
                  {ANALYSIS.editBtn}
                </button>
              ) : null}

              <button
                type="button"
                className={styles.removeSmBtn}
                onClick={onRemove}
                aria-label={`Remove event: ${event.title}`}
              >
                <TrashIcon size={13} />
                {ANALYSIS.removeBtn}
              </button>
            </>
          )}

          {evidenceText && !isRemoved ? (
            <button
              type="button"
              className={styles.tl3EvidenceToggle}
              aria-expanded={showEvidence}
              onClick={() => setShowEvidence((v) => !v)}
            >
              <SparkIcon size={13} />
              {showEvidence ? ANALYSIS.evidenceClose : ANALYSIS.evidenceToggle}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/* ---------- HealthTimeline ---------- */

export type EventUpdate =
  | { type: "confirm"; id: string }
  | { type: "edit"; id: string; draft: EditDraft }
  | { type: "remove"; id: string }
  | { type: "restore"; id: string };

type Props = {
  events: AnalyzedEvent[];
  onUpdate: (update: EventUpdate) => void;
};

/**
 * HealthTimeline — the visual centrepiece of Stage 3.
 *
 * Every event shows:
 *  - its time label (with precision qualifier)
 *  - its category chip
 *  - its AI-organised status badge
 *  - extraction confidence badge (AI-extracted events only)
 *  - expandable source evidence
 *  - Confirm / Edit / Remove / Restore controls
 *
 * The user is always in control. The AI proposes; the human disposes.
 */
export default function HealthTimeline({ events, onUpdate }: Props) {
  /* Separate unknown-date events from dated ones, per the spec:
     events without a usable date should not be randomly inserted. */
  const dated = events.filter(
    (e) => e.datePrecision !== "unknown" && e.status !== "REMOVED",
  );
  const undated = events.filter(
    (e) => e.datePrecision === "unknown" && e.status !== "REMOVED",
  );
  const removed = events.filter((e) => e.status === "REMOVED");

  const isEmpty = dated.length === 0 && undated.length === 0;

  return (
    <section className={styles.sectionPanel} aria-labelledby="timeline-heading">
      <div className={styles.sectionHead}>
        <TimelineIcon size={18} className={styles.blockTitleIcon} />
        <h2 className={styles.sectionTitle} id="timeline-heading">
          {ANALYSIS.timelineHeading}
        </h2>
        <span className={styles.sectionCount}>{dated.length + undated.length}</span>
      </div>

      <div className={styles.sectionBody}>
        {isEmpty ? (
          <p className={styles.structAbsent}>{ANALYSIS.timelineEmpty}</p>
        ) : (
          <>
            {dated.length > 0 ? (
              <ol className={styles.timeline3} aria-label="Chronological health events">
                {dated.map((event) => (
                  <TimelineEventCard
                    key={event.id}
                    event={event}
                    onConfirm={() => onUpdate({ type: "confirm", id: event.id })}
                    onEdit={(draft) =>
                      onUpdate({ type: "edit", id: event.id, draft })
                    }
                    onRemove={() => onUpdate({ type: "remove", id: event.id })}
                    onRestore={() => onUpdate({ type: "restore", id: event.id })}
                  />
                ))}
              </ol>
            ) : null}

            {undated.length > 0 ? (
              <section aria-labelledby="undated-heading">
                <h3
                  id="undated-heading"
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 700,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    color: "var(--ink-400)",
                    marginBottom: 14,
                    marginTop: dated.length > 0 ? 18 : 0,
                  }}
                >
                  Date not specified
                </h3>
                <ol className={styles.timeline3} aria-label="Events without a date">
                  {undated.map((event) => (
                    <TimelineEventCard
                      key={event.id}
                      event={event}
                      onConfirm={() => onUpdate({ type: "confirm", id: event.id })}
                      onEdit={(draft) =>
                        onUpdate({ type: "edit", id: event.id, draft })
                      }
                      onRemove={() => onUpdate({ type: "remove", id: event.id })}
                      onRestore={() =>
                        onUpdate({ type: "restore", id: event.id })
                      }
                    />
                  ))}
                </ol>
              </section>
            ) : null}
          </>
        )}

        {removed.length > 0 ? (
          <details style={{ marginTop: dated.length || undated.length ? 18 : 0 }}>
            <summary
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: "var(--ink-400)",
                cursor: "pointer",
                userSelect: "none",
                padding: "6px 0",
              }}
            >
              {removed.length} removed event{removed.length !== 1 ? "s" : ""} — click to view
            </summary>
            <ol
              className={styles.timeline3}
              aria-label="Removed events"
              style={{ marginTop: 12 }}
            >
              {removed.map((event) => (
                <TimelineEventCard
                  key={event.id}
                  event={event}
                  onConfirm={() => onUpdate({ type: "confirm", id: event.id })}
                  onEdit={(draft) =>
                    onUpdate({ type: "edit", id: event.id, draft })
                  }
                  onRemove={() => onUpdate({ type: "remove", id: event.id })}
                  onRestore={() => onUpdate({ type: "restore", id: event.id })}
                />
              ))}
            </ol>
          </details>
        ) : null}
      </div>
    </section>
  );
}
