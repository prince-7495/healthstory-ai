"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAnalyzer } from "@/lib/health/analyzeHealthStory";
import { createDemoStory } from "@/lib/health/demo";
import { saveHandoff } from "@/lib/journal/storage";
import {
  ERRORS,
  INPUT,
  INTRO,
  MAIN_ACTION,
  PRIVACY_NOTE,
  type QuickPrompt,
} from "@/lib/health/options";
import {
  createEmptyStory,
  type AnalyzedEvent,
  type HealthStory,
  type PipelineStage,
} from "@/lib/health/types";
import { AlertIcon, ArrowRightIcon, LockIcon } from "../icons";
import AIProcessing from "./AIProcessing";
import AppHeader from "./AppHeader";
import DocumentUpload from "./DocumentUpload";
import ErrorState from "./ErrorState";
import EventManager from "./EventManager";
import ProgressIndicator from "./ProgressIndicator";
import SafetyNotice from "./SafetyNotice";
import StoryAnalysis from "./StoryAnalysis";
import StoryDetailsPanel from "./StoryDetails";
import StoryInput from "./StoryInput";
import StoryPreview from "./StoryPreview";
import StoryResult from "./StoryResult";
import SummaryExperience from "./summary/SummaryExperience";
import styles from "./workspace.module.css";

/**
 * The state machine from the brief, kept explicit so the transitions are
 * inspectable rather than emergent:
 *
 *   EMPTY → EDITING → HAS_INPUT → PROCESSING → RESULT
 *                        ↑                        │
 *                        └────── ERROR ←─────────┘
 *   RESULT → EDITING  (Edit My Story)
 */
type Phase = "EMPTY" | "EDITING" | "HAS_INPUT" | "PROCESSING" | "RESULT" | "ERROR";

type View = "input" | "processing" | "result" | "analysis" | "summary" | "error";

/**
 * The single validation message lives in the action bar, right beside the
 * button that produced it. The textarea references it through
 * `aria-errormessage`, so assistive tech hears it on the field without the
 * text being announced twice.
 */
const ERROR_ID = "story-validation-error";

function hasContent(story: HealthStory) {
  const d = story.details;
  return (
    story.storyText.trim().length > 0 ||
    story.events.length > 0 ||
    story.documents.length > 0 ||
    Boolean(d.start || d.frequency || d.change || d.notes.trim())
  );
}

