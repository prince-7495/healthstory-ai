"use client";

import { useEffect, useRef } from "react";
import { transformation } from "@/lib/content";
import { SparkIcon } from "./icons";
import styles from "./problem.module.css";

/**
 * TransformationSection — the "wow" moment.
 *
 * SCATTERED HEALTH INFORMATION → AI → STRUCTURED HEALTH STORY
 *
 * Communicates the entire product without a paragraph. Dark band for
 * contrast against the rest of the page. Demonstration only: the chips
 * are generic categories, not real entries.
 */
export default function TransformationSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
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
      { threshold: 0.25 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <section
      className="section section--dark"
      aria-label="How HealthStory AI transforms scattered information into a structured health story"
    >
      <div className={styles.ambient} aria-hidden="true" />
      <div className="container" ref={ref}>
        <div className={styles.wrap}>
          <div className={styles.cols}>
            {/* ---------- scattered input ---------- */}
            <div className={styles.col}>
              <p className={styles.colLabel}>{transformation.scattered.label}</p>
              <ul className={styles.scatter}>
                {transformation.scattered.items.map((item, i) => (
                  <li
                    key={item}
                    className={styles.scatterChip}
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* ---------- the AI step ---------- */}
            <div className={styles.middle}>
              <span className={styles.flowLine} aria-hidden="true" />
              <div className={styles.aiNode}>
                <span className={styles.aiHalo} aria-hidden="true" />
                <SparkIcon size={22} />
                <span className={styles.aiText}>{transformation.aiLabel}</span>
              </div>
              <span className={styles.flowLine} aria-hidden="true" />
            </div>

            {/* ---------- structured output ---------- */}
            <div className={styles.col}>
              <p className={styles.colLabel}>{transformation.structured.label}</p>
              <ul className={styles.ordered}>
                {transformation.structured.items.map((item, i) => (
                  <li
                    key={item}
                    className={styles.orderedItem}
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <span className={styles.orderedDot} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className={styles.caption}>{transformation.caption}</p>
        </div>
      </div>
    </section>
  );
}