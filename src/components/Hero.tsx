import Link from "next/link";
import { hero } from "@/lib/content";
import HealthStoryVisualization from "./HealthStoryVisualization";
import Reveal from "./Reveal";
import { ArrowRightIcon } from "./icons";
import styles from "./hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero} id="top">
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <div className={`container ${styles.inner}`}>
        <Reveal className={styles.copy}>
          <p className="eyebrow eyebrow--plain">{hero.eyebrow}</p>

          <h1 className={styles.title}>
            {hero.headlineLines.map((line) => (
              <span key={line} className={styles.line}>
                {line}
              </span>
            ))}
          </h1>

          <p className={`lede ${styles.lede}`}>{hero.supporting}</p>

          <div className={`btn-row ${styles.btnRow}`}>
            <Link href="/workspace" className="btn btn--primary">
              {hero.ctaPrimary}
              <ArrowRightIcon size={18} className="btn__arrow" />
            </Link>
            <a href="#how-it-works" className="btn btn--ghost">
              {hero.ctaSecondary}
            </a>
          </div>

          <p className={styles.trust}>
            <span className={styles.trustDot} aria-hidden="true" />
            {hero.trustLine}
          </p>
        </Reveal>

        <Reveal from="scale" delay={120} className={styles.visual}>
          <HealthStoryVisualization />
        </Reveal>
      </div>
    </section>
  );
}