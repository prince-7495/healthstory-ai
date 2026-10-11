import { whatChanged } from "@/lib/content";
import Reveal from "./Reveal";
import {
  MinusTrendIcon,
  NewTagIcon,
  PlusTrendIcon,
  QuoteIcon,
  SparkIcon,
} from "./icons";
import styles from "./process.module.css";

const trendIcon = {
  up: PlusTrendIcon,
  down: MinusTrendIcon,
  new: NewTagIcon,
} as const;

const panels = [
  { key: "before", label: "Before", range: "Jan – Mar" },
  { key: "after", label: "Recent", range: "Apr – Jun" },
] as const;

/**
 * ChangeDetectionPreview — the signature "What Changed?" feature.
 *
 * Deliberately reads as an observation, never a finding: bars are labelled
 * with plain words ("decreased", "increased") and paired with an arrow icon,
 * so meaning never depends on colour alone. All data is fictional.
 */
export default function ChangeDetectionPreview() {
  return (
    <section className="section section--alt" id="why-healthstory" aria-labelledby="changed-heading">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">{whatChanged.eyebrow}</p>
          <h2 className="h-section" id="changed-heading">
            {whatChanged.heading}
          </h2>
          <p className="lede">{whatChanged.supporting}</p>
        </Reveal>

        <div className={styles.compare}>
          {/* ---------- BEFORE vs RECENT ---------- */}
          <Reveal className={styles.panels}>
            {panels.map((panel, pi) => (
              <section
                key={panel.key}
                className={styles.panel}
                data-active={panel.key === "after" || undefined}
                aria-label={`${panel.label} (${panel.range})`}
              >
                <header className={styles.panelHead}>
                  <span className={styles.panelLabel}>{panel.label}</span>
                  <span className={styles.panelRange}>{panel.range}</span>
                </header>

                <ul className={styles.metrics}>
                  {whatChanged.metrics.map((m, i) => {
                    const value = panel.key === "before" ? m.before : m.after;
                    const Icon = trendIcon[m.direction];
                    return (
                      <li
                        key={m.label}
                        className={styles.metric}
                        style={{ "--i": i + pi * 3 } as React.CSSProperties}
                      >
                        <span className={styles.metricLabel}>{m.label}</span>
                        <span className={styles.metricBar} aria-hidden="true">
                          <span
                            className={styles.metricFill}
                            data-direction={m.direction}
                            style={{ "--w": `${value}%` } as React.CSSProperties}
                          />
                        </span>
                        <span className={styles.metricValue}>
                          <span className="sr-only">
                            {panel.label}, {value} out of 100.
                          </span>
                          <span aria-hidden="true">{value}</span>
                          <span className={styles.metricVerb} data-direction={m.direction}>
                            <Icon size={13} />
                            {m.verb}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </Reveal>

          {/* ---------- Notable changes ---------- */}
          <Reveal from="right" delay={120} className={styles.findingsWrap}>
            <div className={styles.findings}>
              <span className={styles.findingsBadge}>
                <SparkIcon size={14} />
                Notable changes
              </span>

              <ol className={styles.findingsList}>
                {whatChanged.findings.map((f, i) => (
                  <li key={f} className={styles.finding}>
                    <span className={styles.findingIndex}>{i + 1}</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ol>

              <p className={styles.findingsNote}>
                <QuoteIcon size={16} />
                <span>{whatChanged.disclaimer}</span>
              </p>
            </div>
          </Reveal>
        </div>

        <p className={styles.caption}>
          <span className="demo-tag">Product preview</span>
          <span>{whatChanged.caption} · values are illustrative, not clinical.</span>
        </p>
      </div>
    </section>
  );
}