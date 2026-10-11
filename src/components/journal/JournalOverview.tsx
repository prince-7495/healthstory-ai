"use client";

import { JOURNAL } from "@/lib/journal/options";
import type { StoryOverview } from "@/lib/journal/engine";
import type { StoryEvolution } from "@/lib/journal/types";
import { ArrowRightIcon, EyeIcon, PlusIcon, PlusTrendIcon, SparkIcon } from "../icons";
import styles from "./journal.module.css";

type Props = {
  overview: StoryOverview;
  latestLine: string;
  recentChanges: StoryEvolution[];
  onAddUpdate: () => void;
  onViewSummary: () => void;
  onCompare: () => void;
  onSearch: () => void;
};

/**
 * JournalOverview — the top of My Health Story.
 *
 * Every figure here is an organizational statistic (how many updates,
 * how many topics). There is deliberately no health score, streak or
 * gamified metric anywhere in the journal.
 */
export default function JournalOverview({
  overview,
  latestLine,
  recentChanges,
  onAddUpdate,
  onViewSummary,
  onCompare,
  onSearch,
}: Props) {
  return (
    <section className={styles.panel} aria-labelledby="overview-heading">
      <div className={styles.panelHead}>
        <SparkIcon size={17} />
        <h2 className={styles.panelTitle} id="overview-heading">
          {JOURNAL.overviewHeading}
        </h2>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.overviewGrid}>
          <div className={styles.stat}>
            <p className={styles.statKey}>{JOURNAL.overviewFirstEntry}</p>
            <p className={styles.statVal}>{overview.firstEntry ?? "Not provided"}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statKey}>{JOURNAL.overviewLatest}</p>
            <p className={styles.statVal}>{overview.latestUpdate ?? "Not provided"}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statKey}>{JOURNAL.overviewUpdates}</p>
            <p className={styles.statVal}>{overview.updates}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statKey}>{JOURNAL.overviewTopics}</p>
            <p className={styles.statVal}>{overview.topics}</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statKey}>{JOURNAL.overviewLastUpdated}</p>
            <p className={styles.statVal}>{overview.lastUpdated}</p>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <p className={styles.baKey}>Latest update</p>
          <p className={styles.evoDesc} style={{ marginTop: 4 }}>{latestLine}</p>
        </div>

        {recentChanges.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <p className={styles.baKey}>Recent changes</p>
            <ul style={{ marginTop: 6 }}>
              {recentChanges.slice(0, 3).map((c) => (
                <li key={c.id} className={styles.changeLine}>
                  {c.previousValue ? `${c.previousValue} → ${c.currentValue}` : c.description}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.quickRow} style={{ marginTop: 20 }}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onAddUpdate}>
            <PlusIcon size={16} />
            {JOURNAL.addUpdateCta}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onViewSummary}>
            <EyeIcon size={15} />
            {JOURNAL.viewSummaryCta}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCompare}>
            <PlusTrendIcon size={15} />
            {JOURNAL.comparePeriodsCta}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onSearch}>
            <ArrowRightIcon size={15} />
            {JOURNAL.searchStoryCta}
          </button>
        </div>
      </div>
    </section>
  );
}
