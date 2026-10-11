"use client";

import { SUMMARY } from "@/lib/health/options";
import type { HealthSummary } from "@/lib/health/summary";
import styles from "./summary.module.css";

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return (match ? match[0] : text).trim();
}

/**
 * ConversationPrep — a glanceable card for the appointment itself.
 *
 * Deliberately shorter than the full summary: main topic, the change the
 * user reported, the context they mentioned, and two or three questions
 * they want to ask. All derived from the same reviewed data.
 */
export default function ConversationPrep({ summary }: { summary: HealthSummary }) {
  const change = summary.reportedChanges[0];
  const contextItems = summary.otherInformation
    .filter((i) => i.category === "context" || i.category === "lifestyle")
    .slice(0, 2);
  const questions = summary.questions.slice(0, 3);

  return (
    <section className={styles.prep} aria-labelledby="conversation-prep-heading">
      <p className={styles.prepLabel}>{SUMMARY.conversationPrepHeading}</p>

      <div className={styles.prepRow}>
        <p className={styles.prepKey}>Main topic</p>
        <p className={styles.prepVal}>{firstSentence(summary.mainConcern)}</p>
      </div>

      {change ? (
        <div className={styles.prepRow}>
          <p className={styles.prepKey}>Important change</p>
          <p className={styles.prepVal}>
            {change.before} → {change.after}
          </p>
        </div>
      ) : null}

      {contextItems.length > 0 ? (
        <div className={styles.prepRow}>
          <p className={styles.prepKey}>Context mentioned</p>
          {contextItems.map((item) => (
            <p key={item.id} className={styles.prepVal}>
              {item.label}
            </p>
          ))}
        </div>
      ) : null}

      {questions.length > 0 ? (
        <div className={styles.prepRow}>
          <p className={styles.prepKey}>Questions</p>
          {questions.map((q) => (
            <p key={q.id} className={styles.prepQ}>
              {q.text}
            </p>
          ))}
        </div>
      ) : null}

      <p className={styles.sectionNote} style={{ marginTop: 16 }}>
        {SUMMARY.conversationPrepSub}
      </p>
    </section>
  );
}
