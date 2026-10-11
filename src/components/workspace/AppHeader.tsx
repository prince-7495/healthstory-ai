"use client";

import Link from "next/link";
import { brand } from "@/lib/content";
import { ArrowRightIcon, LogoMark, SparkIcon } from "../icons";
import { WORKSPACE } from "@/lib/health/options";
import styles from "./workspace.module.css";

/**
 * AppHeader — the workspace chrome.
 *
 * Deliberately calmer than the landing navbar: the user is inside the
 * product now, so the job of this bar is orientation (where am I, what
 * stage am I at, how do I get out), not persuasion.
 */
export default function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerInner}`}>
        <Link href="/" className={styles.brand} aria-label={`${brand.name} — home`}>
          <LogoMark size={28} />
          <span className={styles.brandText}>{brand.name}</span>
        </Link>

        <div className={styles.headerTitle}>
          <span className={styles.headerLabel}>{brand.name}</span>
          <span className={styles.headerSub}>{WORKSPACE.headerLabel}</span>
        </div>

        <div className={styles.headerRight}>
          <Link href="/my-story" className={styles.backLink}>
            <SparkIcon size={15} />
            My Story
          </Link>
          <Link href="/" className={styles.backLink}>
            <ArrowRightIcon size={16} className={styles.backArrow} />
            {WORKSPACE.backToSite}
          </Link>
        </div>
      </div>
    </header>
  );
}