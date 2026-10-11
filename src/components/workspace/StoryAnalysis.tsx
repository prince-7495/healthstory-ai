"use client";

import { useCallback, useState } from "react";
import { ANALYSIS } from "@/lib/health/options";
import {
  type AnalyzedEvent,
  type OrganizedStory,
  type UnclearItem,
  toAnalyzedEvent,
} from "@/lib/health/types";
import {
  ArrowRightIcon,
  CheckIcon,
  InfoIcon,
  PencilIcon,
  ShieldIcon,
  SparkIcon,
} from "../icons";
import SafetyNotice from "./SafetyNotice";
import ExtractedInfo from "./ExtractedInfo";
import HealthTimeline from "./HealthTimeline";
import type { EventUpdate } from "./HealthTimeline";
import UnclearInformation from "./UnclearInformation";
import WhatChanged from "./WhatChanged";
import styles from "./workspace.module.css";

/* ---------- helpers ---------- */

function applyEventUpdate(
  events: AnalyzedEvent[],
  update: EventUpdate,
): AnalyzedEvent[] {
  return events.map((e) => {
    if (e.id !== update.id) return e;

    switch (update.type) {
      case "confirm":
        return { ...e, status: "CONFIRMED", needsConfirmation: false };

      case "remove":
        return { ...e, status: "REMOVED" };

      case "restore":
        return { ...e, status: "AI_ORGANIZED", needsConfirmation: true };

      case "edit":
        return {
          ...e,
          title: update.draft.title || e.title,
          description: update.draft.description || e.description,
          dateText: update.draft.dateText || e.dateText,
          timeLabel: update.draft.dateText || e.timeLabel,
          frequency: update.draft.frequency || null,
          context: update.draft.context || null,
          status: "EDITED",
          needsConfirmation: false,
        };
    }
  });
}

/* ---------- StorySummary ---------- */

function StorySummary({ summary }: { summary: string }) {
  if (!summary) return null;
  return (
    <div className={styles.summaryCard}>
      <p className={styles.summaryLabel}>
        <SparkIcon size={14} />
        Your Story So Far
      </p>
      <p className={styles.summaryText}>{summary}</p>
    </div>
  );
}

/* ---------- AnalysisHeader ---------- */

function AnalysisHeader({
  analyzer,
  isDemo,
}: {
  analyzer: OrganizedStory["analyzer"];
  isDemo: boolean;
}) {
  return (
    <header className={styles.analysisHead}>
      <h1 className={styles.analysisTitle}>{ANALYSIS.heading}</h1>
      <p className={styles.analysisSub}>{ANALYSIS.supporting}</p>

      <div className={styles.analysisBadges}>
        <span className={styles.badge}>
          <SparkIcon size={14} className={styles.badgeIcon} />
          AI-organised
        </span>
        <span className={styles.safetyBadge}>
          <ShieldIcon size={13} />
          {ANALYSIS.safetyBadge}
        </span>
        {isDemo ? (
          <span className={`${styles.badge} ${styles.badgeGhost}`}>
            Fictional demo data
          </span>
        ) : null}
      </div>

      <p
        className={styles.analyzerNote}
        style={{ marginTop: 16 }}
      >
        <InfoIcon size={17} className={styles.analyzerNoteIcon} />
        <span>
          <strong>{analyzer.label}.</strong> {analyzer.description}
        </span>
      </p>
    </header>
  );
}

/* ---------- HumanInLoopBanner ---------- */

function HumanInLoopBanner() {
  return (
    <div className={styles.humanBanner} role="note">
      <div className={styles.humanBannerIcon} aria-hidden="true">
        <CheckIcon size={18} />
      </div>
      <div className={styles.humanBannerText}>
        <p className={styles.humanBannerTitle}>{ANALYSIS.humanInLoop}</p>
        <p className={styles.humanBannerSub}>{ANALYSIS.humanInLoopSub}</p>
      </div>
    </div>
  );
}

/* ---------- StoryAnalysis ---------- */

