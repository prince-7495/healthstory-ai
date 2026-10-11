import { howItWorks } from "@/lib/content";
import Reveal from "./Reveal";
import styles from "./process.module.css";

export default function HowItWorks() {
  return (
    <section className="section" id="how-it-works" aria-labelledby="how-heading">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">{howItWorks.eyebrow}</p>
          <h2 className="h-section" id="how-heading">
            {howItWorks.heading}
          </h2>
          <p className="lede">{howItWorks.supporting}</p>
        </Reveal>

        {/* ---- flow: Input → AI → Timeline → Understanding ---- */}
        <Reveal>
          <ol className={styles.flow} aria-label="Product flow">
            {howItWorks.flow.map((node, i) => (
              <li
                key={node}
                className={styles.flowStep}
                style={{ "--i": i } as React.CSSProperties}
              >
                <span className={styles.flowDot} aria-hidden="true" />
                <span className={styles.flowLabel}>{node}</span>
                {i < howItWorks.flow.length - 1 ? (
                  <span className={styles.flowLine} aria-hidden="true" />
                ) : null}
              </li>
            ))}
          </ol>
        </Reveal>

        {/* ---- the four steps ---- */}
        <ol className={styles.steps}>
          {howItWorks.steps.map((step, i) => (
            <Reveal as="li" key={step.number} delay={i * 80}>
              <article className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {step.number}
                </span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.description}</p>
              </article>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}