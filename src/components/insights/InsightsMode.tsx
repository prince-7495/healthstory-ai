"use client";

import { useEffect, useMemo, useState } from "react";
import { INSIGHTS_OPTIONS } from "@/lib/insights/options";
import { buildStoryGraph } from "@/lib/insights/engine";
import { computeCompleteness, detectConsistency, detectInformationGaps, detectUnclearItems } from "@/lib/insights/analyze";
import {
  buildInventory,
  buildStoryFeed,
  buildTopicClusters,
  generateStoryInsights,
} from "@/lib/insights/insights";
import type { StoryInsightStatus, StoryNode } from "@/lib/insights/types";
import type { StoryJournal } from "@/lib/journal/types";
import { removeJournalQuestion, setJournalQuestionStatus } from "@/lib/communication/engine";
import { createDefaultSelection, type ConversationSelection, type PrepareFocus } from "@/lib/communication/types";
import {
  AlertIcon,
  ArchiveIcon,
  ChatIcon,
  CheckIcon,
  GraphIcon,
  ListIcon,
  LockIcon,
  ShieldIcon,
  SparkIcon,
} from "../icons";
import InsightCards from "./InsightCards";
import StoryMap from "./StoryMap";
import EvidenceExplorer from "./EvidenceExplorer";
import QuestionsReview from "./QuestionsReview";
import styles from "./insights.module.css";

type Props = {
  journal: StoryJournal;
  demoMode: boolean;
  onUpdateJournal: (journal: StoryJournal) => void;
  onExit: () => void;
  onGoToConversation: (selection: ConversationSelection) => void;
  onGoToUnderstand: () => void;
  onGoToAddEntry: () => void;
  notify: (message: string) => void;
};

type Tab = "overview" | "map" | "evidence" | "review";

