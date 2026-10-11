"use client";

import { useMemo, useRef, useState } from "react";
import { UNDERSTAND } from "@/lib/understand/options";
import {
  DEMO_DOCUMENT_FILENAME,
  DEMO_DOCUMENT_TEXT,
  processDocument,
  type DocumentImportEvent,
} from "@/lib/understand/engine";
import type {
  ExplanationComplexity,
  HealthDocument,
  StoryJournal,
} from "@/lib/journal/types";
import { makeId, toAnalyzedEvent } from "@/lib/health/types";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  GlobeIcon,
  QuestionIcon,
  ReadIcon,
  SparkIcon,
} from "../icons";
import UnderstandHome from "./UnderstandHome";
import DocumentUpload from "./DocumentUpload";
import DocumentUnderstanding from "./DocumentUnderstanding";
import DocumentQandA from "./DocumentQandA";
import ConnectToStory from "./ConnectToStory";
import styles from "./understand.module.css";

type Phase = "home" | "preview" | "understand" | "qa" | "connect";

type Props = {
  journal: StoryJournal;
  onUpdateJournal: (journal: StoryJournal) => void;
  onExit: () => void;
  onGoToConversation: () => void;
  onGoToFollowUp: () => void;
};

/**
 * UnderstandMode — Stage 8 orchestrator.
 *
 * home → preview → understand → (qa | connect) → back to story.
 * Every path is user-initiated; nothing is written into the story
 * without the review step in ConnectToStory.
 */
