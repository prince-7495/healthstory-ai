"use client";

import { useState } from "react";
import { languages } from "@/lib/content";
import { GlobeIcon, SparkIcon, ArrowDownIcon } from "./icons";
import styles from "./language.module.css";

/**
 * GlobalAccessibility — multilingual concept visual.
 *
 * IMPORTANT: this is a product-direction demonstration built from static
 * sample strings. It is not live translation, and the copy deliberately
 * says so. Language support is only claimed where a model is verified.
 */
export default function GlobalAccessibility() {
  const [active, setActive] = useState(0);
  const sample = languages.samples[active];

  return (
    <section className="section" aria-labelledby="lang-heading">
      <div className="container">
        <div className={styles.head}>
          <div className={styles.headCopy}>
            <p className="eyebrow">{languages.eyebrow}</p>
            <h2 className="h-section" id="lang-heading">
              {languages.heading}
            </h2>
            <p className="lede">{languages.supporting}</p>
          </div>

          <ul className={styles.chips} aria-label="Languages shown in this demonstration">
            <li>
              <span className={`pill ${styles.chipStatic}`}>
                <GlobeIcon size={13} />
                {languages.chips.length} languages in view
              </span>
            </li>
          </ul>
        </div>

        <div className={styles.stage}>
          {/* ---- language selector ---- */}
          <div className={styles.tabs} role="tablist" aria-label="Choose a sample language">
            {languages.samples.map((s, i) => (
              <button
                key={s.code}
                type="button"
                role="tab"
                id={`lang-tab-${s.code}`}
                aria-selected={i === active}
                aria-controls={`lang-panel-${s.code}`}
                tabIndex={i === active ? 0 : -1}
                className={styles.tab}
                data-active={i === active || undefined}
                onClick={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  e.preventDefault();
                  const next =
                    e.key === "ArrowRight"
                      ? (i + 1) % languages.samples.length
                      : (i - 1 + languages.samples.length) % languages.samples.length;
                  setActive(next);
                  document.getElementById(`lang-tab-${languages.samples[next].code}`)?.focus();
                }}
              >
                {s.lang}
              </button>
            ))}
          </div>

          {/* ---- what the person said ---- */}
          <div
            className={styles.card}
            role="tabpanel"
            id={`lang-panel-${sample.code}`}
            aria-labelledby={`lang-tab-${sample.code}`}
          >
            <span className={styles.cardLabel}>What the person said</span>
            <p
              className={styles.quote}
              lang={sample.code}
              dir={sample.dir}
              key={sample.code}
            >
              {sample.text}
            </p>
            <p className={styles.gloss} lang="en">
              {sample.gloss}
            </p>
          </div>

          <div className={styles.arrow} aria-hidden="true">
            <ArrowDownIcon size={18} />
          </div>

          {/* ---- the AI step ---- */}
          <div className={styles.ai}>
            <SparkIcon size={16} />
            <span>Structured, in one consistent format</span>
          </div>

          <div className={styles.arrow} aria-hidden="true">
            <ArrowDownIcon size={18} />
          </div>

          {/* ---- the structured story ---- */}
          <div className={`${styles.card} ${styles.cardOut}`}>
            <span className={styles.cardLabel}>{languages.output.note}</span>
            <ul className={styles.outList}>
              {languages.output.items.map((item, i) => (
                <li key={item} style={{ "--i": i } as React.CSSProperties}>
                  <span className={styles.outDot} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className={styles.note}>
          <span className="demo-tag">Concept</span>
          <span>{languages.statusNote}</span>
        </p>
      </div>
    </section>
  );
}