export default function InsightsMode({
  journal,
  demoMode,
  onUpdateJournal,
  onExit,
  onGoToConversation,
  onGoToUnderstand,
  onGoToAddEntry,
  notify,
}: Props) {
  const o = INSIGHTS_OPTIONS;
  const [tab, setTab] = useState<Tab>("overview");
  const [insightOverrides, setInsightOverrides] = useState<
    Record<string, { status: StoryInsightStatus; signature: string }>
  >({});
  const [prevSignatures, setPrevSignatures] = useState<Record<string, string>>({});
  const [handledGapIds, setHandledGapIds] = useState<string[]>([]);
  const [handledDupIds, setHandledDupIds] = useState<string[]>([]);
  const [handledConflictIds, setHandledConflictIds] = useState<string[]>([]);
  const [selection, setSelection] = useState<{
    topicIds: string[];
    eventIds: string[];
    docIds: string[];
    questionIds: string[];
  }>({ topicIds: [], eventIds: [], docIds: [], questionIds: [] });
  const [focusNode, setFocusNode] = useState<{ id: string; token: number } | null>(null);

  /* ---------- derived ---------- */
  const graph = useMemo(() => buildStoryGraph(journal), [journal]);
  const gaps = useMemo(() => detectInformationGaps(journal, graph), [journal, graph]);
  const consistency = useMemo(() => detectConsistency(journal), [journal]);
  const unclearItems = useMemo(() => detectUnclearItems(journal), [journal]);
  const completeness = useMemo(
    () => computeCompleteness(journal, consistency, gaps),
    [journal, consistency, gaps],
  );
  const generated = useMemo(() => generateStoryInsights(journal, graph), [journal, graph]);
  const feed = useMemo(() => buildStoryFeed(journal), [journal]);
  const clusters = useMemo(() => buildTopicClusters(graph), [graph]);
  const inventory = useMemo(() => buildInventory(journal, graph), [journal, graph]);

  const insights = useMemo(() => {
    return generated.map((gen) => {
      const prev = prevSignatures[gen.id];
      if (prev !== undefined && prev !== gen.signature) {
        return { ...gen, status: "STALE" as const };
      }
      const override = insightOverrides[gen.id];
      if (override && override.signature !== gen.signature) {
        return { ...gen, status: "STALE" as const };
      }
      if (override) return { ...gen, status: override.status };
      return gen;
    });
  }, [generated, prevSignatures, insightOverrides]);

  // Remember which signatures were already displayed, so later story
  // changes mark the matching insights "Needs refresh" instead of silently
  // re-showing old findings as if nothing changed.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next: Record<string, string> = {};
      for (const g of generated) next[g.id] = g.signature;
      setPrevSignatures(next);
    }, 0);
    return () => window.clearTimeout(t);
  }, [generated]);

  const openGapCount = gaps.filter((g) => !handledGapIds.includes(g.id)).length;
  const openQuestionCount = (journal.questions ?? []).filter((q) => q.status === "OPEN").length;
  const openConflictCount = consistency.conflicts.filter((c) => c.status === "OPEN" && !handledConflictIds.includes(c.id)).length;

  /* ---------- journal mutators ---------- */
  const setEventStatus = (eventId: string, status: "CONFIRMED" | "REMOVED") => {
    onUpdateJournal({
      ...journal,
      events: journal.events.map((e) => (e.id === eventId ? { ...e, status } : e)),
    });
  };

  const setEventDate = (eventId: string, iso: string) => {
    onUpdateJournal({
      ...journal,
      events: journal.events.map((e) =>
        e.id === eventId ? { ...e, date: iso, datePrecision: "exact" } : e,
      ),
    });
  };

  const handleConfirmNode = (node: StoryNode) => {
    if (node.type === "EVENT" && node.refId) {
      setEventStatus(node.refId, "CONFIRMED");
      notify("Event confirmed as part of your story.");
    } else {
      notify("Only recorded events can be confirmed. Review the evidence first.");
    }
  };

  const handleRemoveNode = (node: StoryNode) => {
    if (node.type === "EVENT" && node.refId) {
      setEventStatus(node.refId, "REMOVED");
      notify("Event removed from your story. Your entries stay saved.");
    } else if (node.type === "DOCUMENT" && node.refId) {
      onUpdateJournal({
        ...journal,
        documents: (journal.documents ?? []).map((d) =>
          d.id === node.refId ? { ...d, status: "REMOVED" } : d,
        ),
      });
      notify("Document removed from the map. The file stays in your device storage.");
    } else {
      notify("This item cannot be removed automatically — you control it in its own section.");
    }
  };

  const handleAddToConversation = (node: StoryNode) => {
    setSelection((prev) => {
      if (node.type === "EVENT" && node.refId) return { ...prev, eventIds: [...prev.eventIds, node.refId as string] };
      if (node.type === "TOPIC" && node.refId) return { ...prev, topicIds: [...prev.topicIds, node.refId as string] };
      if (node.type === "DOCUMENT" && node.refId) return { ...prev, docIds: [...prev.docIds, node.refId as string] };
      if (node.type === "QUESTION" && node.refId) return { ...prev, questionIds: [...prev.questionIds, node.refId as string] };
      return prev;
    });
    notify(`“${node.title}” added to conversation selection.`);
  };

  const handleDiscussedQuestion = (id: string) => {
    onUpdateJournal(setJournalQuestionStatus(journal, id, "DISCUSSED"));
    notify("Question marked as discussed — you control the status.");
  };

  const handleRemoveQuestion = (id: string) => {
    onUpdateJournal(removeJournalQuestion(journal, id));
    notify("Question removed from your story.");
  };

  /* ---------- insight actions ---------- */
  const currentSignature = (id: string) =>
    generated.find((g) => g.id === id)?.signature ?? "";

  const dismissInsight = (id: string) => {
    setInsightOverrides((prev) => ({ ...prev, [id]: { status: "DISMISSED", signature: currentSignature(id) } }));
    notify("Insight dismissed. It will not be shown again unless the story changes.");
  };

  const reviewInsight = (id: string) => {
    setInsightOverrides((prev) => ({ ...prev, [id]: { status: "CONFIRMED", signature: currentSignature(id) } }));
    notify("Insight marked as reviewed. Source links remain on the card.");
  };

  /* ---------- prepare for conversation ---------- */
  const prepareConversation = () => {
    const sel = createDefaultSelection();
    const hasTopic = selection.topicIds.length > 0;
    const hasEvents = selection.eventIds.length > 0;
    const hasQuestions = selection.questionIds.length > 0;
    const focus: PrepareFocus = hasTopic
      ? "topic"
      : hasEvents
        ? "recent"
        : hasQuestions
          ? "questions"
          : "full";
    sel.focus = focus;
    sel.topicIds = selection.topicIds;
    sel.questionIds = selection.questionIds;
    sel.range = hasEvents ? { id: "3m" } : { id: "all" };
    sel.sections = {
      ...sel.sections,
      timeline: true,
      changes: true,
      context: true,
      summary: true,
      questions: hasQuestions,
      evidence: selection.docIds.length > 0,
      olderEntries: !hasTopic && !hasEvents,
    };
    sel.includeUnconfirmed = false;
    notify("Conversation material prepared. Nothing is sent — you review it first.");
    onGoToConversation(sel);
  };

  const completenessBadge = (
    <section className={styles.panel} aria-labelledby="completeness-overview">
      <div className={styles.panelHead}>
        <CheckIcon size={16} />
        <h3 className={styles.panelTitle} id="completeness-overview">{o.completeness.heading}</h3>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.completeness}>
          <span className={styles.completenessBadge} data-cat={completeness.category}>
            {o.completeness.levels[completeness.category]}
          </span>
        </div>
        <p className={styles.completenessLine} style={{ marginTop: 10 }}>{completeness.line}</p>
        <p className={styles.note}>{o.completeness.notHealth}</p>
      </div>
    </section>
  );

  const preparePanel = (
    <section className={styles.panel} aria-labelledby="prepare-heading">
      <div className={styles.panelHead}>
        <ChatIcon size={16} />
        <h3 className={styles.panelTitle} id="prepare-heading">{o.prepare.heading}</h3>
      </div>
      <div className={styles.panelBody}>
        <p className={styles.sub}>{o.prepare.sub}</p>
        <div className={styles.prepareOptions} style={{ marginTop: 12 }}>
          <label className={styles.prepareOption} data-checked={selection.topicIds.length > 0}>
            <input
              type="checkbox"
              checked={selection.topicIds.length > 0}
              onChange={(e) =>
                e.target.checked
                  ? setSelection((prev) => ({ ...prev, topicIds: journal.topics.map((t) => t.id) }))
                  : setSelection((prev) => ({ ...prev, topicIds: [] }))
              }
            />
            {o.prepare.options.topic}
            <span className={styles.tag} data-tag>{o.prepare.options.topic}</span>
          </label>
          <label className={styles.prepareOption} data-checked={selection.eventIds.length > 0}>
            <input
              type="checkbox"
              checked={selection.eventIds.length > 0}
              onChange={(e) =>
                e.target.checked
                  ? setSelection((prev) => ({
                      ...prev,
                      eventIds: journal.events.filter((ev) => ev.status !== "REMOVED").map((ev) => ev.id),
                    }))
                  : setSelection((prev) => ({ ...prev, eventIds: [] }))
              }
            />
            {o.prepare.options.recentEvents}
          </label>
          <label className={styles.prepareOption} data-checked={selection.docIds.length > 0}>
            <input
              type="checkbox"
              checked={selection.docIds.length > 0}
              onChange={(e) =>
                e.target.checked
                  ? setSelection((prev) => ({
                      ...prev,
                      docIds: (journal.documents ?? [])
                        .filter((d) => d.status !== "REMOVED")
                        .map((d) => d.id),
                    }))
                  : setSelection((prev) => ({ ...prev, docIds: [] }))
              }
            />
            {o.prepare.options.documentInfo}
          </label>
          <label className={styles.prepareOption} data-checked={selection.questionIds.length > 0}>
            <input
              type="checkbox"
              checked={selection.questionIds.length > 0}
              onChange={(e) =>
                e.target.checked
                  ? setSelection((prev) => ({
                      ...prev,
                      questionIds: (journal.questions ?? [])
                        .filter((q) => q.status !== "REMOVED")
                        .map((q) => q.id),
                    }))
                  : setSelection((prev) => ({ ...prev, questionIds: [] }))
              }
            />
            {o.prepare.options.questions}
          </label>
        </div>

        <div className={styles.prepareReview} style={{ marginTop: 12 }}>
          <strong>{o.prepare.reviewSharing}</strong>
          <div className={styles.prepareList}>
            <span className={styles.prepareRow}>
              <CheckIcon size={12} style={{ flexShrink: 0 }} />
              <span>
                {o.prepare.included}: {selection.topicIds.length} topic{selection.topicIds.length === 1 ? "" : "s"},{" "}
                {selection.eventIds.length} event{selection.eventIds.length === 1 ? "" : "s"},{" "}
                {selection.docIds.length} document{selection.docIds.length === 1 ? "" : "s"},{" "}
                {selection.questionIds.length} question{selection.questionIds.length === 1 ? "" : "s"}
              </span>
            </span>
            <span className={styles.prepareRow}>
              <span style={{ color: "var(--ink-300)" }}>✕</span>
              <span>{o.prepare.excluded}: older entries, unconfirmed changes, graph edges, documents not selected</span>
            </span>
          </div>
        </div>

        <div className={styles.row} style={{ marginTop: 14 }}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={prepareConversation}>
            <ChatIcon size={14} />
            {o.prepare.prepareCta}
          </button>
        </div>
        <p className={styles.note}>
          <LockIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          {o.prepare.noAutomatic}
        </p>
      </div>
    </section>
  );

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.badgeRow}>
          <span className={styles.badge}>
            <GraphIcon size={14} />
            {o.featureName}
          </span>
          <span className={styles.badge}>{o.pageHeading}</span>
          <span className={styles.badgeGhost}> ({graph.nodes.length} nodes · {graph.relationships.length} connections)</span>
          {demoMode ? <span className={`${styles.badge} ${styles.badgeWarn}`}>{o.demoLabel}</span> : null}
          <span className={`${styles.badge} ${styles.badgeAccent}`}>
            <ShieldIcon size={13} />
            Safety & source validation passed
          </span>
        </div>
        <h1 className={styles.title}>{o.ctaExplore}</h1>
        <p className={styles.lead}>{o.supporting}</p>
      </header>

      <nav className={styles.tabs} aria-label="Insights views">
        {(["overview", "map", "evidence", "review"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={styles.tab}
            data-active={tab === t}
            onClick={() => setTab(t)}
          >
            {o.views[t]}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <>
          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{journal.topics.length}</div>
              <div className={styles.statLabel}>{o.evidence.counts.topics}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{openQuestionCount}</div>
              <div className={styles.statLabel}>{o.evidence.counts.questions}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{openGapCount}</div>
              <div className={styles.statLabel}>{o.tiles.informationGaps}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{openConflictCount}</div>
              <div className={styles.statLabel}>{o.consistency.conflictHeading}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{(journal.documents ?? []).filter((d) => d.status !== "REMOVED").length}</div>
              <div className={styles.statLabel}>{o.evidence.counts.documents}</div>
            </div>
          </div>

          <div className={styles.tileGrid} style={{ marginTop: 18 }}>
            <button type="button" className={styles.tile} onClick={() => setTab("map")}>
              <GraphIcon size={18} className={styles.tileIcon} />
              <span>
                <span className={styles.tileLabel}>{o.tiles.storyMap}</span>
                <span className={styles.tileHint}>Explore nodes and the reasons behind every connection.</span>
              </span>
            </button>
            <button type="button" className={styles.tile} onClick={() => setTab("evidence")}>
              <ListIcon size={18} className={styles.tileIcon} />
              <span>
                <span className={styles.tileLabel}>{o.tiles.evidence}</span>
                <span className={styles.tileHint}>What you have recorded, by topic, in a list.</span>
              </span>
            </button>
            <button type="button" className={styles.tile} onClick={() => setTab("review")}>
              <AlertIcon size={18} className={styles.tileIcon} />
              <span>
                <span className={styles.tileLabel}>{o.tiles.openQuestions} · {o.gaps.heading}</span>
                <span className={styles.tileHint}>Open questions, information to review, and consistency.</span>
              </span>
            </button>
          </div>

          <div className={styles.layout}>
            <div className={styles.col}>
              {preparePanel}
              {completenessBadge}
              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <SparkIcon size={16} />
                  <h3 className={styles.panelTitle}>{o.insights.heading}</h3>
                  <span className={styles.panelCount}>
                    {insights.filter((i) => i.status !== "DISMISSED").length} insights
                  </span>
                </div>
                <div className={styles.panelBody}>
                  <p className={styles.sub}>
                    Insights come from the information you chose to record, pass through safety and source validation,
                    and always stay attributable.
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <InsightCards
                      insights={insights}
                      onViewEvidence={(i) => {
                        setTab("evidence");
                        if (i.sourceNodeIds[0]) {
                          const node = graph.nodes.find((n) => n.id === i.sourceNodeIds[0]);
                          if (node) setFocusNode((f) => ({ id: node.id, token: (f?.token ?? 0) + 1 }));
                        }
                      }}
                      onDismiss={dismissInsight}
                      onReview={reviewInsight}
                    />
                  </div>
                </div>
              </section>
            </div>
            <div className={styles.col}>
              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <ArchiveIcon size={16} />
                  <h3 className={styles.panelTitle}>{o.activity.heading}</h3>
                </div>
                <div className={styles.panelBody}>
                  <p className={styles.sub}>{o.activity.sub}</p>
                  <div className={styles.feed} style={{ marginTop: 10 }}>
                    {feed.slice(0, 8).map((item) => (
                      <div key={item.id} className={styles.feedItem}>
                        <span className={styles.feedWhen}>{item.at.slice(0, 10)}</span>
                        <span className={styles.feedBody}>
                          <span className={styles.feedHead}>
                            {item.headline}
                            <span className={styles.verbTag} data-verb={item.verb}>
                              {o.activity.verbs[item.verb]}
                            </span>
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <ShieldIcon size={16} />
                  <h3 className={styles.panelTitle}>{o.trust.principle}</h3>
                </div>
                <div className={styles.panelBody}>
                  <p className={styles.sub}>{o.safety}</p>
                  <p className={styles.note}>{o.emergency}</p>
                </div>
              </section>
            </div>
          </div>
        </>
      ) : tab === "map" ? (
        <StoryMap
          journal={journal}
          graph={graph}
          isEmpty={journal.entries.length === 0}
          focusNodeId={focusNode?.id}
          focusToken={focusNode?.token}
          onGoToEntry={onGoToAddEntry}
          onConfirmNode={handleConfirmNode}
          onRemoveNode={handleRemoveNode}
          onAddToConversation={handleAddToConversation}
          notify={notify}
        />
      ) : tab === "evidence" ? (
        <EvidenceExplorer
          clusters={clusters}
          inventory={inventory}
          feed={feed}
          openQuestionCount={openQuestionCount}
          onSelectNode={(node) => {
            setTab("map");
            setFocusNode((f) => ({ id: node.id, token: (f?.token ?? 0) + 1 }));
          }}
        />
      ) : (
        <QuestionsReview
          completeness={completeness}
          gaps={gaps}
          handledGapIds={handledGapIds}
          consistency={consistency}
          handledDupIds={handledDupIds}
          unclearItems={unclearItems}
          questions={journal.questions ?? []}
          demoMode={demoMode}
          entries={journal.entries}
          events={journal.events}
          onResolveGap={(id) => setHandledGapIds((prev) => [...prev, id])}
          onAddDate={setEventDate}
          onConfirmEvent={(id) => {
            setEventStatus(id, "CONFIRMED");
            notify("Event confirmed.");
          }}
          onDiscussedQuestion={handleDiscussedQuestion}
          onRemoveQuestion={handleRemoveQuestion}
          onGoToUnderstand={onGoToUnderstand}
          onResolveDup={(id, action) => {
            setHandledDupIds((prev) => [...prev, id]);
            notify(
              action === "MERGED"
                ? "You approved merging these records. Both originals stay saved."
                : action === "KEPT_SEPARATE"
                  ? "Kept both entries separate. Nothing was changed."
                  : "Duplicate suggestion dismissed.",
            );
          }}
          onResolveConflict={(id) => {
            setHandledConflictIds((prev) => [...prev, id]);
            notify("You decided to keep these separate. Nothing was auto-resolved.");
          }}
        />
      )}

      <div className={styles.row} style={{ marginTop: 4 }}>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onExit}>
          ← {o.featureName} Home
        </button>
      </div>
    </div>
  );
}