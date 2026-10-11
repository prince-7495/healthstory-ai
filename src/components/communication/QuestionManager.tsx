"use client";

import { useState } from "react";
import { CONVERSATION } from "@/lib/communication/options";
import type { StoryQuestion } from "@/lib/journal/types";
import { CheckIcon, PencilIcon, PlusIcon, SparkIcon, TrashIcon } from "../icons";
import styles from "./communication.module.css";

type Props = {
  questions: StoryQuestion[];
  onAdd: (text: string) => void;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  onToggleDiscussed: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onSuggest: () => void;
};

/**
 * QuestionManager — the user's questions for a conversation.
 *
 * Users can add, edit, delete, reorder and mark questions as discussed.
 * AI-suggested questions are always visually distinct from the user's own,
 * and HealthStory AI never answers them.
 */
export default function QuestionManager({
  questions,
  onAdd,
  onUpdate,
  onRemove,
  onToggleDiscussed,
  onReorder,
  onSuggest,
}: Props) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const visible = questions.filter((q) => q.status !== "REMOVED");

  function submit() {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft("");
  }

  return (
    <div>
      {visible.length === 0 ? (
        <div style={{ padding: "10px 0 4px" }}>
          <p className={styles.panelTitle} style={{ fontSize: 14 }}>{CONVERSATION.questionEmpty}</p>
          <p className={styles.sub} style={{ marginTop: 6 }}>{CONVERSATION.questionEmptySub}</p>
        </div>
      ) : (
        <ul className={styles.qList}>
          {visible.map((q, i) => (
            <li key={q.id} className={styles.qItem} data-source={q.source} data-status={q.status}>
              <input
                type="checkbox"
                className={styles.qCheck}
                checked={q.status === "DISCUSSED"}
                onChange={() => onToggleDiscussed(q.id)}
                aria-label={CONVERSATION.questionDiscussedCta}
              />
              <div className={styles.qBody}>
                {editingId === q.id ? (
                  <>
                    <textarea
                      className={styles.textarea}
                      rows={2}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      aria-label={CONVERSATION.questionEditCta}
                    />
                    <div className={styles.row} style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                        onClick={() => {
                          if (editText.trim()) onUpdate(q.id, editText.trim());
                          setEditingId(null);
                        }}
                      >
                        <CheckIcon size={13} />
                        {CONVERSATION.saveCta}
                      </button>
                      <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => setEditingId(null)}>
                        {CONVERSATION.cancelCta}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className={styles.qText}>{q.text}</p>
                    <div className={styles.qMeta}>
                      <span className={`${styles.tag} ${q.source === "USER" ? styles.tagUser : styles.tagAi}`}>
                        {q.source === "USER" ? CONVERSATION.questionUserBadge : CONVERSATION.questionAiBadge}
                      </span>
                      {q.edited ? <span className={`${styles.tag} ${styles.tagEdited}`}>{CONVERSATION.userEditedBadge}</span> : null}
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => {
                          setEditingId(q.id);
                          setEditText(q.text);
                        }}
                      >
                        <PencilIcon size={12} />
                        {CONVERSATION.questionEditCta}
                      </button>
                      <button type="button" className={styles.linkBtn} onClick={() => onRemove(q.id)}>
                        <TrashIcon size={12} />
                        {CONVERSATION.questionDeleteCta}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className={styles.qActions}>
                <button
                  type="button"
                  className={styles.qMove}
                  onClick={() => onReorder(i, i - 1)}
                  disabled={i === 0}
                  aria-label="Move question up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className={styles.qMove}
                  onClick={() => onReorder(i, i + 1)}
                  disabled={i === visible.length - 1}
                  aria-label="Move question down"
                >
                  ▼
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.addQ}>
        <label htmlFor="conv-new-question" className="sr-only">
          {CONVERSATION.questionPlaceholder}
        </label>
        <input
          id="conv-new-question"
          className={styles.input}
          value={draft}
          placeholder={CONVERSATION.questionPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className={styles.row} style={{ marginTop: 9 }}>
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={submit}>
            <PlusIcon size={14} />
            {CONVERSATION.questionAddBtn}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onSuggest}>
            <SparkIcon size={13} />
            {CONVERSATION.questionSuggestCta}
          </button>
        </div>
      </div>
    </div>
  );
}
