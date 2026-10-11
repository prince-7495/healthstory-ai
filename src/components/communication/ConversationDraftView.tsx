"use client";

import { useState } from "react";
import { CONVERSATION } from "@/lib/communication/options";
import { COMMUNICATION_LANGUAGES, heading } from "@/lib/communication/languages";
import type {
  CommunicationDraft,
  CommunicationLine,
  CommunicationValidation,
  ConversationSelection,
} from "@/lib/communication/types";
import type { StoryEvolution } from "@/lib/journal/types";
import type { AnalyzedEvent } from "@/lib/health/types";
import { sourcesFor } from "@/lib/health/summary";
import {
  AlertIcon,
  CheckIcon,
  CopyIcon,
  DocumentIcon,
  EyeIcon,
  PencilIcon,
  QuoteIcon,
  SparkIcon,
} from "../icons";
import RehearsalMode from "./RehearsalMode";
import styles from "./communication.module.css";

type SectionKey = "whatINoticed" | "timeline" | "reportedChanges" | "relevantContext";

type Props = {
  draft: CommunicationDraft;
  referenceDraft: CommunicationDraft | null;
  validation: CommunicationValidation;
  events: AnalyzedEvent[];
  conflicts: StoryEvolution[];
  onEditLine: (section: SectionKey | "recentUpdate", id: string, text: string) => void;
  onRegenerate: (kind: string) => void;
  onLanguageChange: (id: ConversationSelection["language"]) => void;
  onDiscard: () => void;
  onUseVersion: () => void;
};

const SECTION_ORDER: { key: SectionKey; label: string }[] = [
  { key: "whatINoticed", label: "noticed" },
  { key: "reportedChanges", label: "changed" },
  { key: "timeline", label: "started" },
  { key: "relevantContext", label: "context" },
];

