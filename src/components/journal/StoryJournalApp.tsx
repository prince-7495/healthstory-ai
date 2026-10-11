"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { JOURNAL } from "@/lib/journal/options";
import {
  addGeneratedSummary,
  applyUpdate,
  computeFrequencySeries,
  computeOverview,
  computePatterns,
  computeTopicHistory,
  createEmptyJournal,
  createSnapshot,
  deleteSnapshot,
  editEvolution,
  filterEvents,
  generateSummaryFromJournal,
  latestUpdateLine,
  mergeTopics,
  presentCategories,
  processUpdate,
  resolveContradiction,
  setEvolutionStatus,
  summaryState,
  type EventFilters,
  type UpdateStage,
} from "@/lib/journal/engine";
import { createDemoJournal } from "@/lib/journal/demo";
import {
  buildJournalFromHandoff,
  clearJournal,
  consumeHandoff,
  isStorageAvailable,
  loadJournal,
  saveJournal,
} from "@/lib/journal/storage";
import type {
  EvolutionStatus,
  StoryJournal,
  StoryPreferences,
} from "@/lib/journal/types";
import type { SummaryLength } from "@/lib/health/summary";
import type { ConversationSelection } from "@/lib/communication/types";
import { summaryToPlainText } from "@/lib/health/summary";
import { LockIcon, PlusIcon, SparkIcon } from "../icons";
import AppHeader from "../workspace/AppHeader";
import AddUpdate from "./AddUpdate";
import JournalEvolutions from "./JournalEvolutions";
import JournalInsights from "./JournalInsights";
import JournalOverview from "./JournalOverview";
import JournalSettings from "./JournalSettings";
import JournalSnapshots from "./JournalSnapshots";
import JournalSummary from "./JournalSummary";
import JournalTimeline from "./JournalTimeline";
import TopicHistoryDrawer from "./TopicHistoryDrawer";
import UpdateResult, { type UpdateDecisions } from "./UpdateResult";
import ConversationMode from "../communication/ConversationMode";
import CommunicationCard from "../communication/CommunicationCard";
import FollowUpMode from "../followup/FollowUpMode";
import FollowUpCard from "../followup/FollowUpCard";
import UnderstandMode from "../understand/UnderstandMode";
import UnderstandCard from "../understand/UnderstandCard";
import InsightsMode from "../insights/InsightsMode";
import InsightsCard from "../insights/InsightsCard";
import styles from "./journal.module.css";

type View = "dashboard" | "add" | "review" | "conversation" | "followup" | "understand" | "insights";

/**
 * StoryJournalApp — the Stage 5 orchestrator.
 *
 * Loads the journal from local storage (or a handoff from the workspace),
 * runs the update pipeline, applies only what the user confirms, and keeps
 * the whole story on the user's own device.
 */
