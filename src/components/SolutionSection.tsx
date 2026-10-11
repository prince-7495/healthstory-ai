import { solution } from "@/lib/content";
import Reveal from "./Reveal";
import { SparkIcon } from "./icons";
import styles from "./solution.module.css";

/** Short slug used to map a category to its colour treatment. */
const tone: Record<string, string> = {
  Symptoms: "teal",
  Events: "blue",
  Medications: "amber",
  Tests: "violet",
  Lifestyle: "green",
};

export default function SolutionSection() {
  return (
    <section className="section section--alt" id="product" aria-labelledby="solution-heading">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">{solution.eyebrow}</p>
          <h2 className="h-section" id="solution-heading">
            {solution.heading}
          </h2>
          <p className="lede">{solution.supporting}</p>
        </Reveal>

        <Reveal from="scale" delay={80}>
          <div className={styles.frame} id="about">
            {/* window chrome */}
            <div className={styles.chrome} aria-hidden="true">
              <span className={styles.dots}>
                <span />
                <span />
                <span />
              </span>
              <span className={styles.chromeTitle}>{solution.mockup.title}</span>
              <span className={styles.chromeRight} />
            </div>

            <div className={styles.head}>
              <div>
                <h3 className={styles.title}>{solution.mockup.title}</h3>
                <p className={styles.subtitle}>{solution.mockup.subtitle}</p>
              </div>
              <span className={styles.badge}>
                <SparkIcon size={13} />
                {solution.mockup.badge}
              </span>
            </div>

            <div className={styles.body}>
              {/* ---- category summary ---- */}
              <aside className={styles.summary} aria-label="Story contents by category">
                <p className={styles.summaryLabel}>In this story</p>
                <ul className={styles.summaryList}>
                  {solution.mockup.streams.map((s) => (
                    <li key={s.label} className={styles.summaryItem}>
                      <span
                        className={styles.summaryDot}
                        data-tone={tone[s.label] ?? "teal"}
                        aria-hidden="true"
                      />
                      <span className={styles.summaryName}>{s.label}</span>
                      <span className={styles.summaryCount}>{s.count}</span>
                    </li>
                  ))}
                </ul>
                <p className={styles.summaryNote}>
                  All five kinds of information share one order in time.
                </p>
              </aside>

              {/* ---- the chronological stream ---- */}
              <ol className={styles.stream} aria-label="Chronological health story (sample)">
                {solution.mockup.entries.map((entry, i) => (
                  <li
                    key={entry.date + entry.category}
                    className={styles.entry}
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <span className={styles.entryDate}>{entry.date}</span>
                    <span className={styles.entryNode} aria-hidden="true" />
                    <span className={styles.entryBody}>
                      <span
                        className={styles.entryTag}
                        data-tone={tone[entry.category] ?? "teal"}
                      >
                        <span className={styles.entryTagDot} aria-hidden="true" />
                        {entry.category}
                      </span>
                      <span className={styles.entryText}>{entry.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <p className={styles.caption}>
              <span className="demo-tag">Product preview</span>
              <span>{solution.mockup.caption} — a fictional person, not a real patient.</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}