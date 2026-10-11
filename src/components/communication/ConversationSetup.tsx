"use client";

import { CONVERSATION } from "@/lib/communication/options";
import {
  COMMUNICATION_LANGUAGES,
  PLANNED_LANGUAGES,
  isPrototypeLanguage,
} from "@/lib/communication/languages";
import type {
  ConversationSelection,
  SectionSelection,
} from "@/lib/communication/types";
import type { StoryQuestion, StoryTopic } from "@/lib/journal/types";
import { ArrowRightIcon, LockIcon, SparkIcon } from "../icons";
import styles from "./communication.module.css";

type Props = {
  selection: ConversationSelection;
  topics: StoryTopic[];
  questions: StoryQuestion[];
  onChange: (patch: Partial<ConversationSelection>) => void;
  onSections: (patch: Partial<SectionSelection>) => void;
  onTopicToggle: (id: string) => void;
  onQuestionToggle: (id: string) => void;
  onGenerate: () => void;
  onCancel: () => void;
};

/** ConversationSetup — privacy-first selection before any draft is built. */
export default function ConversationSetup({
  selection,
  topics,
  questions,
  onChange,
  onSections,
  onTopicToggle,
  onQuestionToggle,
  onGenerate,
  onCancel,
}: Props) {
  const s = selection.sections;
  const openQuestions = questions.filter((q) => q.status !== "REMOVED");

  return (
    <div className={styles.col}>
      <section className={styles.panel} aria-labelledby="conv-focus">
        <div className={styles.panelHead}>
          <SparkIcon size={16} />
          <h2 className={styles.panelTitle} id="conv-focus">
            {CONVERSATION.focusHeading}
          </h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.choiceGrid}>
            {CONVERSATION.focusOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={styles.choice}
                data-active={selection.focus === opt.id}
                aria-pressed={selection.focus === opt.id}
                onClick={() => onChange({ focus: opt.id })}
              >
                <span className={styles.choiceLabel}>{opt.label}</span>
                <span className={styles.choiceHint}>{opt.hint}</span>
              </button>
            ))}
          </div>

          {selection.focus === "topic" ? (
            <div style={{ marginTop: 16 }}>
              <p className={styles.key}>{CONVERSATION.topicHeading}</p>
              {topics.length === 0 ? (
                <p className={styles.sub}>{CONVERSATION.topicEmpty}</p>
              ) : (
                <div className={styles.pillRow}>
                  {topics.map((t) => {
                    const on = selection.topicIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`${styles.pillBtn} ${styles.pillBtnSoft}`}
                        data-active={on}
                        aria-pressed={on}
                        onClick={() => onTopicToggle(t.id)}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <div style={{ marginTop: 16 }}>
            <p className={styles.key}>{CONVERSATION.periodHeading}</p>
            <div className={styles.pillRow}>
              {[
                { id: "all", label: "All recorded history" },
                { id: "7d", label: "Last 7 days" },
                { id: "30d", label: "Last 30 days" },
                { id: "3m", label: "Last 3 months" },
                { id: "6m", label: "Last 6 months" },
                { id: "custom", label: "Custom range" },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={styles.pillBtn}
                  data-active={selection.range.id === r.id}
                  aria-pressed={selection.range.id === r.id}
                  onClick={() => onChange({ range: { ...selection.range, id: r.id as ConversationSelection["range"]["id"] } })}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {selection.range.id === "custom" ? (
              <div className={styles.row} style={{ marginTop: 10 }}>
                <label className={styles.sub} htmlFor="conv-from">{CONVERSATION.customFrom}</label>
                <input
                  id="conv-from"
                  type="date"
                  className={styles.select}
                  value={selection.range.from ?? ""}
                  onChange={(e) => onChange({ range: { ...selection.range, from: e.target.value } })}
                />
                <label className={styles.sub} htmlFor="conv-to">{CONVERSATION.customTo}</label>
                <input
                  id="conv-to"
                  type="date"
                  className={styles.select}
                  value={selection.range.to ?? ""}
                  onChange={(e) => onChange({ range: { ...selection.range, to: e.target.value } })}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="conv-share">
        <div className={styles.panelHead}>
          <LockIcon size={16} />
          <h2 className={styles.panelTitle} id="conv-share">
            {CONVERSATION.shareHeading}
          </h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.checkGrid}>
            {([
              ["timeline", CONVERSATION.includeTimeline],
              ["changes", CONVERSATION.includeChanges],
              ["summary", CONVERSATION.includeSummary],
              ["context", CONVERSATION.includeContext],
              ["questions", CONVERSATION.includeQuestions],
              ["olderEntries", CONVERSATION.includeOlderEntries],
              ["evidence", CONVERSATION.includeEvidence],
            ] as const).map(([key, label]) => (
              <label key={key} className={styles.checkRow}>
                <input type="checkbox" checked={s[key]} onChange={(e) => onSections({ [key]: e.target.checked })} />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <label className={styles.checkRow} style={{ marginTop: 10 }}>
            <input
              type="checkbox"
              checked={selection.includeUnconfirmed}
              onChange={(e) => onChange({ includeUnconfirmed: e.target.checked })}
            />
            <span>{CONVERSATION.includeUnconfirmed}</span>
          </label>
          <p className={styles.warnNote} style={{ marginTop: 10 }}>
            {CONVERSATION.unconfirmedWarning}
          </p>

          {selection.focus === "questions" || s.questions ? (
            openQuestions.length > 0 ? (
              <div style={{ marginTop: 14 }}>
                <p className={styles.key}>{CONVERSATION.questionHeading}</p>
                <div className={styles.checkGrid}>
                  {openQuestions.map((q) => (
                    <label key={q.id} className={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={selection.questionIds.length === 0 || selection.questionIds.includes(q.id)}
                        onChange={() => onQuestionToggle(q.id)}
                      />
                      <span>{q.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null
          ) : null}
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="conv-style">
        <div className={styles.panelHead}>
          <SparkIcon size={16} />
          <h2 className={styles.panelTitle} id="conv-style">
            {CONVERSATION.styleHeading}
          </h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.choiceGrid}>
            {CONVERSATION.styleOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={styles.choice}
                data-active={selection.style === opt.id}
                aria-pressed={selection.style === opt.id}
                onClick={() => onChange({ style: opt.id })}
              >
                <span className={styles.choiceLabel}>{opt.label}</span>
                <span className={styles.choiceHint}>{opt.hint}</span>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <p className={styles.key}>{CONVERSATION.toneHeading}</p>
            <div className={styles.pillRow}>
              {CONVERSATION.toneOptions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={styles.pillBtn}
                  data-active={selection.tone === t.id}
                  aria-pressed={selection.tone === t.id}
                  onClick={() => onChange({ tone: t.id })}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <p className={styles.key}>{CONVERSATION.personHeading}</p>
            <div className={styles.pillRow}>
              {CONVERSATION.personOptions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={styles.pillBtn}
                  data-active={selection.person === p.id}
                  aria-pressed={selection.person === p.id}
                  onClick={() => onChange({ person: p.id })}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <p className={styles.key}>{CONVERSATION.plainHeading}</p>
            <div className={styles.pillRow}>
              <button
                type="button"
                className={styles.pillBtn}
                data-active={!selection.plainLanguage}
                aria-pressed={!selection.plainLanguage}
                onClick={() => onChange({ plainLanguage: false })}
              >
                {CONVERSATION.plainOff}
              </button>
              <button
                type="button"
                className={styles.pillBtn}
                data-active={selection.plainLanguage}
                aria-pressed={selection.plainLanguage}
                onClick={() => onChange({ plainLanguage: true })}
              >
                {CONVERSATION.plainOn}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="conv-language">
        <div className={styles.panelHead}>
          <SparkIcon size={16} />
          <h2 className={styles.panelTitle} id="conv-language">
            {CONVERSATION.languageHeading}
          </h2>
        </div>
        <div className={styles.panelBody}>
          <label className="sr-only" htmlFor="conv-language-select">
            {CONVERSATION.languageHeading}
          </label>
          <select
            id="conv-language-select"
            className={styles.select}
            value={selection.language}
            onChange={(e) => onChange({ language: e.target.value as ConversationSelection["language"] })}
          >
            {COMMUNICATION_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label} — {l.nativeLabel}
                {l.prototype ? " (prototype)" : ""}
              </option>
            ))}
          </select>
          {isPrototypeLanguage(selection.language) ? (
            <p className={`${styles.tag} ${styles.tagPrototype}`} style={{ marginTop: 10, display: "inline-flex" }}>
              {CONVERSATION.prototypeNote}
            </p>
          ) : null}
          <p className={styles.note}>{CONVERSATION.plannedNote} {PLANNED_LANGUAGES.join(", ")}.</p>
        </div>
      </section>

      <div className={styles.row}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onGenerate}>
          {CONVERSATION.generateCta}
          <ArrowRightIcon size={17} className="btn__arrow" />
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel}>
          {CONVERSATION.cancelCta}
        </button>
      </div>
    </div>
  );
}