type Props = {
  story: OrganizedStory;
  isDemo: boolean;
  onEdit: () => void;
  /** Hands the reviewed events to Stage 4 so the summary uses them. */
  onContinue: (events: AnalyzedEvent[]) => void;
};

/**
 * StoryAnalysis — the Stage 3 experience.
 *
 * Layout (desktop):
 *   LEFT (60%) — StorySummary, HealthTimeline, WhatChanged, UnclearInformation
 *   RIGHT (40%) — HumanInLoopBanner, ExtractedInfo
 *
 * The user can:
 *   • Confirm / Edit / Remove / Restore every extracted event
 *   • Expand source evidence on each item
 *   • See before → after change cards
 *   • See conflicting / missing information
 *
 * Nothing is auto-confirmed. AI proposes; human disposes.
 */
export default function StoryAnalysis({ story, isDemo, onEdit, onContinue }: Props) {
  /* Initialise local event state from the organised story.
     toAnalyzedEvent fills any gaps that hand-typed Stage 2 events left. */
  const [events, setEvents] = useState<AnalyzedEvent[]>(() =>
    story.events.map(toAnalyzedEvent),
  );

  const [unclear, setUnclear] = useState<UnclearItem[]>(() => story.unclear ?? []);

  const handleEventUpdate = useCallback((update: EventUpdate) => {
    setEvents((prev) => applyEventUpdate(prev, update));
  }, []);

  function handleResolve(id: string) {
    setUnclear((prev) =>
      prev.map((u) => (u.id === id ? { ...u, resolved: true } : u)),
    );
  }

  const confirmedCount = events.filter((e) => e.status === "CONFIRMED").length;
  const totalActive = events.filter((e) => e.status !== "REMOVED").length;

  return (
    <div className={styles.analysis}>
      <AnalysisHeader analyzer={story.analyzer} isDemo={isDemo} />

      <div className={styles.analysisGrid}>
        {/* ---- Left: timeline + changes + unclear ---- */}
        <div className={styles.analysisMain}>
          <StorySummary summary={story.summary} />

          <HealthTimeline events={events} onUpdate={handleEventUpdate} />

          <WhatChanged changes={story.changes ?? []} />

          <UnclearInformation
            unclear={unclear}
            missing={story.missing ?? story.gaps ?? []}
            onResolve={handleResolve}
          />
        </div>

        {/* ---- Right: human-in-loop banner + extracted info ---- */}
        <div className={styles.analysisSide}>
          <HumanInLoopBanner />

          <ExtractedInfo events={events} onUpdate={handleEventUpdate} />

          {/* Quick confirmation progress */}
          {totalActive > 0 ? (
            <div
              className={styles.summaryCard}
              style={{ fontSize: "13.5px", color: "var(--ink-600)", lineHeight: 1.6 }}
            >
              <p className={styles.summaryLabel}>
                <CheckIcon size={13} />
                Review progress
              </p>
              <p>
                <strong style={{ color: "var(--ink-900)" }}>
                  {confirmedCount} of {totalActive}
                </strong>{" "}
                event{totalActive !== 1 ? "s" : ""} confirmed
              </p>
              {confirmedCount < totalActive ? (
                <p style={{ marginTop: 6, fontSize: "13px", color: "var(--ink-400)" }}>
                  Review the remaining{" "}
                  {totalActive - confirmedCount} AI-organised item
                  {totalActive - confirmedCount !== 1 ? "s" : ""} when you
                  &apos;re ready. You can always come back later.
                </p>
              ) : (
                <p style={{ marginTop: 6, fontSize: "13px", color: "#1d6b3a" }}>
                  All events reviewed — your story is ready to continue.
                </p>
              )}
            </div>
          ) : null}

          <SafetyNotice />
        </div>
      </div>

      {/* Bottom actions */}
      <div className={styles.analysisActions}>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => onContinue(events)}
        >
          Prepare My Summary
          <ArrowRightIcon size={18} className="btn__arrow" />
        </button>
        <button type="button" className="btn btn--ghost" onClick={onEdit}>
          <PencilIcon size={15} />
          {ANALYSIS.editStoryCta}
        </button>
      </div>
    </div>
  );
}
