"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CONVERSATION } from "@/lib/communication/options";
import {
  COMMUNICATION_STAGES,
  type CommunicationStage,
  type ConversationSelection,
  type CommunicationDraft,
  type CommunicationLine,
  type CommunicationValidation,
  type SectionSelection,
  createDefaultSelection,
} from "@/lib/communication/types";
import {
  addJournalQuestion,
  buildConversationContext,
  generateCommunicationDraft,
  removeJournalQuestion,
  reorderJournalQuestions,
  setJournalQuestionStatus,
  suggestQuestions,
  updateJournalQuestion,
  validateCommunication,
} from "@/lib/communication/engine";
import type { StoryJournal, StoryQuestion } from "@/lib/journal/types";
import { CheckIcon, SparkIcon } from "../icons";
import ConversationSetup from "./ConversationSetup";
import ConversationDraftView from "./ConversationDraftView";
import QuestionManager from "./QuestionManager";
import styles from "./communication.module.css";

type Phase = "select" | "generating" | "review" | "final";

type Props = {
  journal: StoryJournal;
  onUpdateJournal: (journal: StoryJournal) => void;
  onExit: () => void;
  /** Stage 9 — pre-selected topics/questions/events from the Insights map. */
  initialSelection?: ConversationSelection;
};

/**
 * ConversationMode — Stage 6 orchestrator.
 *
 * Selection → generation → review → final. The draft is generated from
 * confirmed structured data in the selected language, validated, and stays
 * fully editable. Nothing is shared automatically.
 */
