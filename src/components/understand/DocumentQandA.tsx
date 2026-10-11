"use client";

import { useState } from "react";
import { UNDERSTAND } from "@/lib/understand/options";
import { answerDocumentQuestion } from "@/lib/understand/engine";
import type { HealthDocument, SourceReference } from "@/lib/journal/types";
import { ArrowRightIcon, CheckIcon, InfoIcon, QuestionIcon, QuoteIcon } from "../icons";
import styles from "./understand.module.css";

type Answer = {
  question: string;
  answer: string;
  sources: SourceReference[];
  hasGrounding: boolean;
  stage: string | null;
};

type Props = {
  document: HealthDocument;
  onDiscussThis: (question: string) => void;
};

/**
 * DocumentQandA — document-bounded questions only.
 *
 * Answers are retrieved from the user's own document. When the document
 * does not say enough, the UI says exactly that instead of inventing an
 * answer (§75 hallucination defence).
 */
export default function DocumentQandA({ document, onDiscussThis }: Props) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Answer[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask() {
    const q = question.trim();
    if (!q) return;
    setQuestion("");
    setHistory((h) => [...h, { question: q, answer: "", sources: [], hasGrounding: false, stage: "Finding relevant sections" }]);
    setBusy(true);
    try {
      const res = await answerDocumentQuestion(document, q, {
        onStage: (stage) =>
          setHistory((h) => {
            const copy = [...h];
            copy[copy.length - 1] = { ...copy[copy.length - 1], stage };
            return copy;
          }),
      });
      setHistory((h) => {
        const copy = [...h];
        copy[copy.length - 1] = {
          question: q,
          answer: res.answer,
          sources: res.sources,
          hasGrounding: res.hasDocumentGrounding,
          stage: null,
        };
        return copy;
      });
    } catch {
      setHistory((h) => {
        const copy = [...h];
        copy[copy.length - 1] = {
          question: q,
          answer: UNDERSTAND.questionNoAnswer,
          sources: [],
          hasGrounding: false,
          stage: null,
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="doc-qa">
      <div className={styles.panelHead}>
        <QuestionIcon size={16} />
        <h2 className={styles.panelTitle} id="doc-qa">
          {UNDERSTAND.questionModeHeading}
        </h2>
        <span className={styles.panelCount}>document-bounded</span>
      </div>
      <div className={styles.panelBody}>
        <label className={styles.fieldLabel} htmlFor="doc-question">
          {UNDERSTAND.questionModeHeading}
        </label>
        <div className={styles.row} style={{ alignItems: "stretch" }}>
          <input
            id="doc-question"
            type="text"
            className={styles.input}
            style={{ flex: "1 1 240px" }}
            placeholder={UNDERSTAND.questionPlaceholder}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void ask();
            }}
          />
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={busy || !question.trim()}
            onClick={() => void ask()}
          >
            {busy ? "Asking…" : UNDERSTAND.questionAskCta}
            <ArrowRightIcon size={16} />
          </button>
        </div>
        <p className={styles.note}>{UNDERSTAND.questionSafetyNote}</p>

        <div style={{ marginTop: 16 }}>
          {history.length === 0 ? (
            <p className={styles.sub}>
              Try: {UNDERSTAND.questionsToAsk.examples[0]}
            </p>
          ) : (
            history.map((h, i) => (
              <div key={`${i}-${h.question}`} className={styles.qaItem}>
                <p className={styles.qaQ}>{h.question}</p>
                {h.stage ? <p className={styles.sub} aria-live="polite">{h.stage}…</p> : null}
                {h.answer ? (
                  <>
                    <p className={styles.qaA}>{h.answer}</p>
                    <div className={styles.qaMeta}>
                      <span className={`${styles.tag} ${styles.tagMuted}`}>
                        <QuoteIcon size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />
                        Source: {h.hasGrounding ? `Page ${h.sources[0]?.pageNumber ?? 1}` : "not found in document"}
                      </span>
                      {!h.hasGrounding ? (
                        <span className={`${styles.tag} ${styles.tagWarn}`}>No matching source</span>
                      ) : null}
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => onDiscussThis(h.question)}
                      >
                        {UNDERSTAND.discussThisCta}
                      </button>
                    </div>
                    {!h.hasGrounding ? (
                      <p className={styles.note} style={{ color: "#8a6414" }}>
                        {UNDERSTAND.noSourceNote}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className={styles.safeNote} style={{ marginTop: 12 }}>
          <InfoIcon size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
          {UNDERSTAND.questionSafetyNote}
        </div>
        <p className={styles.disclaimer} style={{ marginTop: 10 }}>{UNDERSTAND.disclaimer}</p>
        <p className={styles.note}>
          <CheckIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          {UNDERSTAND.translateVsExplain.dontCombine}
        </p>
      </div>
    </section>
  );
}
