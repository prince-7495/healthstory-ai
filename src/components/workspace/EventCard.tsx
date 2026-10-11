"use client";

import { useId, useState } from "react";
import type { HealthEvent } from "@/lib/health/types";
import { makeId } from "@/lib/health/types";
import { labelForISO } from "@/lib/health/dates";
import {
  ArrowDownIconSmall,
  ArrowUpIconSmall,
  CheckIcon,
  CopyIcon,
  PencilIcon,
  TimelineIcon,
  TrashIcon,
} from "../icons";
import styles from "./workspace.module.css";

type Draft = { date: string; description: string; notes: string };

function toDraft(event: HealthEvent): Draft {
  return { date: event.date ?? "", description: event.description, notes: event.notes };
}

type Props = {
  event: HealthEvent;
  index: number;
  total: number;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onSave: (event: HealthEvent) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
};

/**
 * EventCard — one dated health event, entered by hand.
 *
 * Editing happens in place: replacing the card with a separate screen
 * makes people lose the thread while they are building a list, so the
 * form expands inside the card instead. A newly added card opens
 * straight into edit mode, so the button always does something visible.
 */
export default function EventCard({
  event,
  index,
  total,
  editing,
  onEditingChange,
  onSave,
  onRemove,
  onDuplicate,
  onMove,
}: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(event));
  const uid = useId();

  /** Opens the editor, always starting from the currently stored values. */
  function startEditing() {
    setDraft(toDraft(event));
    onEditingChange(true);
  }

  function save() {
    const { date, label } = labelForISO(draft.date);
    onSave({
      ...event,
      date: date || null,
      dateLabel: label,
      datePrecision: date ? "exact" : "unknown",
      description: draft.description.trim(),
      notes: draft.notes.trim(),
    });
    onEditingChange(false);
  }

  return (
    <li className={styles.eventCard} data-editing={editing || undefined}>
      <div className={styles.eventTop}>
        <span className={styles.eventKind}>
          <TimelineIcon size={16} />
          Health event
        </span>
        <span className={styles.eventIndex}>
          {index + 1} of {total}
        </span>
      </div>

      {editing ? (
        <div className={styles.eventForm}>
          <div className={styles.formField}>
            <label htmlFor={`${uid}-date`}>Date</label>
            <input
              id={`${uid}-date`}
              type="date"
              className={styles.formInput}
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
            <p className={styles.fieldHelp}>
              Leave it empty if you are not sure. It will read
              &ldquo;Date not provided&rdquo; instead of being guessed.
            </p>
          </div>

          <div className={styles.formField}>
            <label htmlFor={`${uid}-desc`}>What happened?</label>
            <textarea
              id={`${uid}-desc`}
              className={styles.formInput}
              rows={2}
              value={draft.description}
              placeholder="Headaches became more frequent."
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor={`${uid}-notes`}>Additional note</label>
            <input
              id={`${uid}-notes`}
              className={styles.formInput}
              value={draft.notes}
              placeholder="Usually after long study sessions."
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </div>

          <div className={styles.eventActions} style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={save}
              style={{ color: "var(--brand-700)", fontWeight: 700 }}
            >
              <CheckIcon size={15} />
              Save changes
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => onEditingChange(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={styles.eventDate}>{event.dateLabel}</p>
          <p className={styles.eventDesc}>
            {event.description || <span className={styles.structAbsent}>No description added.</span>}
          </p>

          {event.frequency || event.change ? (
            <div className={styles.eventMeta}>
              {event.frequency ? <span className="pill pill--neutral">{event.frequency}</span> : null}
              {event.change ? <span className="pill pill--neutral">{event.change}</span> : null}
            </div>
          ) : null}

          {event.notes ? <p className={styles.eventNote}>{event.notes}</p> : null}

          <div className={styles.eventActions}>
            <button type="button" className={styles.iconBtn} onClick={startEditing}>
              <PencilIcon size={15} />
              Edit
            </button>
            <button type="button" className={styles.iconBtn} onClick={onDuplicate}>
              <CopyIcon size={15} />
              Duplicate
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => onMove(-1)}
              disabled={total < 2 || index === 0}
              aria-label={`Move health event ${index + 1} earlier`}
            >
              <ArrowUpIconSmall size={15} />
              Move up
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => onMove(1)}
              disabled={total < 2 || index === total - 1}
              aria-label={`Move health event ${index + 1} later`}
            >
              <ArrowDownIconSmall size={15} />
              Move down
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              data-danger="true"
              onClick={onRemove}
              aria-label={`Remove health event ${index + 1}`}
            >
              <TrashIcon size={15} />
              Remove
            </button>
          </div>
        </>
      )}
    </li>
  );
}

/** Builds a fresh, blank event for the "add another event" button. */
export function createBlankEvent(): HealthEvent {
  return {
    id: makeId("event"),
    date: null,
    dateLabel: "Date not provided",
    datePrecision: "unknown",
    description: "",
    frequency: null,
    change: null,
    notes: "",
    origin: "user",
  };
}