export default function UnderstandMode({
  journal,
  onUpdateJournal,
  onExit,
  onGoToConversation,
  onGoToFollowUp,
}: Props) {
  const [phase, setPhase] = useState<Phase>("home");
  const [file, setFile] = useState<{ name: string; type: string; size: number; text: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentDoc, setCurrentDoc] = useState<HealthDocument | null>(null);
  const [complexity, setComplexity] = useState<ExplanationComplexity>("SIMPLE");
  const [language, setLanguage] = useState("en");
  const [savedTerms, setSavedTerms] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [discussQuestion, setDiscussQuestion] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const documents = useMemo(() => journal.documents ?? [], [journal.documents]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3400);
  }

  function pickFile(f: { name: string; type: string; size: number; text: string }) {
    setError(null);
    if (!f.text.trim()) {
      setError("We could only read plain text files in this prototype. Paste the text instead.");
      setFile(f);
      return;
    }
    setFile(f);
    setPhase("preview");
  }

  async function understand(selectedText?: string) {
    if (!file) return;
    const payload = selectedText ? { ...file, text: selectedText, size: selectedText.length } : file;
    const controller = new AbortController();
    abortRef.current = controller;
    setProcessing(true);
    setStageIndex(0);
    setError(null);
    try {
      const doc = await processDocument(journal, payload, {
        signal: controller.signal,
        onStage: (stage) => setStageIndex(UNDERSTAND.processingStages.indexOf(stage as never)),
      });
      setCurrentDoc(doc);
      setPhase("understand");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        notify("Processing cancelled. Nothing was stored.");
        setPhase("preview");
      } else {
        setError("We couldn't organize that document. Your text is still available — you can try again.");
        setPhase("preview");
      }
    } finally {
      setProcessing(false);
      setStageIndex(0);
      abortRef.current = null;
    }
  }

  function cancelProcessing() {
    abortRef.current?.abort();
  }

  function openDocument(id: string) {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    setCurrentDoc(doc);
    setPhase("understand");
  }

  function removeDocument(id: string) {
    onUpdateJournal({
      ...journal,
      documents: (journal.documents ?? []).filter((d) => d.id !== id),
      activity: [
        {
          id: makeId("act"),
          at: new Date().toISOString(),
          type: "update_removed" as const,
          label: "Removed a health document",
        },
        ...journal.activity,
      ].slice(0, 60),
    });
    notify("Document removed from this prototype.");
    if (currentDoc?.id === id) {
      setCurrentDoc(null);
      setPhase("home");
    }
  }

  function saveTerm(termId: string) {
    setSavedTerms((s) => (s.includes(termId) ? s : [...s, termId]));
    notify("Saved to My Health Vocabulary.");
  }

  /** The Stage 8 → story handoff. Only source-grounded, user-chosen items. */
  function confirmImport(payload: {
    events: DocumentImportEvent[];
    followUpText?: string;
    conversationItems: string[];
    docLabel: string;
  }) {
    const now = new Date().toISOString();
    const docId = currentDoc?.id;
    const docLabel = payload.docLabel;

    const newEvents = payload.events.map((e) =>
      toAnalyzedEvent({
        id: makeId("ev"),
        date: e.date ?? null,
        dateLabel: e.date ? "From document" : "Date not provided",
        datePrecision: e.date ? "exact" : "unknown",
        description: e.description ?? e.title,
        frequency: null,
        change: null,
        notes: "",
        origin: "user",
        title: e.title,
        category: e.category ?? "other",
        dateText: e.date ?? "",
        sourceText: e.sourceText,
        label: e.title,
        timeLabel: e.date ? "From document" : "Date not provided",
        extractionConfidence: "medium",
        status: "CONFIRMED",
        needsConfirmation: false,
        metadata: { ...e.metadata, sourceLabel: `Source: Uploaded document (${docLabel})` },
      })
    );

    const next: StoryJournal = {
      ...journal,
      updatedAt: now,
      documents: (journal.documents ?? []).map((d) =>
        d.id === docId
          ? { ...d, status: "ANALYZED" as const, relatedFollowUpId: d.relatedFollowUpId }
          : d
      ),
      events: [...journal.events, ...newEvents],
      followUps: payload.followUpText
        ? [
            {
              id: makeId("followup"),
              createdAt: now,
              eventDate: currentDoc?.analysis?.dates[0],
              eventDatePrecision: "APPROXIMATE" as const,
              type: "REPORT" as const,
              originalText: payload.followUpText,
              language: "English",
              extractedItems: [
                {
                  id: makeId("fitem"),
                  type: "INFORMATION" as const,
                  text: payload.followUpText,
                  sourceText: payload.followUpText,
                  sourceType: "UPLOADED_DOCUMENT" as const,
                  confidence: "HIGH" as const,
                  status: "AI_ORGANIZED" as const,
                },
              ],
              relatedTopicIds: [],
              relatedEventIds: [],
              questionIds: [],
              status: "REVIEW" as const,
            },
            ...(journal.followUps ?? []),
          ]
        : journal.followUps,
      activity: [
        {
          id: makeId("act"),
          at: now,
          type: "update_added" as const,
          label: `Added ${newEvents.length} item${newEvents.length === 1 ? "" : "s"} from ${docLabel}`,
        },
        ...journal.activity,
      ].slice(0, 60),
    };

    onUpdateJournal(next);
    setSavedTerms([]);
    setPhase("home");
    setCurrentDoc(null);
    notify("Your HealthStory has been updated.");

    if (payload.conversationItems.length > 0) {
      window.setTimeout(() => onGoToConversation(), 600);
    } else if (payload.followUpText) {
      window.setTimeout(() => onGoToFollowUp(), 600);
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.badgeRow}>
          <span className={styles.badge}>
            <ReadIcon size={14} />
            {UNDERSTAND.featureName}
          </span>
          <span className={`${styles.badge} ${styles.badgeGhost}`}>
            AI organizes · Evidence explains · Humans verify
          </span>
          <span className={`${styles.badge} ${styles.badgeWarn}`}>{UNDERSTAND.demoLabel}</span>
        </div>
        <h1 className={styles.title}>{UNDERSTAND.homeHeading}</h1>
        <p className={styles.lead}>{UNDERSTAND.homeSupporting}</p>
      </header>

      {phase === "home" ? (
        <>
          <div className={styles.row}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => {
                pickFile({
                  name: DEMO_DOCUMENT_FILENAME,
                  type: "text/plain",
                  size: DEMO_DOCUMENT_TEXT.length,
                  text: DEMO_DOCUMENT_TEXT,
                });
              }}
            >
              <SparkIcon size={15} />
              Try the example blood test report
            </button>
            <span className={styles.sub}>{UNDERSTAND.demoReportHint}</span>
          </div>

          <UnderstandHome
            documents={documents}
            onPickFile={pickFile}
            onPasteText={(text) =>
              pickFile({
                name: "pasted_text.txt",
                type: "text/plain",
                size: text.length,
                text,
              })
            }
            onOpenDocument={openDocument}
            onRemoveDocument={removeDocument}
            onCancel={onExit}
          />

          <section className={styles.panel} aria-labelledby="understand-safety">
            <div className={styles.panelHead}>
              <AlertIcon size={16} />
              <h2 className={styles.panelTitle} id="understand-safety">
                Safety &amp; boundaries
              </h2>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.alert}>
                <p className={styles.alertTitle}>No clinical interpretation</p>
                <p className={styles.alertText}>{UNDERSTAND.noClinicalInterpretation}</p>
              </div>
              <div className={styles.alert} style={{ marginTop: 10 }}>
                <p className={styles.alertTitle}>Emergency boundary</p>
                <p className={styles.alertText}>{UNDERSTAND.emergencyNotice}</p>
              </div>
              <p className={styles.note} style={{ marginTop: 12 }}>
                {UNDERSTAND.translateVsExplain.translate} · {UNDERSTAND.translateVsExplain.explain} ·{" "}
                {UNDERSTAND.translateVsExplain.simplify}
              </p>
              <p className={styles.disclaimer}>{UNDERSTAND.disclaimer}</p>
            </div>
          </section>
        </>
      ) : null}

      {phase === "preview" && file ? (
        <DocumentUpload
          file={file}
          processing={processing}
          stageIndex={stageIndex}
          error={error}
          onUnderstand={(selectedText) => void understand(selectedText)}
          onCancelProcessing={cancelProcessing}
          onRemove={() => {
            setFile(null);
            setPhase("home");
          }}
        />
      ) : null}

      {phase === "understand" && currentDoc ? (
        <>
          <DocumentUnderstanding
            document={currentDoc}
            complexity={complexity}
            onComplexity={setComplexity}
            language={language}
            onLanguage={setLanguage}
            savedTerms={savedTerms}
            onSaveTerm={saveTerm}
            onAskAboutDocument={() => setPhase("qa")}
            onConnectToStory={() => setPhase("connect")}
          />
          <div className={styles.row}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => {
                setFile(null);
                setCurrentDoc(null);
                setPhase("home");
              }}
            >
              <ArrowRightIcon size={15} style={{ transform: "rotate(180deg)" }} />
              Back to Understand
            </button>
            <button type="button" className={styles.linkBtn} onClick={onExit}>
              Back to My Story
            </button>
          </div>
        </>
      ) : null}

      {phase === "qa" && currentDoc ? (
        <>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => setPhase("understand")}
          >
            <ArrowRightIcon size={13} style={{ transform: "rotate(180deg)" }} />
            Back to the document
          </button>
          <DocumentQandA
            document={currentDoc}
            onDiscussThis={(q) => setDiscussQuestion(q)}
          />
          {discussQuestion ? (
            <section className={styles.panel} aria-labelledby="discuss-heading">
              <div className={styles.panelHead}>
                <QuestionIcon size={16} />
                <h2 className={styles.panelTitle} id="discuss-heading">
                  {UNDERSTAND.discussHeading}
                </h2>
              </div>
              <div className={styles.panelBody}>
                <p className={styles.sub}>
                  Here is a neutral question you could take to a professional:
                </p>
                <div className={styles.stackBody} style={{ marginTop: 10 }}>
                  &ldquo;{discussQuestion.replace(/^what does/i, "Could you explain what")} in my
                  situation?&rdquo;
                </div>
                <div className={styles.row} style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                    onClick={() => {
                      setDiscussQuestion(null);
                      onExit();
                    }}
                  >
                    <CheckIcon size={13} />
                    Add to my questions
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                    onClick={() => setDiscussQuestion(null)}
                  >
                    Close
                  </button>
                </div>
                <p className={styles.note}>{UNDERSTAND.noProfessionalAnswer}</p>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {phase === "connect" && currentDoc ? (
        <>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => setPhase("understand")}
          >
            <ArrowRightIcon size={13} style={{ transform: "rotate(180deg)" }} />
            Back to the document
          </button>
          <ConnectToStory
            document={currentDoc}
            onConfirm={confirmImport}
            onCancel={() => setPhase("understand")}
          />
        </>
      ) : null}

      <div className={styles.row}>
        <span className={styles.sub}>
          <GlobeIcon size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Language bridge: English · हिन्दी · ગુજરાતી (prototype translations clearly labelled)
        </span>
      </div>

      {toast ? (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
