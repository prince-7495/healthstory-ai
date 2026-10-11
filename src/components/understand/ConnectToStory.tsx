"use client";

import { useState } from "react";
import { UNDERSTAND } from "@/lib/understand/options";
import {
  createDocumentImportItems,
  type DocumentImportEvent,
  type ImportSelection,
} from "@/lib/understand/engine";
import type { HealthDocument } from "@/lib/journal/types";
import { CheckIcon, DocumentIcon, GlobeIcon, PlusIcon, TimelineIcon } from "../icons";
import styles from "./understand.module.css";

type Props = {
  document: HealthDocument;
  onConfirm: (payload: {
    events: DocumentImportEvent[];
    followUpText?: string;
    conversationItems: string[];
    docLabel: string;
  }) => void;
  onCancel: () => void;
};

/**
 * ConnectToStage — the Stage 8 "user decides what enters the story" gate.
 *
 * §42 never auto-import. Every row is opt-in, and only source-grounded facts,
 * document metadata and user-chosen items can be imported (§80).
 */
export default function ConnectToStory({ document, onConfirm, onCancel }: Props) {
  const [selection, setSelection] = useState<ImportSelection>({
    addDocumentEvent: true,
    addMeasurements: [],
    addFollowUpDraft: false,
    addToConversation: false,
  });
  const [step, setStep] = useState<"select" | "review">("select");

  const measurements = document.analysis?.measurements ?? [];
  const hasSelection =
    selection.addDocumentEvent ||
    selection.addMeasurements.length > 0 ||
    selection.addFollowUpDraft ||
    selection.addToConversation;

  function toggleMeasurement(id: string) {
    setSelection((s) => ({
      ...s,
      addMeasurements: s.addMeasurements.includes(id)
        ? s.addMeasurements.filter((x) => x !== id)
        : [...s.addMeasurements, id],
    }));
  }

  return (
    <section className={styles.panel} aria-labelledby="connect-story">
      <div className={styles.panelHead}>
        <TimelineIcon size={16} />
        <h2 className={styles.panelTitle} id="connect-story">
          {step === "select" ? UNDERSTAND.connectToStory.heading : "Confirm & Add"}
        </h2>
        <span className={styles.panelCount}>{document.filename}</span>
      </div>
      <div className={styles.panelBody}>
        <p className={styles.sub}>{UNDERSTAND.connectToStory.noAutoImport}</p>

        <ol className={styles.stages} style={{ listStyle: "none", padding: 0, marginTop: 14 }}>
          {UNDERSTAND.connectToStory.pipeline.map((p, i) => (
            <li key={p} className={styles.stage} data-state={i <= 3 ? "done" : i === 4 ? "active" : "todo"}>
              <span className={styles.stageDot} aria-hidden="true">
                {i <= 3 ? <CheckIcon size={12} /> : i + 1}
              </span>
              <span className={styles.stageText}>{p}</span>
            </li>
          ))}
        </ol>

        {step === "select" ? (
          <div style={{ marginTop: 18 }}>
            <p className={styles.key}>Information to add</p>

            <button
              type="button"
              className={styles.importItem}
              data-checked={selection.addDocumentEvent}
              aria-pressed={selection.addDocumentEvent}
              onClick={() => setSelection((s) => ({ ...s, addDocumentEvent: !s.addDocumentEvent }))}
            >
              <span className={styles.importCheck} aria-hidden="true">
                {selection.addDocumentEvent ? <CheckIcon size={12} /> : null}
              </span>
              <span>
                <span className={styles.importLabel}>
                  {UNDERSTAND.connectToStory.options.reportMentioned}
                </span>
                <span className={styles.importHint}>
                  Document date {document.analysis?.dates[0] ?? "not recorded"} ·{" "}
                  {UNDERSTAND.connectToStory.sourceAttribution}
                </span>
              </span>
            </button>

            {measurements.map((m) => (
              <button
                key={m.id}
                type="button"
                className={styles.importItem}
                data-checked={selection.addMeasurements.includes(m.id)}
                aria-pressed={selection.addMeasurements.includes(m.id)}
                onClick={() => toggleMeasurement(m.id)}
              >
                <span className={styles.importCheck} aria-hidden="true">
                  {selection.addMeasurements.includes(m.id) ? <CheckIcon size={12} /> : null}
                </span>
                <span>
                  <span className={styles.importLabel}>
                    {m.label}: {m.value} {m.unit}
                  </span>
                  <span className={styles.importHint}>
                    {UNDERSTAND.connectToStory.sourceAttribution} ·{" "}
                    {UNDERSTAND.connectToStory.pageAttribution.replace(
                      "{page}",
                      String(document.analysis?.sourceReferences[0]?.pageNumber ?? 1)
                    )}
                    {m.referenceRange ? ` · Reference range shown in the document: ${m.referenceRange}` : ""}
                  </span>
                </span>
              </button>
            ))}

            <button
              type="button"
              className={styles.importItem}
              data-checked={selection.addFollowUpDraft}
              aria-pressed={selection.addFollowUpDraft}
              onClick={() => setSelection((s) => ({ ...s, addFollowUpDraft: !s.addFollowUpDraft }))}
            >
              <span className={styles.importCheck} aria-hidden="true">
                {selection.addFollowUpDraft ? <CheckIcon size={12} /> : null}
              </span>
              <span>
                <span className={styles.importLabel}>{UNDERSTAND.connectToStory.options.followUpInfo}</span>
                <span className={styles.importHint}>{UNDERSTAND.followUpBridge.noAutoSave}</span>
              </span>
            </button>

            <button
              type="button"
              className={styles.importItem}
              data-checked={selection.addToConversation}
              aria-pressed={selection.addToConversation}
              onClick={() => setSelection((s) => ({ ...s, addToConversation: !s.addToConversation }))}
            >
              <span className={styles.importCheck} aria-hidden="true">
                {selection.addToConversation ? <CheckIcon size={12} /> : null}
              </span>
              <span>
                <span className={styles.importLabel}>{UNDERSTAND.conversationBridge.heading}</span>
                <span className={styles.importHint}>{UNDERSTAND.conversationBridge.description}</span>
              </span>
            </button>

            <div className={styles.row} style={{ marginTop: 18 }}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={!hasSelection}
                onClick={() => setStep("review")}
              >
                <PlusIcon size={16} />
                {UNDERSTAND.connectToStory.addSelectedCta}
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            <p className={styles.key}>Review before adding</p>
            <div className={styles.stackBody}>
              {selection.addDocumentEvent ? (
                <p>☑ {document.filename} recorded as a document event</p>
              ) : null}
              {selection.addMeasurements.map((id) => {
                const m = measurements.find((x) => x.id === id);
                return m ? (
                  <p key={id}>
                    ☑ {m.label}: {m.value} {m.unit}
                  </p>
                ) : null;
              })}
              {selection.addFollowUpDraft ? <p>☑ Follow-up draft created</p> : null}
              {selection.addToConversation ? <p>☑ Added to Conversation Mode</p> : null}
            </div>

            <div className={styles.safeNote} style={{ marginTop: 14 }}>
              Only source-grounded facts and document metadata you selected are added. No AI
              interpretation, diagnosis, treatment recommendation or unconfirmed conclusion is imported.
            </div>

            <div className={styles.row} style={{ marginTop: 18 }}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() =>
                  onConfirm({
                    ...createDocumentImportItems(document, selection),
                    docLabel: document.filename,
                  })
                }
              >
                <CheckIcon size={16} />
                Confirm &amp; Add
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setStep("select")}
              >
                Back
              </button>
            </div>

            <p className={styles.note}>
              <GlobeIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
              Imported events carry{" "}
              <strong>{UNDERSTAND.connectToStory.sourceAttribution}</strong> so the source stays attached
              to the story (source graph: Event → Follow-Up → Document → Page → Text).
            </p>
            <p className={styles.disclaimer} style={{ marginTop: 8 }}>
              <DocumentIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
              {UNDERSTAND.disclaimer}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
