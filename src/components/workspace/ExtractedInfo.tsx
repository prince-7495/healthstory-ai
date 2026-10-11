"use client";

import { ANALYSIS } from "@/lib/health/options";
import type { AnalyzedEvent } from "@/lib/health/types";
import { CheckIcon, SparkIcon, TrashIcon } from "../icons";
import type { EventUpdate } from "./HealthTimeline";
import styles from "./workspace.module.css";

/* ---------- Single extracted item ---------- */

function ExtractedItem({
  event,
  onUpdate,
}: {
  event: AnalyzedEvent;
  onUpdate: (u: EventUpdate) => void;
}) {
  const isRemoved = event.status === "REMOVED";
  const isConfirmed = event.status === "CONFIRMED";

  return (
    <li
      className={styles.extractedItem}
      data-status={event.status}
    >
      <div className={styles.extractedItemHead}>
        <span className={styles.categoryChip} data-cat={event.category}>
          {ANALYSIS.categoryLabels[event.category] ?? event.category}
        </span>
        <span className={styles.extractedItemTitle}>{event.title}</span>
        <span className={styles.statusBadge} data-status={event.status ?? "AI_ORGANIZED"}>
          {ANALYSIS.statusLabels[event.status ?? "AI_ORGANIZED"]}
        </span>
      </div>

      {event.sourceText ? (
        <p className={styles.extractedItemSource}>{event.sourceText}</p>
      ) : null}

      {!isRemoved ? (
        <div className={styles.extractedItemActions}>
          <button
            type="button"
            className={styles.confirmBtn}
            data-active={isConfirmed ? "true" : "false"}
            aria-pressed={isConfirmed}
            onClick={() => onUpdate({ type: "confirm", id: event.id })}
          >
            <CheckIcon size={12} />
            {isConfirmed ? "Confirmed" : ANALYSIS.confirmBtn}
          </button>
          <button
            type="button"
            className={styles.removeSmBtn}
            aria-label={`Remove: ${event.title}`}
            onClick={() => onUpdate({ type: "remove", id: event.id })}
          >
            <TrashIcon size={12} />
            {ANALYSIS.removeBtn}
          </button>
        </div>
      ) : (
        <div className={styles.extractedItemActions}>
          <button
            type="button"
            className={styles.restoreSmBtn}
            onClick={() => onUpdate({ type: "restore", id: event.id })}
          >
            {ANALYSIS.restoreBtn}
          </button>
        </div>
      )}
    </li>
  );
}

/* ---------- ExtractedInfo ---------- */

type Props = {
  events: AnalyzedEvent[];
  onUpdate: (u: EventUpdate) => void;
};

/**
 * ExtractedInfo — compact side-panel list showing every extracted item
 * with its evidence quote and confirmation controls.
 *
 * This duplicates what the timeline shows in a more scannable format
 * so the user can quickly run through all AI-organised items.
 */
export default function ExtractedInfo({ events, onUpdate }: Props) {
  const visible = events.filter((e) => e.status !== "REMOVED");
  const removed = events.filter((e) => e.status === "REMOVED");

  return (
    <section className={styles.sectionPanel} aria-labelledby="extracted-heading">
      <div className={styles.sectionHead}>
        <SparkIcon size={18} className={styles.blockTitleIcon} />
        <h2 className={styles.sectionTitle} id="extracted-heading">
          {ANALYSIS.extractedHeading}
        </h2>
        <span className={styles.sectionCount}>{visible.length}</span>
      </div>

      <div className={styles.sectionBody}>
        {events.length === 0 ? (
          <p className={styles.structAbsent}>{ANALYSIS.extractedEmpty}</p>
        ) : (
          <>
            <ul className={styles.extractedList} aria-label="AI-extracted health information">
              {visible.map((event) => (
                <ExtractedItem
                  key={event.id}
                  event={event}
                  onUpdate={onUpdate}
                />
              ))}
            </ul>

            {removed.length > 0 ? (
              <details style={{ marginTop: 12 }}>
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
                  {removed.length} removed — click to view
                </summary>
                <ul
                  className={styles.extractedList}
                  aria-label="Removed items"
                  style={{ marginTop: 10 }}
                >
                  {removed.map((event) => (
                    <ExtractedItem
                      key={event.id}
                      event={event}
                      onUpdate={onUpdate}
                    />
                  ))}
                </ul>
              </details>
            ) : null}

            <p
              style={{
                fontSize: "12.5px",
                lineHeight: 1.55,
                color: "var(--ink-400)",
                paddingTop: 12,
                borderTop: "1px dashed var(--line)",
              }}
            >
              Every item here comes from your own words. Confirm what is right,
              edit what needs adjusting, remove anything that does not apply.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
