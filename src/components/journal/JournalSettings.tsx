"use client";

import { useState } from "react";
import { JOURNAL } from "@/lib/journal/options";
import type { StoryPreferences } from "@/lib/journal/types";
import { EyeOffIcon, LockIcon, ShieldIcon, TrashIcon } from "../icons";
import styles from "./journal.module.css";

type Props = {
  preferences: StoryPreferences;
  onToggle: (key: keyof StoryPreferences, value: boolean) => void;
  onDeleteStory: () => void;
  onStartFresh: () => void;
  onLoadDemo: () => void;
  storageAvailable: boolean;
};

const TOGGLES: { key: keyof StoryPreferences; label: string; help: string }[] = [
  {
    key: "saveUpdates",
    label: JOURNAL.settingSaveUpdates,
    help: "When on, new updates become part of your stored story. When off, they are organized for this session only.",
  },
  {
    key: "keepSummaries",
    label: JOURNAL.settingKeepSummaries,
    help: "Keep each generated summary version so you can look back at earlier ones.",
  },
  {
    key: "saveEvidence",
    label: JOURNAL.settingSaveEvidence,
    help: "Keep the original phrases behind each detected change so comparisons stay explainable.",
  },
  {
    key: "demoMode",
    label: JOURNAL.settingDemoMode,
    help: "Use the fictional demonstration story. No real health information is involved.",
  },
];

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={styles.switch}
      data-on={on}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    >
      <span className={styles.switchKnob} />
    </button>
  );
}

/**
 * JournalSettings — user-controlled memory and privacy.
 *
 * There is no hidden health profile: what is on this screen is exactly
 * what the product stores, and deletion is one obvious button.
 */
export default function JournalSettings({
  preferences,
  onToggle,
  onDeleteStory,
  onStartFresh,
  onLoadDemo,
  storageAvailable,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section className={styles.panel} aria-labelledby="settings-heading">
      <div className={styles.panelHead}>
        <ShieldIcon size={17} />
        <h2 className={styles.panelTitle} id="settings-heading">
          {JOURNAL.settingsHeading}
        </h2>
      </div>
      <div className={styles.panelBody}>
        <p className={styles.drawerKey}>{JOURNAL.memoryHeading}</p>
        <p className={styles.sub}>{JOURNAL.memoryExplanation}</p>

        <div style={{ marginTop: 8 }}>
          {TOGGLES.map((t) => (
            <div key={t.key} className={styles.toggleRow}>
              <div>
                <p className={styles.toggleLabel}>{t.label}</p>
                <p className={styles.toggleHelp}>{t.help}</p>
              </div>
              <Toggle
                on={Boolean(preferences[t.key])}
                onChange={(v) => onToggle(t.key, v)}
                label={t.label}
              />
            </div>
          ))}
        </div>

        <p className={styles.principle}>{JOURNAL.principle}</p>

        <p className={styles.storageNote}>
          <LockIcon size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            {JOURNAL.storageNote}{" "}
            {storageAvailable
              ? "It is saved in this browser only and is never sent anywhere."
              : "This browser has storage unavailable, so your story is kept for this session only."}
          </span>
        </p>

        <div className={styles.quickRow} style={{ marginTop: 16 }}>
          <span className={`${styles.badge} ${styles.badgeGhost}`}>
            <EyeOffIcon size={13} />
            {JOURNAL.privacyHeading}: {JOURNAL.privacyPrivate}
          </span>
        </div>

        <div className={styles.dangerZone}>
          <div className={styles.btnRow}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={onStartFresh}>
              Start a new story
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={onLoadDemo}>
              {JOURNAL.demoCta}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => setConfirming(true)}>
              <TrashIcon size={13} />
              {JOURNAL.deleteStoryCta}
            </button>
          </div>

          {confirming ? (
            <div className={styles.alert} style={{ marginTop: 14, background: "#fbeaea", borderColor: "#e2b4b4" }}>
              <p className={styles.alertTitle} style={{ color: "#a33" }}>{JOURNAL.deleteConfirmHeading}</p>
              <p className={styles.alertText} style={{ color: "#8f3a3a" }}>
                {JOURNAL.deleteConfirmBody} {JOURNAL.deleteWarning}
              </p>
              <div className={styles.alertActions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                  onClick={() => {
                    setConfirming(false);
                    onDeleteStory();
                  }}
                >
                  <TrashIcon size={13} />
                  {JOURNAL.deleteConfirmCta}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                  onClick={() => setConfirming(false)}
                >
                  {JOURNAL.cancelCta}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
