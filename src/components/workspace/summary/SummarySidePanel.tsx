"use client";

import { SUMMARY } from "@/lib/health/options";
import {
  resolveSources,
  type HealthSummary,
  type SummaryReviewStatus,
  type SummarySectionKey,
} from "@/lib/health/summary";
import type { AnalyzedEvent } from "@/lib/health/types";
import { EyeIcon, QuestionIcon, QuoteIcon, ShieldIcon } from "../../icons";
import SafetyNotice from "../SafetyNotice";
import ConversationPrep from "./ConversationPrep";
import SummaryQuestions from "./SummaryQuestions";
import SummaryReview from "./SummaryReview";
import SummarySharing from "./SummarySharing";
import styles from "./summary.module.css";

type Props = {
  summary: HealthSummary;
  events: AnalyzedEvent[];
  reviewStatus: SummaryReviewStatus;
  checked: boolean[];
  onToggleCheck: (index: number, value: boolean) => void;
  selectedSections: SummarySectionKey[];
  onToggleSection: (key: SummarySectionKey) => void;
  includeEvidence: boolean;
  onToggleEvidence: (value: boolean) => void;
  showPreview: boolean;
  setShowPreview: (value: boolean | ((prev: boolean) => boolean)) => void;
  onAddQuestion: (text: string) => void;
  onUpdateQuestion: (id: string, text: string) => void;
  onRemoveQuestion: (id: string) => void;
  onViewSource: (statement: string, ids: string[]) => void;
  pendingCount: number;
};

function Panel({
  id,
  icon,
  title,
  children,
}: {
  id?: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.panel} id={id} aria-labelledby={id ? `${id}-h` : undefined}>
      <div className={styles.panelHead}>
        {icon}
        <h2 className={styles.panelTitle} id={id ? `${id}-h` : undefined}>
          {title}
        </h2>
      </div>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

/**
 * SummarySidePanel — the 35% column.
 *
 * Review status, sources, questions, sharing and safety all live here,
 * because these are the controls the user needs while they read the
 * summary itself on the left.
 */
export default function SummarySidePanel({
  summary,
  events,
  reviewStatus,
  checked,
  onToggleCheck,
  selectedSections,
  onToggleSection,
  includeEvidence,
  onToggleEvidence,
  showPreview,
  setShowPreview,
  onAddQuestion,
  onUpdateQuestion,
  onRemoveQuestion,
  onViewSource,
  pendingCount,
}: Props) {
  const sources = resolveSources(summary, events);

  return (
    <aside className={styles.side}>
      <ConversationPrep summary={summary} />

      <Panel id="s4-review" icon={<ShieldIcon size={16} />} title={SUMMARY.reviewHeading}>
        <SummaryReview
          checked={checked}
          onToggle={onToggleCheck}
          status={reviewStatus}
          pendingCount={pendingCount}
        />
      </Panel>

      {sources.length > 0 ? (
        <Panel icon={<QuoteIcon size={16} />} title="Information sources">
          <p className={styles.sub}>
            Every statement in this summary can be traced back to the words you provided.
          </p>
          <div className={styles.infoList} style={{ marginTop: 12 }}>
            {sources.slice(0, 6).map((s) => (
              <div key={s.eventId} className={styles.infoItem}>
                <div className={styles.infoTop}>
                  <span className={styles.infoTime}>{s.timeLabel}</span>
                </div>
                <p className={styles.infoDetail}>{s.text}</p>
                <button
                  type="button"
                  className={styles.qBtn}
                  onClick={() => onViewSource(s.text, [s.eventId])}
                >
                  <EyeIcon size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                  {SUMMARY.viewSourceCta}
                </button>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel id="s4-questions" icon={<QuestionIcon size={16} />} title={SUMMARY.questionsHeading}>
        <SummaryQuestions
          questions={summary.questions}
          onAdd={onAddQuestion}
          onUpdate={onUpdateQuestion}
          onRemove={onRemoveQuestion}
        />
      </Panel>

      <Panel id="s4-share" icon={<ShieldIcon size={16} />} title={SUMMARY.shareHeading}>
        <SummarySharing
          summary={summary}
          events={events}
          selected={selectedSections}
          onToggleSection={onToggleSection}
          includeEvidence={includeEvidence}
          onToggleEvidence={onToggleEvidence}
          showPreview={showPreview}
          setShowPreview={setShowPreview}
        />
      </Panel>

      <SafetyNotice />
    </aside>
  );
}