export default function StoryJournalApp() {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [journal, setJournal] = useState<StoryJournal | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<UpdateStage | null>(null);
  const [pending, setPending] = useState<Awaited<ReturnType<typeof processUpdate>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageOk, setStorageOk] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [topicLabel, setTopicLabel] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>({ range: "all", categories: [], query: "" });
  const [conversationPreload, setConversationPreload] = useState<ConversationSelection | null>(null);

  const toastTimer = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ---------- load ---------- */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const ok = isStorageAvailable();
      setStorageOk(ok);
      const handoff = consumeHandoff();
      const stored = loadJournal();
      if (handoff) {
        const built = buildJournalFromHandoff(handoff);
        setJournal(built);
        if (ok) saveJournal(built);
      } else if (stored) {
        setJournal(stored);
      } else {
        setJournal(null);
      }
      setStatus("ready");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  /* ---------- persist ---------- */
  useEffect(() => {
    if (!journal || status !== "ready") return;
    if (!storageOk || !journal.preferences.saveUpdates) return;
    saveJournal(journal);
  }, [journal, status, storageOk]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      abortRef.current?.abort();
    };
  }, []);

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3400);
  }

  /* ---------- update flow ---------- */
  async function handleOrganize(content: string) {
    const base = journal ?? createEmptyJournal();
    setProcessing(true);
    setError(null);
    setStage(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const analysis = await processUpdate(base, content, { onStage: setStage, signal: controller.signal });
      if (controller.signal.aborted) return;
      setPending(analysis);
      setView("review");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // The user's text is never lost — it stays in the textarea.
      setError("We couldn't organize that update. Your words are still here — you can try again.");
    } finally {
      setProcessing(false);
      setStage(null);
      abortRef.current = null;
    }
  }

  function handleApply(decisions: UpdateDecisions) {
    if (!pending) return;
    const base = journal ?? createEmptyJournal();
    let next = applyUpdate(base, pending);
    for (const [id, value] of Object.entries(decisions.status)) {
      if (value !== "AI_ORGANIZED") next = setEvolutionStatus(next, id, value);
    }
    for (const [id, choice] of Object.entries(decisions.correction)) {
      if (choice === "replace") next = resolveContradiction(next, id, "later");
      if (choice === "keep") next = setEvolutionStatus(next, id, "CONFIRMED");
    }
    for (const [existingTopicId, shouldMerge] of Object.entries(decisions.merge)) {
      if (!shouldMerge) continue;
      const match = pending.possibleMatches.find((m) => m.existingTopicId === existingTopicId);
      if (match) next = mergeTopics(next, existingTopicId, match.newLabel);
    }
    setJournal(next);
    setPending(null);
    setView("dashboard");
    notify(
      pending.summaryStatus === "UPDATE_RECOMMENDED"
        ? "Update added — your summary may be out of date."
        : "Update recorded.",
    );
  }

  function handleDiscard() {
    setPending(null);
    setView("dashboard");
  }

  function handleEvolutionStatus(id: string, value: EvolutionStatus) {
    if (!journal) return;
    setJournal(setEvolutionStatus(journal, id, value));
    notify(value === "CONFIRMED" ? "Change confirmed." : value === "DISMISSED" ? "Change dismissed." : "Change updated.");
  }

  function handleEditEvolution(id: string, updates: { previousValue?: string; currentValue?: string; description?: string }) {
    if (!journal) return;
    setJournal(editEvolution(journal, id, updates));
  }

  /* ---------- summary / snapshots / settings ---------- */
  function handleGenerateSummary(length: SummaryLength) {
    if (!journal) return;
    const summary = generateSummaryFromJournal(journal, length);
    setJournal(addGeneratedSummary(journal, summary));
    notify(`Summary v${summary.version} created from your story.`);
  }

  async function handleExport() {
    if (!journal) return;
    const latest = summaryState(journal).latest;
    if (!latest) {
      notify("There is no summary to export yet.");
      return;
    }
    const text = summaryToPlainText(latest, {
      events: journal.events,
      demoLabel: journal.preferences.demoMode ? JOURNAL.demoLabel : undefined,
    });
    try {
      await navigator.clipboard.writeText(text);
      notify("Latest summary copied to your clipboard.");
    } catch {
      notify("Copying isn't available in this browser.");
    }
  }

  function handleDeleteSummary(id: string) {
    if (!journal) return;
    setJournal({ ...journal, summaries: journal.summaries.filter((s) => s.id !== id) });
    notify("Summary version removed.");
  }

  function handleCreateSnapshot(name: string) {
    if (!journal) return;
    setJournal(createSnapshot(journal, name));
    notify(JOURNAL.snapshotCreated);
  }

  function handleDeleteSnapshot(id: string) {
    if (!journal) return;
    setJournal(deleteSnapshot(journal, id));
  }

  function handleTogglePreference(key: keyof StoryPreferences, value: boolean) {
    if (!journal) return;
    setJournal({ ...journal, preferences: { ...journal.preferences, [key]: value } });
  }

  function handleDeleteStory() {
    clearJournal();
    setJournal(null);
    setView("dashboard");
    notify(JOURNAL.deletedNote);
  }

  function handleStartFresh() {
    setJournal(createEmptyJournal());
    setView("dashboard");
    notify("Started a new story.");
  }

  function handleLoadDemo() {
    const demo = createDemoJournal();
    setJournal(demo);
    if (storageOk) saveJournal(demo);
    setView("dashboard");
    notify(JOURNAL.demoLabel);
  }

  /* ---------- derived ---------- */
  const overview = useMemo(() => (journal ? computeOverview(journal) : null), [journal]);
  const patterns = useMemo(() => (journal ? computePatterns(journal) : []), [journal]);
  const frequencySeries = useMemo(() => (journal ? computeFrequencySeries(journal) : []), [journal]);
  const summarySt = useMemo(() => (journal ? summaryState(journal) : { hasSummary: false, outOfDate: false }), [journal]);
  const filteredEvents = useMemo(() => (journal ? filterEvents(journal, filters) : []), [journal, filters]);
  const categories = useMemo(() => (journal ? presentCategories(journal) : []), [journal]);
  const recentChanges = useMemo(
    () =>
      journal
        ? journal.evolutions
            .filter((e) => e.status !== "DISMISSED" && e.changeType !== "new_information" && e.changeType !== "continued")
            .slice(-3)
            .reverse()
        : [],
    [journal],
  );
  const topicHistory = useMemo(() => {
    if (!journal || !topicLabel) return null;
    const topic = journal.topics.find((t) => t.label.toLowerCase() === topicLabel.toLowerCase());
    return topic ? computeTopicHistory(journal, topic.id) : null;
  }, [journal, topicLabel]);

  const isEmpty = !journal || journal.entries.length === 0;

  /* ---------- render ---------- */
  return (
    <div className={styles.shell}>
      <AppHeader />

      <main className="container" id="main">
        {status === "loading" ? (
          <div className={styles.page}>
            <p className={styles.sub}>{JOURNAL.storyRecovered}</p>
          </div>
        ) : view === "conversation" && journal ? (
          <div className={styles.page}>
            <ConversationMode
              journal={journal}
              onUpdateJournal={setJournal}
              onExit={() => setView("dashboard")}
              initialSelection={conversationPreload ?? undefined}
            />
          </div>
        ) : view === "followup" && journal ? (
          <div className={styles.page}>
            <FollowUpMode
              journal={journal}
              onUpdateJournal={setJournal}
              onExit={() => setView("dashboard")}
            />
          </div>
        ) : view === "understand" && journal ? (
          <div className={styles.page}>
            <UnderstandMode
              journal={journal}
              onUpdateJournal={setJournal}
              onExit={() => setView("dashboard")}
              onGoToConversation={() => setView("conversation")}
              onGoToFollowUp={() => setView("followup")}
            />
          </div>
        ) : view === "insights" && journal ? (
          <div className={styles.page}>
            <InsightsMode
              journal={journal}
              demoMode={journal.preferences.demoMode}
              onUpdateJournal={setJournal}
              onExit={() => setView("dashboard")}
              onGoToConversation={(selection) => {
                setConversationPreload(selection);
                setView("conversation");
              }}
              onGoToUnderstand={() => setView("understand")}
              onGoToAddEntry={() => setView("add")}
              notify={notify}
            />
          </div>
        ) : (
          <div className={styles.page}>
            <header className={styles.head}>
              <div className={styles.badgeRow}>
                <span className={styles.badge}>
                  <SparkIcon size={14} />
                  {JOURNAL.featureName}
                </span>
                {journal?.preferences.demoMode ? (
                  <span className={`${styles.badge} ${styles.badgeWarn}`}>{JOURNAL.demoLabel}</span>
                ) : null}
                <span className={`${styles.badge} ${styles.badgeGhost}`}>
                  <LockIcon size={13} />
                  {JOURNAL.privacyPrivate}
                </span>
              </div>
              <h1 className={styles.title}>{JOURNAL.dashboardHeading}</h1>
              <p className={styles.lead}>{JOURNAL.dashboardSubtitle}</p>
            </header>

            {view === "add" ? (
              <div style={{ marginTop: 24, maxWidth: 760 }}>
                <AddUpdate
                  processing={processing}
                  stage={stage}
                  error={error}
                  hasEntries={!isEmpty}
                  onOrganize={handleOrganize}
                  onLoadDemo={handleLoadDemo}
                  onCancel={() => setView("dashboard")}
                />
              </div>
            ) : view === "review" && pending ? (
              <div style={{ marginTop: 24, maxWidth: 820 }}>
                <UpdateResult analysis={pending} onApply={handleApply} onDiscard={handleDiscard} />
              </div>
            ) : isEmpty ? (
              <section className={styles.emptyState}>
                <div className={styles.emptyIcon} aria-hidden="true">
                  <SparkIcon size={26} />
                </div>
                <h2 className={styles.title} style={{ fontSize: "1.5rem" }}>
                  {JOURNAL.emptyHeading}
                </h2>
                <p className={styles.lead}>{JOURNAL.emptyBody}</p>
                <div className={styles.btnRow} style={{ justifyContent: "center", marginTop: 20 }}>
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setView("add")}>
                    <PlusIcon size={16} />
                    Start Your Story
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={handleLoadDemo}>
                    {JOURNAL.demoCta}
                  </button>
                </div>
              </section>
            ) : journal && overview ? (
              <div className={styles.layout}>
                <div className={styles.main}>
                  <JournalOverview
                    overview={overview}
                    latestLine={latestUpdateLine(journal)}
                    recentChanges={recentChanges}
                    onAddUpdate={() => setView("add")}
                    onViewSummary={() => {
                      document.getElementById("summary-panel-heading")?.scrollIntoView({
                        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                      });
                    }}
                    onCompare={() => {
                      document.getElementById("snapshots-heading")?.scrollIntoView({
                        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                      });
                    }}
                    onSearch={() => {
                      document.getElementById("story-search")?.focus();
                    }}
                  />

                  <JournalEvolutions
                    evolutions={journal.evolutions}
                    onStatus={handleEvolutionStatus}
                    onEdit={handleEditEvolution}
                  />

                  <JournalInsights
                    events={journal.events}
                    patterns={patterns}
                    frequencySeries={frequencySeries}
                    activity={journal.activity}
                    onOpenTopic={setTopicLabel}
                  />

                  <JournalTimeline
                    events={filteredEvents}
                    categories={categories}
                    filters={filters}
                    totalEvents={journal.events.filter((e) => e.status !== "REMOVED").length}
                    onFiltersChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
                    onClearFilters={() => setFilters({ range: "all", categories: [], query: "" })}
                    onOpenTopic={setTopicLabel}
                  />
                </div>

                <div className={styles.side}>
                  <CommunicationCard
                    questionsOpen={(journal.questions ?? []).filter((q) => q.status === "OPEN").length}
                    onPrepare={() => setView("conversation")}
                    onPractice={() => setView("conversation")}
                    onViewQuestions={() => setView("conversation")}
                  />
                  <FollowUpCard
                    followUpCount={(journal.followUps ?? []).length}
                    openQuestions={(journal.questions ?? []).filter((q) => q.status === "OPEN").length}
                    onAdd={() => setView("followup")}
                    onViewHistory={() => setView("followup")}
                  />
                  <UnderstandCard
                    documentCount={(journal.documents ?? []).length}
                    onOpen={() => setView("understand")}
                  />
                  <InsightsCard
                    nodeCount={journal.events.filter((e) => e.status !== "REMOVED").length}
                    insightCount={journal.topics.length}
                    onOpen={() => setView("insights")}
                  />
                  <JournalSummary
                    journal={journal}
                    state={summarySt}
                    onGenerate={handleGenerateSummary}
                    onExport={handleExport}
                    onDeleteSummary={handleDeleteSummary}
                  />
                  <JournalSnapshots
                    journal={journal}
                    onCreate={handleCreateSnapshot}
                    onDelete={handleDeleteSnapshot}
                  />
                  <JournalSettings
                    preferences={journal.preferences}
                    onToggle={handleTogglePreference}
                    onDeleteStory={handleDeleteStory}
                    onStartFresh={handleStartFresh}
                    onLoadDemo={handleLoadDemo}
                    storageAvailable={storageOk}
                  />

                  <section className={styles.panel} aria-labelledby="journal-safety">
                    <div className={styles.panelHead}>
                      <LockIcon size={16} />
                      <h2 className={styles.panelTitle} id="journal-safety">
                        {JOURNAL.privacyHeading}
                      </h2>
                    </div>
                    <div className={styles.panelBody}>
                      <p className={styles.sub}>{JOURNAL.safetyFooter}</p>
                      <p className={styles.sectionNote}>{JOURNAL.storageNote}</p>
                    </div>
                  </section>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>

      {topicHistory ? <TopicHistoryDrawer history={topicHistory} onClose={() => setTopicLabel(null)} /> : null}

      {toast ? (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