export default function HealthStoryApp() {
  const router = useRouter();
  const [story, setStory] = useState<HealthStory>(() => createEmptyStory());
  const [view, setView] = useState<View>("input");
  const [touched, setTouched] = useState(false);
  const [stage, setStage] = useState<PipelineStage | null>(null);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  /** Stage 3 event decisions, carried into the Stage 4 summary generator. */
  const [reviewedEvents, setReviewedEvents] = useState<AnalyzedEvent[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const content = hasContent(story);
  const phase: Phase =
    view === "processing"
      ? "PROCESSING"
      : view === "result"
        ? "RESULT"
        : view === "error"
          ? "ERROR"
          : content
            ? "HAS_INPUT"
            : touched
              ? "EDITING"
              : "EMPTY";

  const step: 1 | 2 | 3 | 4 =
    view === "summary"
      ? 4
      : view === "analysis"
        ? 3
        : view === "result" || view === "processing"
          ? 2
          : 1;

  /* ---------- input helpers ---------- */

  const patch = useCallback((changes: Partial<HealthStory>) => {
    setTouched(true);
    setStory((prev) => ({ ...prev, ...changes }));
    setValidationError(null);
  }, []);

  function focusStory() {
    textareaRef.current?.focus();
  }

  function selectPrompt(prompt: QuickPrompt) {
    setPromptId((current) => (current === prompt.id ? null : prompt.id));
    focusStory();
  }

  function insertVoice(text: string) {
    if (!text.trim()) return;
    const current = story.storyText.trim();
    const next = current ? `${current} ${text.trim()}` : text.trim();
    patch({ storyText: next.slice(0, INPUT.charLimit) });
    setStory((prev) => ({ ...prev, voiceInput: null }));
    focusStory();
  }

  function loadDemo() {
    const demo = createDemoStory();
    setStory({ ...demo, organizedStory: story.organizedStory });
    setPromptId(null);
    setIsDemo(true);
    setTouched(true);
    setView("input");
    setDetailsOpen(true);
    focusStory();
  }

  /* ---------- the main action ---------- */

  function scrollToTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  async function organize() {
    // `story` is the current render's value, so the button always acts on
    // exactly what is on screen — including a keystroke from this frame.
    const current = story;

    if (!hasContent(current)) {
      setValidationError(ERRORS.empty);
      focusStory();
      return;
    }

    const onlySparseText =
      current.storyText.trim().length < INPUT.minLength &&
      current.events.length === 0 &&
      !current.details.start &&
      !current.details.frequency &&
      !current.details.change &&
      !current.details.notes.trim();

    if (onlySparseText) {
      setValidationError(ERRORS.tooShort);
      focusStory();
      return;
    }

    setValidationError(null);
    setView("processing");
    setStage(null);
    scrollToTop();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const organized = await getAnalyzer().analyze(
        { ...current, organizedStory: null },
        { signal: controller.signal, onStage: setStage },
      );
      if (controller.signal.aborted) return;
      setStory((prev) => ({ ...prev, organizedStory: organized }));
      setView("result");
      scrollToTop();
    } catch (error) {
      // A cancellation is a user decision, not a failure.
      if (error instanceof DOMException && error.name === "AbortError") {
        setView("input");
        return;
      }
      setView("error");
      scrollToTop();
    } finally {
      abortRef.current = null;
    }
  }

  function cancelProcessing() {
    abortRef.current?.abort();
    setView("input");
  }

  function editStory() {
    setView("input");
    scrollToTop();
    // Let the input view paint before moving focus.
    window.setTimeout(() => focusStory(), 0);
  }

  function goToAnalysis() {
    setView("analysis");
    scrollToTop();
  }

  function goToSummary(events: AnalyzedEvent[]) {
    setReviewedEvents(events);
    setView("summary");
    scrollToTop();
  }

  function startOver() {
    setStory((prev) => ({ ...createEmptyStory(), organizedStory: prev.organizedStory }));
    setReviewedEvents([]);
    setIsDemo(false);
    setPromptId(null);
    setDetailsOpen(false);
    setValidationError(null);
    setView("input");
    scrollToTop();
  }

  /** Stage 5 — carry the confirmed story into the longitudinal journal. */
  function continueToJournal() {
    const events = reviewedEvents.length
      ? reviewedEvents
      : story.organizedStory?.events ?? [];
    saveHandoff({ storyText: story.storyText, events, isDemo });
    router.push("/my-story");
  }

  function addDetail() {
    setView("input");
    setDetailsOpen(true);
    scrollToTop();
    window.setTimeout(() => detailsRef.current?.focus(), 0);
  }

  /* ---------- render ---------- */

  const showWorkspace = view === "input";

  return (
    <div className={styles.shell} data-phase={phase} data-view={view}>
      <AppHeader />
      <ProgressIndicator step={step} />

      <main className="container" id="main">
        {view === "processing" ? (
          <AIProcessing current={stage} onCancel={cancelProcessing} />
        ) : view === "error" ? (
          <ErrorState onRetry={organize} onEdit={editStory} />
        ) : view === "summary" && story.organizedStory ? (
          <SummaryExperience
            story={story.organizedStory}
            storyText={story.storyText}
            events={reviewedEvents.length ? reviewedEvents : story.organizedStory.events}
            isDemo={isDemo}
            onBackToTimeline={goToAnalysis}
            onEditStory={editStory}
            onStartOver={startOver}
            onContinueToJournal={continueToJournal}
          />
        ) : view === "analysis" && story.organizedStory ? (
          <StoryAnalysis
            story={story.organizedStory}
            isDemo={isDemo}
            onEdit={editStory}
            onContinue={goToSummary}
          />
        ) : view === "result" && story.organizedStory ? (
          <>
            <div style={{ paddingTop: 40 }}>
              <StoryResult
                story={story.organizedStory}
                isDemo={isDemo}
                onEdit={editStory}
                onAddDetail={addDetail}
                onContinueToAnalysis={goToAnalysis}
              />
            </div>
          </>
        ) : (
          <>
            <div className={styles.intro}>
              <h1 className={styles.introTitle}>{INTRO.heading}</h1>
              <p className={`lede ${styles.introText}`}>{INTRO.supporting}</p>
            </div>

            <div style={{ marginBottom: 24, maxWidth: 620 }}>
              <SafetyNotice />
            </div>

            {showWorkspace ? (
              <div className={styles.workspace}>
                <div className={styles.colMain}>
                  <StoryInput
                    value={story.storyText}
                    onChange={(storyText) => patch({ storyText })}
                    activePromptId={promptId}
                    onSelectPrompt={selectPrompt}
                    language={story.language}
                    onLanguageChange={(language) => patch({ language })}
                    voiceCapture={story.voiceInput}
                    onVoiceCapture={(voiceInput) => setStory((prev) => ({ ...prev, voiceInput }))}
                    onInsertVoice={insertVoice}
                    onLoadDemo={loadDemo}
                    errorId={validationError ? ERROR_ID : undefined}
                    inputRef={textareaRef}
                  />

                  <div ref={detailsRef} tabIndex={-1}>
                    <StoryDetailsPanel
                      details={story.details}
                      onChange={(changes) =>
                        patch({ details: { ...story.details, ...changes } })
                      }
                      open={detailsOpen}
                      onOpenChange={setDetailsOpen}
                    />
                  </div>

                  <EventManager
                    events={story.events}
                    onChange={(events) => patch({ events })}
                  />

                  <DocumentUpload
                    documents={story.documents}
                    onChange={(documents) => patch({ documents })}
                  />
                </div>

                <div className={styles.colPreview}>
                  <StoryPreview story={story} onWriteFirstNote={focusStory} />
                </div>
              </div>
            ) : null}
          </>
        )}
      </main>

      {showWorkspace ? (
        <div className={styles.actionZone}>
          <div className={`container ${styles.actionInner}`}>
            <div className={styles.actionMeta}>
              <p className={styles.privacy}>
                <LockIcon size={15} className={styles.privacyIcon} />
                <span>{PRIVACY_NOTE}</span>
              </p>
              <p className={styles.actionNotice}>{MAIN_ACTION.notice}</p>
            </div>

            <div className={styles.actionCtaWrap}>
              {validationError ? (
                <p id={ERROR_ID} className={styles.actionError} role="alert">
                  <AlertIcon size={15} />
                  {validationError}
                </p>
              ) : null}
              <button
                type="button"
                className={`btn btn--primary ${styles.actionCta}`}
                onClick={organize}
              >
                {MAIN_ACTION.label}
                <ArrowRightIcon size={18} className="btn__arrow" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}