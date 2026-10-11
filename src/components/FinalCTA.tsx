"use client";

import { useState } from "react";
import Link from "next/link";
import { finalCta } from "@/lib/content";
import { ArrowRightIcon, CloseIcon, SparkIcon } from "./icons";
import styles from "./cta.module.css";

/**
 * FinalCTA — closing call to action.
 *
 * The primary button now enters the real product (Stage 2, /workspace).
 * The secondary button opens an honest panel that names the three input
 * routes and marks the ones that are still planned, so the landing page
 * never claims a capability the build does not have yet.
 */
export default function FinalCTA() {
  const [open, setOpen] = useState(false);

  return (
    <section className="section section--dark" id="start" aria-labelledby="cta-heading">
      <div className={styles.ambient} aria-hidden="true" />
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className="eyebrow">{finalCta.eyebrow}</p>
          <h2 className={styles.title} id="cta-heading">
            {finalCta.heading}
          </h2>
          <p className={styles.lede}>{finalCta.supporting}</p>

          <div className={`btn-row ${styles.btnRow}`}>
            <Link href="/workspace" className="btn btn--light">
              {finalCta.primary}
              <ArrowRightIcon size={18} className="btn__arrow" />
            </Link>
            <button
              type="button"
              className="btn btn--onDark"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="start-panel"
            >
              How it works
              {open ? <CloseIcon size={18} /> : null}
            </button>
          </div>

          <p className={styles.secondary}>{finalCta.secondary}</p>
        </div>

        <div
          id="start-panel"
          className={styles.panel}
          data-open={open || undefined}
          hidden={!open}
        >
          <p className={styles.panelLabel}>Three ways your story can begin</p>

          <ul className={styles.paths}>
            {finalCta.paths.map((path, i) => (
              <li key={path.title} className={styles.path} style={{ "--i": i } as React.CSSProperties}>
                <span className={styles.pathIndex} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className={styles.pathBody}>
                  <h3 className={styles.pathTitle}>{path.title}</h3>
                  <p className={styles.pathText}>{path.description}</p>
                </div>
                <span className={styles.pathStatus}>{path.status}</span>
              </li>
            ))}
          </ul>

          <p className={styles.panelNote}>
            <SparkIcon size={15} />
            <span>{finalCta.stageNote}</span>
          </p>
        </div>
      </div>
    </section>
  );
}