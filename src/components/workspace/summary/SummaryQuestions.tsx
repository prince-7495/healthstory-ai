"use client";

import { useState } from "react";
import { SUMMARY } from "@/lib/health/options";
import type { SummaryQuestion } from "@/lib/health/summary";
import { CheckIcon, PencilIcon, PlusIcon, QuestionIcon, TrashIcon } from "../../icons";
import styles from "./summary.module.css";

type Props = {
  questions: SummaryQuestion[];
  onAdd: (text: string) => void;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
};

function QuestionRow({
  question,
  onUpdate,
  onRemove,
}: {
  question: SummaryQuestion;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(question.text);

  function save() {
    if (draft.trim()) onUpdate(question.id, draft.trim());
    setEditing(false);
  }

  return (
    <li className={styles.qItem} data-origin={question.origin}>
      <QuestionIcon size={16} className={styles.qIcon} />
      <div className={styles.qBody}>
        {editing ? (
          <>
            <textarea
              className={styles.qEditor}
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Edit question"
            />
            <div className={styles.addQActions} style={{ marginTop: 8 }}>
              <button type="button" className={`${styles.miniBtn} ${styles.miniBtnPrimary}`} onClick={save}>
                <CheckIcon size={13} />
                {SUMMARY.saveCta}
              </button>
              <button
                type="button"
                className={styles.miniBtn}
                onClick={() => {
                  setDraft(question.text);
                  setEditing(false);
                }}
              >
                {SUMMARY.cancelCta}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.qText}>{question.text}</p>
            <div className={styles.qMeta}>
              <span className={styles.qBadge} data-kind={question.origin === "USER_ADDED" ? "user" : "ai"}>
                {question.origin === "USER_ADDED" ? SUMMARY.userBadge : SUMMARY.aiBadge}
              </span>
              {question.edited ? (
                <span className={styles.qBadge} data-kind="edited">
                  {SUMMARY.editedQuestionBadge}
                </span>
              ) : null}
              <button type="button" className={styles.qBtn} onClick={() => setEditing(true)}>
                <PencilIcon size={12} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} />
                {SUMMARY.editSectionCta}
              </button>
              <button
                type="button"
                className={`${styles.qBtn} ${styles.qBtnDanger}`}
                onClick={() => onRemove(question.id)}
              >
                <TrashIcon size={12} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} />
                {SUMMARY.removeQuestionCta}
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

/**
 * SummaryQuestions — "AI assists. The user decides."
 *
 * Every generated question is editable and removable, and the user can
 * add their own. User-added questions are visually distinct from
 * AI-suggested ones, so the provenance of an idea is never ambiguous.
 */
export default function SummaryQuestions({ questions, onAdd, onUpdate, onRemove }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function submit() {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft("");
    setAdding(false);
  }

  return (
    <div>
      <ul className={styles.qList}>
        {questions.map((q) => (
          <QuestionRow key={q.id} question={q} onUpdate={onUpdate} onRemove={onRemove} />
        ))}
      </ul>

      <div className={styles.addQ}>
        {adding ? (
          <div className={styles.addQForm}>
            <label htmlFor="s4-new-question" className="sr-only">
              {SUMMARY.addQuestionPlaceholder}
            </label>
            <input
              id="s4-new-question"
              className={styles.addQInput}
              value={draft}
              placeholder={SUMMARY.addQuestionPlaceholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <div className={styles.addQActions}>
              <button type="button" className={`${styles.miniBtn} ${styles.miniBtnPrimary}`} onClick={submit}>
                <PlusIcon size={13} />
                {SUMMARY.addQuestionButton}
              </button>
              <button
                type="button"
                className={styles.miniBtn}
                onClick={() => {
                  setDraft("");
                  setAdding(false);
                }}
              >
                {SUMMARY.cancelCta}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={styles.addQBtn} onClick={() => setAdding(true)}>
            <PlusIcon size={14} />
            {SUMMARY.addQuestionCta}
          </button>
        )}
      </div>
    </div>
  );
}