function Section({
  titleKey,
  label,
  lines,
  lang,
  editing,
  onStartEdit,
  onSave,
  onCancel,
  events,
}: {
  titleKey: string;
  label: string;
  lines: CommunicationLine[];
  lang: CommunicationDraft["language"];
  editing: { section: string; id: string } | null;
  onStartEdit: (section: string, id: string, text: string) => void;
  onSave: (section: string, id: string, text: string) => void;
  onCancel: () => void;
  events: AnalyzedEvent[];
}) {
  const [evidence, setEvidence] = useState(false);
  if (lines.length === 0) return null;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{heading(lang, titleKey)}</h3>
        <button type="button" className={styles.linkBtn} onClick={() => setEvidence((v) => !v)} aria-expanded={evidence}>
          <EyeIcon size={12} />
          {evidence ? CONVERSATION.evidenceClose : CONVERSATION.evidenceLabel}
        </button>
      </div>
      {lines.map((l) =>
        editing && editing.section === label && editing.id === l.id ? (
          <EditLine key={l.id} value={l.text} onSave={(t) => onSave(label, l.id, t)} onCancel={onCancel} />
        ) : (
          <div key={l.id} className={styles.line}>
            <p className={styles.lineText}>{l.text}</p>
            <div className={styles.lineMeta}>
              <span className={`${styles.tag} ${styles.tagAi}`}>{CONVERSATION.aiOrganizedBadge}</span>
              {l.userEdited ? <span className={`${styles.tag} ${styles.tagEdited}`}>{CONVERSATION.userEditedBadge}</span> : null}
              {!l.localized ? <span className={`${styles.tag} ${styles.tagPrototype}`}>Prototype · not localized</span> : null}
              <button type="button" className={styles.linkBtn} onClick={() => onStartEdit(label, l.id, l.text)}>
                <PencilIcon size={12} />
                {CONVERSATION.editCta}
              </button>
            </div>
            {evidence ? (
              <div className={styles.evidence}>
                <p className={styles.key}>{CONVERSATION.whyIncluded}</p>
                <p>{CONVERSATION.whyIncludedBody.replace("{count}", String(l.sourceEventIds.length))}</p>
                {sourcesFor(l.sourceEventIds, events).map((s) => (
                  <p key={s.eventId} style={{ marginTop: 6 }}>
                    <QuoteIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                    <span className={styles.evidenceQuote}>&ldquo;{s.text}&rdquo;</span>{" "}
                    <span className={styles.sub}>({s.timeLabel})</span>
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ),
      )}
    </div>
  );
}

function EditLine({ value, onSave, onCancel }: { value: string; onSave: (t: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(value);
  return (
    <div style={{ marginBottom: 8 }}>
      <textarea className={styles.lineEditor} value={text} onChange={(e) => setText(e.target.value)} aria-label={CONVERSATION.editCta} />
      <div className={styles.row} style={{ marginTop: 7 }}>
        <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={() => onSave(text)}>
          <CheckIcon size={13} />
          {CONVERSATION.saveCta}
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={onCancel}>
          {CONVERSATION.cancelCta}
        </button>
      </div>
    </div>
  );
}

export default function ConversationDraftView({
  draft,
  referenceDraft,
  validation,
  events,
  conflicts,
  onEditLine,
  onRegenerate,
  onLanguageChange,
  onDiscard,
  onUseVersion,
}: Props) {
  const [view, setView] = useState<"summary" | "conversation" | "bridge" | "rehearsal">("summary");
  const [editing, setEditing] = useState<{ section: string; id: string } | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [copied, setCopied] = useState(false);
  const lang = draft.language;
  const langLabel = COMMUNICATION_LANGUAGES.find((l) => l.id === lang)?.label ?? "English";

  async function copy() {
    try {
      const { draftToPlainText } = await import("@/lib/communication/engine");
      await navigator.clipboard.writeText(draftToPlainText(draft));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function print() {
    const { draftToPrintHtml } = await import("@/lib/communication/engine");
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.write(draftToPrintHtml(draft));
    win.document.close();
    win.focus();
    win.print();
  }

  if (view === "rehearsal") {
    return <RehearsalMode draft={draft} onExit={() => setView("summary")} />;
  }

  return (
    <div className={styles.col}>
      <section className={styles.panel} aria-labelledby="conv-draft-head">
        <div className={styles.panelHead}>
          <SparkIcon size={16} />
          <h2 className={styles.panelTitle} id="conv-draft-head">
            Conversation Summary
          </h2>
          <span className={styles.panelCount}>v{draft.version}</span>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.row} style={{ marginBottom: 12 }}>
            <span className={`${styles.tag} ${styles.tagAi}`}>Period: {draft.periodLabel}</span>
            <span className={`${styles.tag} ${styles.tagAi}`}>{langLabel}</span>
            <span className={`${styles.tag} ${styles.tagAi}`}>{draft.style}</span>
            {draft.userEdited ? <span className={`${styles.tag} ${styles.tagEdited}`}>{CONVERSATION.userEditedBadge}</span> : null}
            {lang !== "en" ? <span className={`${styles.tag} ${styles.tagPrototype}`}>{CONVERSATION.prototypeNote}</span> : null}
          </div>

          <div className={styles.row} style={{ marginBottom: 14 }}>
            <button
              type="button"
              className={styles.pillBtn}
              data-active={view === "summary"}
              onClick={() => setView("summary")}
            >
              {CONVERSATION.summaryViewCta}
            </button>
            <button
              type="button"
              className={styles.pillBtn}
              data-active={view === "conversation"}
              onClick={() => setView("conversation")}
            >
              {CONVERSATION.conversationViewCta}
            </button>
            {lang !== "en" ? (
              <button
                type="button"
                className={styles.pillBtn}
                data-active={view === "bridge"}
                onClick={() => setView("bridge")}
              >
                {CONVERSATION.bridgeHeading}
              </button>
            ) : null}
            <button type="button" className={styles.pillBtn} onClick={() => setView("rehearsal")}>
              {CONVERSATION.rehearsalHeading}
            </button>
          </div>

          {conflicts.length > 0 ? (
            <div className={styles.alert} style={{ marginBottom: 14 }}>
              <p className={styles.alertTitle}>{CONVERSATION.conflictHeading}</p>
              <p className={styles.alertText}>{CONVERSATION.conflictBody}</p>
              {conflicts.map((c) => (
                <p key={c.id} className={styles.alertText} style={{ marginTop: 6 }}>
                  <span className={styles.evidenceQuote}>&ldquo;{c.previousSourceText}&rdquo;</span> ↔{" "}
                  <span className={styles.evidenceQuote}>&ldquo;{c.currentSourceText}&rdquo;</span>
                </p>
              ))}
            </div>
          ) : null}

          {view === "conversation" ? (
            <div className={styles.conversation}>
              {SECTION_ORDER.map(({ key, label }, i) => {
                const lines = draft[key];
                if (lines.length === 0) return null;
                return (
                  <div key={key}>
                    {i > 0 ? <p className={styles.convArrow} aria-hidden="true">↓</p> : null}
                    <div className={styles.convCard}>
                      <p className={styles.convLabel}>{heading(lang, label)}</p>
                      {lines.map((l) => (
                        <p key={l.id} className={styles.convText}>
                          {l.text}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
              {draft.recentUpdate ? (
                <div className={styles.convCard}>
                  <p className={styles.convLabel}>{heading(lang, "recent")}</p>
                  <p className={styles.convText}>{draft.recentUpdate.text}</p>
                </div>
              ) : null}
              {draft.questions.length > 0 ? (
                <div className={styles.convCard}>
                  <p className={styles.convLabel}>{heading(lang, "questions")}</p>
                  <div className={styles.convQuestions}>
                    {draft.questions.map((q) => (
                      <p key={q.id} className={styles.convQ}>
                        {q.text}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : view === "bridge" ? (
            <div className={styles.bridge}>
              <div className={styles.bridgeCol}>
                <p className={styles.bridgeKey}>{CONVERSATION.originalLabel} (English)</p>
                {referenceDraft
                  ? [
                      ...referenceDraft.whatINoticed,
                      ...referenceDraft.reportedChanges,
                      ...referenceDraft.timeline,
                      ...referenceDraft.relevantContext,
                      ...(referenceDraft.recentUpdate ? [referenceDraft.recentUpdate] : []),
                    ].map((l) => (
                      <p key={l.id} className={styles.bridgeLine}>
                        {l.text}
                      </p>
                    ))
                  : <p className={styles.sub}>English reference unavailable.</p>}
              </div>
              <div className={styles.bridgeCol}>
                <p className={styles.bridgeKey}>
                  {CONVERSATION.communicationLabel} ({langLabel})
                </p>
                {[
                  ...draft.whatINoticed,
                  ...draft.reportedChanges,
                  ...draft.timeline,
                  ...draft.relevantContext,
                  ...(draft.recentUpdate ? [draft.recentUpdate] : []),
                ].map((l) => (
                  <p key={l.id} className={styles.bridgeLine}>
                    {l.text}
                    {!l.localized ? <span className={styles.bridgeMissing}> · {CONVERSATION.notLocalizedNote}</span> : null}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <>
              {SECTION_ORDER.map(({ key, label }) => (
                <Section
                  key={key}
                  titleKey={label}
                  label={label}
                  lines={draft[key]}
                  lang={lang}
                  editing={editing}
                  events={events}
                  onStartEdit={(s, id) => setEditing({ section: s, id })}
                  onSave={(s, id, text) => {
                    onEditLine(s as SectionKey, id, text);
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              ))}

              {draft.recentUpdate ? (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>{heading(lang, "recent")}</h3>
                  <div className={styles.line}>
                    <p className={styles.lineText}>{draft.recentUpdate.text}</p>
                  </div>
                </div>
              ) : null}

              {draft.missingInformation.length > 0 ? (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>{heading(lang, "missing")}</h3>
                  <ul>
                    {draft.missingInformation.map((m, i) => (
                      <li key={`${m}-${i}`} className={styles.line} style={{ borderColor: "#f0dfbb" }}>
                        <AlertIcon size={13} style={{ verticalAlign: "-2px", marginRight: 6, color: "var(--sig-rise)" }} />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}

          <div className={styles.row} style={{ marginTop: 18 }}>
            {CONVERSATION.regenerateOptions.map((o) => (
              <button key={o.id} type="button" className={styles.pillBtn} onClick={() => onRegenerate(o.id)}>
                {CONVERSATION.regenerateCta}: {o.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="conv-check">
        <div className={styles.panelHead}>
          <CheckIcon size={16} />
          <h2 className={styles.panelTitle} id="conv-check">
            {CONVERSATION.validationHeading}
          </h2>
        </div>
        <div className={styles.panelBody}>
          {validation.ok ? (
            <p className={styles.okNote}>{CONVERSATION.validationOk}</p>
          ) : (
            <div className={styles.alert}>
              <p className={styles.alertTitle}>{CONVERSATION.validationIssues}</p>
              {validation.issues.map((issue, i) => (
                <p key={`${issue.pattern}-${i}`} className={styles.alertText}>
                  {issue.message}
                </p>
              ))}
            </div>
          )}

          <div className={styles.row} style={{ marginTop: 14 }}>
            <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={copy}>
              <CopyIcon size={14} />
              {copied ? CONVERSATION.copiedLabel : CONVERSATION.copyCta}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={print}>
              <DocumentIcon size={14} />
              {CONVERSATION.printCta}
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={print}>
              {CONVERSATION.exportPdfCta}
            </button>
            <label className={styles.select} style={{ width: "auto" }}>
              <span className="sr-only">{CONVERSATION.languageHeading}</span>
              <select
                aria-label={CONVERSATION.switchLanguage}
                value={lang}
                onChange={(e) => onLanguageChange(e.target.value as ConversationSelection["language"])}
                style={{ border: 0, background: "transparent" }}
              >
                {COMMUNICATION_LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className={styles.note}>{CONVERSATION.exportNote}</p>
          <p className={styles.disclaimer} style={{ marginTop: 8 }}>{CONVERSATION.exportDisclaimer}</p>
        </div>
      </section>

      <div className={styles.final}>
        <p className={styles.finalTitle}>{CONVERSATION.finalHeading}</p>
        <p className={styles.finalText}>{CONVERSATION.finalSupporting}</p>
        <label className={styles.finalCheck}>
          <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
          <span>{CONVERSATION.finalCheckbox}</span>
        </label>
        <div className={styles.row} style={{ marginTop: 14 }}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={!reviewed}
            onClick={onUseVersion}
          >
            <CheckIcon size={15} />
            {CONVERSATION.useThisVersionCta}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onDiscard}>
            {CONVERSATION.discardCta}
          </button>
        </div>
      </div>
    </div>
  );
}
