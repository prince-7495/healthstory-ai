import { safety } from "@/lib/content";
import Reveal from "./Reveal";
import { ShieldIcon } from "./icons";
import styles from "./values.module.css";

export default function SafetySection() {
  return (
    <section className="section" id="safety" aria-labelledby="safety-heading">
      <div className="container">
        <div className={styles.safetyGrid}>
          <Reveal from="left">
            <span className={styles.shield} aria-hidden="true">
              <ShieldIcon size={26} />
            </span>
            <p className="eyebrow">{safety.eyebrow}</p>
            <h2 className={`h-section ${styles.safetyTitle}`} id="safety-heading">
              {safety.heading}
            </h2>
            <p className="lede">{safety.body}</p>
            <p className={styles.emergency}>{safety.emergencyNote}</p>
          </Reveal>

          <Reveal from="right" delay={100}>
            <ul className={styles.safetyList}>
              {safety.points.map((point, i) => (
                <li key={point.title} className={styles.safetyItem}>
                  <span className={styles.safetyIndex} aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className={styles.safetyItemTitle}>{point.title}</h3>
                    <p className={styles.safetyItemBody}>{point.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}