"use client";

import { useEffect, useRef } from "react";
import { timeline } from "@/lib/content";
import {
  MinusTrendIcon,
  NewTagIcon,
  PlusTrendIcon,
  SparkIcon,
} from "./icons";
import styles from "./timeline.module.css";

const directionIcon = {
  up: PlusTrendIcon,
  down: MinusTrendIcon,
  new: NewTagIcon,
} as const;

/**
 * HealthStoryVisualization — the hero product preview.
 *
 * An original, fully hand-built visualisation: a chronological rail with
 * alternating event cards and a floating AI insight panel. Everything here
 * is fictional demonstration data for a fictional person ("Alex") — it is a
 * product preview, not a live analysis, and it never names a condition.
 *
 * Horizontal on desktop / tablet, vertical on mobile (see CSS).
 */
export default function HealthStoryVisualization() {
  const rootRef = useRef<HTMLDivElement>(null);

  // One IntersectionObserver starts the draw sequence exactly once.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      node.dataset.in = "true";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "true");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.2 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div className={styles.stage} ref={rootRef}>
      <div className={styles.panel}>
        <div className={styles.head}>
          <div className={styles.headLeft}>
            <span className={styles.avatar} aria-hidden="true">
              A
            </span>
            <div>
              <p className={styles.subject}>
                {timeline.subject}
                <span className={styles.subjectSep}>·</span>
                Health Story
              </p>
              <p className={styles.subjectMeta}>
                6 months of history · 14 entries
              </p>
            </div>
          </div>
          <span className="pill pill--neutral">
            <SparkIcon size={13} />
            Sample data
          </span>
        </div>

        <div className={styles.body}>
          {/* ---------- the rail ---------- */}
          <div className={styles.railWrap}>
            <div className={styles.tl}>
              <span className={styles.rail} aria-hidden="true" />
              <ol className={styles.list}>
                {timeline.events.map((e, i) => (
                  <li
                    key={e.month}
                    className={styles.node}
                    data-side={i % 2 === 0 ? "top" : "bottom"}
                    data-tone={e.tone}
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <article className={styles.event}>
                      <span className={styles.month}>{e.month}</span>
                      <p className={styles.eventText}>{e.text}</p>
                    </article>
                    <span className={styles.marker} aria-hidden="true">
                      <span className={styles.dot} />
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <p className={styles.caption}>
              <span className="demo-tag">Product preview</span>
              <span className={styles.captionText}>
                Illustrative events — not real patient data.
              </span>
            </p>
          </div>

          {/* ---------- AI insight panel ---------- */}
          <aside className={styles.insight} aria-label="Sample AI insight panel">
            <div className={styles.insightMain}>
              <span className={styles.sparkBadge} aria-hidden="true">
                <SparkIcon size={15} />
              </span>
              <p className={styles.insightCount}>
                {timeline.insight.headline}
              </p>
              <p className={styles.insightSub}>{timeline.insight.sub}</p>
            </div>

            <ul className={styles.insightList}>
              {timeline.insight.items.map((item, i) => {
                const Icon = directionIcon[item.direction];
                return (
                  <li
                    key={item.label}
                    className={styles.insightItem}
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <span
                      className={styles.insightIcon}
                      data-dir={item.direction}
                      aria-hidden="true"
                    >
                      <Icon size={15} />
                    </span>
                    <span className={styles.insightLabel}>{item.label}</span>
                  </li>
                );
              })}
            </ul>

            <p className={styles.insightNote}>
              Highlights changes for discussion. Not a diagnosis.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}