"use client";

import { useState } from "react";
import { SUMMARY } from "@/lib/health/options";
import {
  SECTION_ORDER,
  summaryToPlainText,
  type HealthSummary,
  type SummarySectionKey,
} from "@/lib/health/summary";
import type { AnalyzedEvent } from "@/lib/health/types";
import { CheckIcon, CopyIcon, DocumentIcon, LockIcon } from "../../icons";
import styles from "./summary.module.css";

const SECTION_LABELS: Record<SummarySectionKey, string> = {
  mainConcern: "Main concern",
  timeline: "Timeline",
  changes: "What changed?",
  other: "Other information",
  questions: "Questions",
  missing: "Information not provided",
};

type Props = {
  summary: HealthSummary;
  events: AnalyzedEvent[];
  selected: SummarySectionKey[];
  onToggleSection: (key: SummarySectionKey) => void;
  includeEvidence: boolean;
  onToggleEvidence: (value: boolean) => void;
  showPreview: boolean;
  setShowPreview: (value: boolean | ((prev: boolean) => boolean)) => void;
};

/**
 * SummarySharing — controlled, user-initiated sharing only.
 *
 * Nothing is ever sent anywhere automatically. The user picks sections,
 * chooses whether to include their original phrases, previews exactly
 * what will leave the app, and then explicitly copies, downloads,
 * prints or shares it.
 */
export default function SummarySharing({
  summary,
  events,
  selected,
  onToggleSection,
  includeEvidence,
  onToggleEvidence,
  showPreview,
  setShowPreview,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const demoLabel = summary.isDemo ? SUMMARY.demoGenerated : undefined;

  function buildText() {
    return summaryToPlainText(summary, {
      sections: selected,
      includeEvidence,
      events,
      demoLabel,
    });
  }

  async function copy() {
    const text = buildText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setNotice("Copying isn't available in this browser. You can select the preview text and copy it manually.");
      setShowPreview(true);
    }
  }

  function download() {
    const text = buildText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "healthstory-summary.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function print() {
    const text = buildText();
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      setNotice("Your browser blocked the print window. Enable pop-ups, then try again.");
      return;
    }
    const safe = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>HealthStory AI — Health Conversation Summary</title>` +
        `<style>body{font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:48px auto;padding:0 24px;color:#111;line-height:1.6}h1{font-size:20px}p{white-space:pre-wrap;font-size:14px}</style>` +
        `</head><body><h1>HealthStory AI</h1><p>${safe}</p></body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  }

  async function share() {
    const text = buildText();
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & { share: (d: object) => Promise<void> }).share({
          title: "HealthStory AI — Health Conversation Summary",
          text,
        });
      } catch {
        /* user dismissed the share sheet — not an error */
      }
    } else {
      setNotice(SUMMARY.shareUnsupported);
    }
  }

  return (
    <div>
      <p className={styles.sub}>{SUMMARY.shareSupporting}</p>

      <p className={styles.prepKey} style={{ marginTop: 16 }}>
        {SUMMARY.selectiveHeading}
      </p>
      <div className={styles.selectList} style={{ marginTop: 10 }}>
        {SECTION_ORDER.map((key) => (
          <label key={key} className={styles.selectRow}>
            <input
              type="checkbox"
              checked={selected.includes(key)}
              onChange={() => onToggleSection(key)}
            />
            <span>{SECTION_LABELS[key]}</span>
          </label>
        ))}
        <label className={styles.selectRow}>
          <input
            type="checkbox"
            checked={includeEvidence}
            onChange={(e) => onToggleEvidence(e.target.checked)}
          />
          <span>{SUMMARY.includeEvidenceLabel}</span>
        </label>
      </div>

      <div className={styles.shareActions}>
        <button type="button" className={`${styles.miniBtn} ${styles.miniBtnPrimary}`} onClick={copy}>
          {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
          {copied ? SUMMARY.copiedLabel : SUMMARY.copyCta}
        </button>
        <button type="button" className={styles.miniBtn} onClick={download}>
          <DocumentIcon size={14} />
          {SUMMARY.downloadCta}
        </button>
        <button type="button" className={styles.miniBtn} onClick={print}>
          {SUMMARY.printCta}
        </button>
        <button type="button" className={styles.miniBtn} onClick={share}>
          {SUMMARY.shareNativeCta}
        </button>
        <button
          type="button"
          className={styles.miniBtn}
          onClick={() => setShowPreview((v) => !v)}
          aria-expanded={showPreview}
        >
          {showPreview ? "Hide preview" : SUMMARY.createSelectedCta}
        </button>
      </div>

      {showPreview ? (
        <div style={{ marginTop: 16 }}>
          <p className={styles.prepKey}>{SUMMARY.previewHeading}</p>
          <p className={styles.previewFoot} style={{ marginTop: 4, marginBottom: 8 }}>
            {SUMMARY.previewSub}
          </p>
          {selected.length === 0 ? (
            <p className={styles.absent}>{SUMMARY.previewEmpty}</p>
          ) : (
            <div className={styles.previewDoc}>{buildText()}</div>
          )}
        </div>
      ) : null}

      {notice ? <p className={styles.copied} style={{ color: "var(--sig-rise)", marginTop: 10 }}>{notice}</p> : null}

      <p className={styles.privacyNote}>
        <LockIcon size={15} />
        <span>{SUMMARY.privacyNote}</span>
      </p>
    </div>
  );
}