export default function ConversationMode({ journal, onUpdateJournal, onExit, initialSelection }: Props) {
  // Older journals may predate Stage 6 questions, and older data can contain
  // sparse entries — normalize once for the whole component.
  const questions: StoryQuestion[] = (journal.questions ?? []).filter((q): q is StoryQuestion => q !== undefined);
  const [phase, setPhase] = useState<Phase>("select");
  const [selection, setSelection] = useState<ConversationSelection>(() => initialSelection ?? createDefaultSelection());
  const [draft, setDraft] = useState<CommunicationDraft | null>(null);
  const [reference, setReference] = useState<CommunicationDraft | null>(null);
  const [finalDraft, setFinalDraft] = useState<CommunicationDraft | null>(null);
  const [validation, setValidation] = useState<CommunicationValidation>({ ok: true, issues: [] });
  const [stage, setStage] = useState<CommunicationStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(1);

  const ctx = useMemo(() => buildConversationContext(journal, selection), [journal, selection]);

  const buildDraft = useCallback(
    (sel: ConversationSelection, version: number): { draft: CommunicationDraft; reference: CommunicationDraft | null } => {
      const created = generateCommunicationDraft({ journal, selection: sel });
      created.version = version;
      created.languageLabel = sel.language;
      const ref = sel.language !== "en" ? generateCommunicationDraft({ journal, selection: { ...sel, language: "en" } }) : null;
      return { draft: created, reference: ref };
    },
    [journal],
  );

  async function generate() {
    setPhase("generating");
    setStage(null);
    setError(null);
    try {
      for (const st of COMMUNICATION_STAGES) {
        setStage(st.id);
        await new Promise((r) => setTimeout(r, 160));
      }
      versionRef.current = 1;
      const built = buildDraft(selection, 1);
      setDraft(built.draft);
      setReference(built.reference);
      setValidation(validateCommunication(built.draft));
      setPhase("review");
      setStage(null);
    } catch {
      setError(CONVERSATION.errorBody);
      setPhase("select");
    }
  }

  function regenerate(kind: string) {
    let next: ConversationSelection = { ...selection };
    if (kind === "shorter") next = { ...next, style: "QUICK" };
    else if (kind === "simpler") next = { ...next, plainLanguage: true, tone: "SIMPLE" };
    else if (kind === "structured") next = { ...next, tone: "STRUCTURED", style: "STANDARD" };
    else next = { ...next, tone: "CALM" };
    setSelection(next);
    versionRef.current += 1;
    const built = buildDraft(next, versionRef.current);
    setDraft(built.draft);
    setReference(built.reference);
    setValidation(validateCommunication(built.draft));
  }

  function changeLanguage(lang: ConversationSelection["language"]) {
    const next = { ...selection, language: lang };
    setSelection(next);
    if (draft) {
      versionRef.current += 1;
      const built = buildDraft(next, versionRef.current);
      setDraft(built.draft);
      setReference(built.reference);
      setValidation(validateCommunication(built.draft));
    }
  }

  function editLine(section: string, id: string, text: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      const localized = selection.language === "en";
      const mark = (l: CommunicationLine): CommunicationLine => ({ ...l, text, userEdited: true, localized });
      switch (section) {
        case "whatINoticed":
        case "timeline":
        case "reportedChanges":
        case "relevantContext":
          return {
            ...prev,
            userEdited: true,
            [section]: prev[section].map((l) => (l.id === id ? mark(l) : l)),
          } as CommunicationDraft;
        case "recentUpdate":
          return prev.recentUpdate
            ? { ...prev, userEdited: true, recentUpdate: mark(prev.recentUpdate) }
            : prev;
        default:
          return prev;
      }
    });
  }

  function discard() {
    setDraft(null);
    setReference(null);
    setFinalDraft(null);
    setPhase("select");
  }

  function useVersion() {
    if (!draft) return;
    setFinalDraft(draft);
    setPhase("final");
  }

  function patch(p: Partial<ConversationSelection>) {
    setSelection((prev) => ({ ...prev, ...p }));
  }
  function patchSections(p: Partial<SectionSelection>) {
    setSelection((prev) => ({ ...prev, sections: { ...prev.sections, ...p } }));
  }
  function toggleTopic(id: string) {
    setSelection((prev) => ({
      ...prev,
      topicIds: prev.topicIds.includes(id) ? prev.topicIds.filter((t) => t !== id) : [...prev.topicIds, id],
    }));
  }
  function toggleQuestion(id: string) {
    setSelection((prev) => ({
      ...prev,
      questionIds: prev.questionIds.includes(id)
        ? prev.questionIds.filter((q) => q !== id)
        : [...prev.questionIds, id],
    }));
  }

  /* ---------- render ---------- */

  const layoutClass = phase === "review" || phase === "final" ? styles.layout : "";

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.badgeRow}>
          <span className={styles.badge}>
            <SparkIcon size={14} />
            {CONVERSATION.featureName}
          </span>
          <span className={`${styles.badge} ${styles.badgeGhost}`}>{CONVERSATION.principle}</span>
          {journal.preferences.demoMode ? (
            <span className={`${styles.badge} ${styles.badgeWarn}`}>{CONVERSATION.demoLabel}</span>
          ) : null}
        </div>
        <h1 className={styles.title}>{CONVERSATION.entryHeading}</h1>
        <p className={styles.lead}>{CONVERSATION.entrySupporting}</p>
        <p className={styles.note}>{CONVERSATION.principleSub}</p>
      </header>

      {error ? (
        <div className={styles.alert} role="alert">
          <p className={styles.alertTitle}>{CONVERSATION.errorHeading}</p>
          <p className={styles.alertText}>{error}</p>
          <div className={styles.row} style={{ marginTop: 10 }}>
            <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={generate}>
              {CONVERSATION.tryAgainCta}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onExit}>
              {CONVERSATION.viewStoryCta}
            </button>
          </div>
        </div>
      ) : null}

      {phase === "select" ? (
        <ConversationSetup
          selection={selection}
          topics={journal.topics}
          questions={questions}
          onChange={patch}
          onSections={patchSections}
          onTopicToggle={toggleTopic}
          onQuestionToggle={toggleQuestion}
          onGenerate={generate}
          onCancel={onExit}
        />
      ) : phase === "generating" ? (
        <div className={styles.generating}>
          <h2 className={styles.title} style={{ fontSize: "1.4rem" }}>
            {CONVERSATION.generatingHeading}
          </h2>
          <p className={styles.lead}>{CONVERSATION.generatingSub}</p>
          <div className={styles.stages} aria-live="polite">
            {COMMUNICATION_STAGES.map((s, i) => {
              const index = stage ? COMMUNICATION_STAGES.findIndex((x) => x.id === stage) : -1;
              const state = i < index ? "done" : i === index ? "active" : "todo";
              return (
                <div key={s.id} className={styles.stage} data-state={state}>
                  <span className={styles.stageDot} aria-hidden="true">
                    {state === "done" ? <CheckIcon size={12} /> : i + 1}
                  </span>
                  <span className={styles.stageText}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={`${styles.layout} ${layoutClass}`}>
          {phase === "final" && finalDraft ? (
            <div className={styles.col}>
              <div className={styles.banner}>
                <h2 className={styles.bannerTitle}>{CONVERSATION.finalBanner}</h2>
                <p className={styles.bannerSub}>{CONVERSATION.finalBannerSub}</p>
              </div>
              <ConversationDraftView
                draft={finalDraft}
                referenceDraft={reference}
                validation={validation}
                events={journal.events}
                conflicts={ctx.conflicts}
                onEditLine={() => undefined}
                onRegenerate={() => undefined}
                onLanguageChange={changeLanguage}
                onDiscard={discard}
                onUseVersion={() => undefined}
              />
              <div className={styles.row}>
                <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setPhase("review")}>
                  {CONVERSATION.backToEditingCta}
                </button>
                <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onExit}>
                  {CONVERSATION.viewStoryCta}
                </button>
              </div>
            </div>
          ) : draft ? (
            <>
              <ConversationDraftView
                draft={draft}
                referenceDraft={reference}
                validation={validation}
                events={journal.events}
                conflicts={ctx.conflicts}
                onEditLine={editLine}
                onRegenerate={regenerate}
                onLanguageChange={changeLanguage}
                onDiscard={discard}
                onUseVersion={useVersion}
              />
              <div className={styles.col}>
                <section className={styles.panel} aria-labelledby="conv-questions">
                  <div className={styles.panelHead}>
                    <h2 className={styles.panelTitle} id="conv-questions">
                      {CONVERSATION.questionHeading}
                    </h2>
                    <span className={styles.panelCount}>{questions.filter((q) => q.status !== "REMOVED").length}</span>
                  </div>
                  <div className={styles.panelBody}>
                    <QuestionManager
                      questions={questions}
                      onAdd={(text) => onUpdateJournal(addJournalQuestion(journal, text, "USER"))}
                      onUpdate={(id, text) => onUpdateJournal(updateJournalQuestion(journal, id, text))}
                      onRemove={(id) => onUpdateJournal(removeJournalQuestion(journal, id))}
                      onToggleDiscussed={(id) =>
                        onUpdateJournal(
                          setJournalQuestionStatus(
                            journal,
                            id,
                            questions.find((q) => q.id === id)?.status === "DISCUSSED" ? "OPEN" : "DISCUSSED",
                          ),
                        )
                      }
                      onReorder={(from, to) => {
                        // reorderJournalQuestions expects (journal, questionIds), but we have from/to indices
                        const visibleQuestions = questions.filter((q) => q.status !== "REMOVED");
                        const questionIds = visibleQuestions.map((q) => q.id);
                        // Move the item from 'from' index to 'to' index
                        const [removed] = questionIds.splice(from, 1);
                        questionIds.splice(to, 0, removed);
                        return onUpdateJournal(reorderJournalQuestions(journal, questionIds));
                      }}
                      onSuggest={() => {
                        const existing = new Set(questions.map((q) => q.text));
                        let next = journal;
                        for (const s of suggestQuestions(next)) {
                          if (!existing.has(s)) next = addJournalQuestion(next, s, "AI_SUGGESTED");
                        }
                        onUpdateJournal(next);
                      }}
                    />
                  </div>
                </section>

                {!selection.includeUnconfirmed && ctx.unconfirmedCount > 0 ? (
                  <p className={styles.warnNote}>{CONVERSATION.unconfirmedWarning}</p>
                ) : null}
                <p className={styles.disclaimer}>{CONVERSATION.safetyNotice}</p>
                <p className={styles.disclaimer}>{CONVERSATION.privacyNote}</p>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
