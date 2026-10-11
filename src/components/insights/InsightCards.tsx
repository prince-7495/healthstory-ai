"use client";

import { useState } from "react";
import { INSIGHTS_OPTIONS } from "@/lib/insights/options";
import type { StoryInsight } from "@/lib/insights/types";
import { CheckIcon, CloseIcon, EyeIcon, InfoIcon, SparkIcon } from "../icons";
import styles from "./insights.module.css";

type Props = {
  insights: StoryInsight[];
  limit?: number;
  onViewEvidence: (insight: StoryInsight) => void;
  onDismiss: (id: string) => void;
  onReview: (id: string) => void;
};

/**
 * InsightCards — recent information-level insights. Every card can explain
 * itself and can be dismissed or confirmed by the user.
 */
export default function InsightCards({ insights, limit = 5, onViewEvidence, onDismiss, onReview }: Props) {
  const o = INSIGHTS_OPTIONS;
  const [whyOpen, setWhyOpen] = useState<string | null>(null);

  const shown = insights
    .filter((i) => i.status !== "DISMISSED")
    .slice(0, limit);

  if (shown.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <SparkIcon size={16} />
          <h3 className={styles.panelTitle}>{o.insights.recentHeading}</h3>
        </div>
        <div className={styles.panelBody}>
          <p className={styles.sub}>No insights yet. As your story grows, HealthStory will surface connections between your records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <SparkIcon size={16} />
        <h3 className={styles.panelTitle}>{o.insights.recentHeading}</h3>
        <span className={styles.panelCount}>{shown.length} shown</span>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.insightList}>
          {shown.map((insight) => {
            const typeLabel = o.insights.types[insight.type];
            return (
              <article
                key={insight.id}
                className={styles.insightCard}
                data-status={insight.status}
                aria-labelledby={`insight-title-${insight.id}`}
              >
                <div className={styles.insightHead}>
                  <SparkIcon size={15} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.insightType} id={`insight-title-${insight.id}`}>
                      {typeLabel}
                    </div>
                    <h4 className={styles.insightTitle}>{insight.title}</h4>
                  </div>
                  {insight.status === "STALE" ? <span className={styles.badgeStale}>{o.insights.dirtyHeading}</span> : null}
                  {insight.status === "CONFIRMED" ? <span className={styles.badgeConfirmed}>{o.insights.confirmed}</span> : null}
                </div>

                <p className={styles.insightBody}>{insight.body}</p>

                {whyOpen === insight.id ? (
                  <p className={styles.insightWhy}>
                    <strong>{o.insights.whyThis}</strong> {insight.why}
                  </p>
                ) : null}

                <div className={styles.insightActions}>
                  <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => onViewEvidence(insight)}>
                    <EyeIcon size={13} />
                    {o.insights.viewEvidence}
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                    onClick={() => setWhyOpen((w) => (w === insight.id ? null : insight.id))}
                  >
                    <InfoIcon size={13} />
                    {o.insights.whyThis}
                  </button>
                  {insight.status !== "DISMISSED" && insight.status !== "CONFIRMED" ? (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                      onClick={() => onReview(insight.id)}
                    >
                      <CheckIcon size={13} />
                      {o.insights.review}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                    onClick={() => onDismiss(insight.id)}
                    aria-label={`Dismiss insight: ${insight.title}`}
                  >
                    <CloseIcon size={13} />
                    {o.insights.dismiss}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}