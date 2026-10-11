"use client";

import { useMemo, useState } from "react";
import { UNDERSTAND } from "@/lib/understand/options";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
  type HealthDocument,
} from "@/lib/journal/types";
import { filterDocuments } from "@/lib/understand/engine";
import {
  DocumentIcon,
  EyeIcon,
  ReadIcon,
  SparkIcon,
  TimelineIcon,
  TrashIcon,
  UploadIcon,
} from "../icons";
import styles from "./understand.module.css";

type Mode = "options" | "upload" | "paste" | "library";

type Props = {
  documents: HealthDocument[];
  onPickFile: (file: { name: string; type: string; size: number; text: string }) => void;
  onPasteText: (text: string) => void;
  onOpenDocument: (id: string) => void;
  onRemoveDocument: (id: string) => void;
  onCancel: () => void;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * UnderstandHome — Stage 8 entry point.
 *
 * Four honest paths: upload, paste, explain a term, or use the story.
 * No OCR is claimed; text files and pasted text are what actually work.
 */
export default function UnderstandHome({
  documents,
  onPickFile,
  onPasteText,
  onOpenDocument,
  onRemoveDocument,
  onCancel,
}: Props) {
  const [mode, setMode] = useState<Mode>("options");
  const [dragOver, setDragOver] = useState(false);
  const [paste, setPaste] = useState("");
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<DocumentType[]>([]);

  const filtered = useMemo(() => filterDocuments(documents, query, types, []), [documents, query, types]);

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      onPickFile({
        name: file.name,
        type: file.type || "text/plain",
        size: file.size,
        text: String(reader.result ?? ""),
      });
    };
    reader.onerror = () => onPickFile({ name: file.name, type: file.type, size: file.size, text: "" });
    reader.readAsText(file);
  }

  return (
    <div className={styles.col}>
      {mode === "options" ? (
        <section className={styles.panel} aria-labelledby="understand-options">
          <div className={styles.panelHead}>
            <ReadIcon size={16} />
            <h2 className={styles.panelTitle} id="understand-options">
              {UNDERSTAND.homeHeading}
            </h2>
          </div>
          <div className={styles.panelBody}>
            <p className={styles.sub}>{UNDERSTAND.homeSupporting}</p>

            <div className={styles.choiceGrid} style={{ marginTop: 16 }}>
              <button type="button" className={styles.choice} onClick={() => setMode("upload")}>
                <UploadIcon size={18} className={styles.choiceIcon} />
                <span className={styles.choiceLabel}>{UNDERSTAND.optionUpload}</span>
                <span className={styles.choiceHint}>{UNDERSTAND.optionUploadHint}</span>
              </button>
              <button type="button" className={styles.choice} onClick={() => setMode("paste")}>
                <ReadIcon size={18} className={styles.choiceIcon} />
                <span className={styles.choiceLabel}>{UNDERSTAND.optionPaste}</span>
                <span className={styles.choiceHint}>{UNDERSTAND.optionPasteHint}</span>
              </button>
              <button type="button" className={styles.choice} onClick={() => setMode("library")}>
                <DocumentIcon size={18} className={styles.choiceIcon} />
                <span className={styles.choiceLabel}>{UNDERSTAND.optionTerm}</span>
                <span className={styles.choiceHint}>{UNDERSTAND.optionTermHint}</span>
              </button>
              <button type="button" className={styles.choice} onClick={() => setMode("library")}>
                <TimelineIcon size={18} className={styles.choiceIcon} />
                <span className={styles.choiceLabel}>{UNDERSTAND.optionStory}</span>
                <span className={styles.choiceHint}>{UNDERSTAND.optionStoryHint}</span>
              </button>
            </div>

            <div className={styles.safeNote} style={{ marginTop: 16 }}>
              {UNDERSTAND.safetyBanner}
            </div>
            <p className={styles.note}>{UNDERSTAND.uploadPrivacy}</p>
            <p className={styles.note}>{UNDERSTAND.uploadNotSecure}</p>
          </div>
        </section>
      ) : null}

      {mode === "upload" ? (
        <section className={styles.panel} aria-labelledby="understand-upload">
          <div className={styles.panelHead}>
            <UploadIcon size={16} />
            <h2 className={styles.panelTitle} id="understand-upload">
              {UNDERSTAND.uploadHeading}
            </h2>
            <span className={styles.panelCount}>TXT / paste</span>
          </div>
          <div className={styles.panelBody}>
            <label
              htmlFor="doc-file"
              className={styles.dropzone}
              data-over={dragOver ? "true" : "false"}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) readFile(f);
              }}
            >
              <span className={styles.dropzoneTitle}>{UNDERSTAND.uploadDropzone}</span>
              <span className={styles.dropzoneSub}>{UNDERSTAND.uploadChoose}</span>
              <span className={styles.dropzoneTypes}>{UNDERSTAND.uploadTypes}</span>
            </label>
            <input
              id="doc-file"
              type="file"
              accept=".txt,.md,text/plain"
              style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFile(f);
              }}
            />
            <p className={styles.note}>{UNDERSTAND.uploadSupporting}</p>
            <p className={styles.note}>{UNDERSTAND.uploadProcessing}</p>
            <div className={styles.row} style={{ marginTop: 16 }}>
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setMode("options")}>
                {UNDERSTAND.backCta}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {mode === "paste" ? (
        <section className={styles.panel} aria-labelledby="understand-paste">
          <div className={styles.panelHead}>
            <ReadIcon size={16} />
            <h2 className={styles.panelTitle} id="understand-paste">
              {UNDERSTAND.optionPaste}
            </h2>
          </div>
          <div className={styles.panelBody}>
            <label className={styles.fieldLabel} htmlFor="paste-text">
              Paste the text you want explained
            </label>
            <textarea
              id="paste-text"
              className={styles.textarea}
              value={paste}
              placeholder="Paste text from a report, note, message or instruction sheet…"
              onChange={(e) => setPaste(e.target.value)}
            />
            <div className={styles.row} style={{ marginTop: 14 }}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={!paste.trim()}
                onClick={() => onPasteText(paste)}
              >
                <SparkIcon size={16} />
                {UNDERSTAND.understandCta}
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setMode("options")}>
                {UNDERSTAND.backCta}
              </button>
            </div>
            <p className={styles.note}>{UNDERSTAND.uploadPrivacy}</p>
          </div>
        </section>
      ) : null}

      {mode === "library" ? (
        <section className={styles.panel} aria-labelledby="understand-library">
          <div className={styles.panelHead}>
            <DocumentIcon size={16} />
            <h2 className={styles.panelTitle} id="understand-library">
              {UNDERSTAND.documentLibrary.heading}
            </h2>
            <span className={styles.panelCount}>{documents.length}</span>
          </div>
          <div className={styles.panelBody}>
            <label className={styles.fieldLabel} htmlFor="doc-search">
              Search documents
            </label>
            <input
              id="doc-search"
              type="search"
              className={styles.input}
              placeholder="Search documents, sections or terms…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <p className={styles.note}>
              Search matches file names, sections and medical terms. Open a document, then tap a term
              chip to see its plain-language meaning.
            </p>

            <div className={styles.row} style={{ marginTop: 12 }}>
              {(["TEST_REPORT", "APPOINTMENT_NOTE", "INSTRUCTION_SHEET", "GENERAL_HEALTH"] as DocumentType[]).map((t) => {
                const on = types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`${styles.btn} ${styles.btnSm} ${on ? styles.btnPrimary : styles.btnGhost}`}
                    aria-pressed={on}
                    onClick={() =>
                      setTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
                    }
                  >
                    {DOCUMENT_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 16 }}>
              {documents.length === 0 ? (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>{UNDERSTAND.documentLibrary.empty}</p>
                </div>
              ) : filtered.length === 0 ? (
                <p className={styles.sub}>No documents matched your search.</p>
              ) : (
                filtered.map((d) => (
                  <div key={d.id} className={styles.docCard}>
                    <div className={styles.docCardTop}>
                      <span className={styles.docCardName}>{d.filename}</span>
                      <div className={styles.row}>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                          onClick={() => onOpenDocument(d.id)}
                        >
                          <EyeIcon size={13} />
                          {UNDERSTAND.understandCta}
                        </button>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
                          aria-label={`Remove ${d.filename}`}
                          onClick={() => onRemoveDocument(d.id)}
                        >
                          <TrashIcon size={13} />
                        </button>
                      </div>
                    </div>
                    <div className={styles.docCardMeta}>
                      <span className={`${styles.tag} ${styles.tagType}`}>
                        {DOCUMENT_TYPE_LABELS[d.type]}
                      </span>
                      <span className={`${styles.tag} ${styles.tagMuted}`}>
                        {DOCUMENT_STATUS_LABELS[d.status]}
                      </span>
                      <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                      <span>{formatSize(d.fileSize)}</span>
                      {d.analysis ? (
                        <span>
                          {d.analysis.sections.length} sections · {d.analysis.terms.length} terms ·{" "}
                          {d.analysis.measurements.length} measurements
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={styles.row} style={{ marginTop: 16 }}>
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setMode("options")}>
                {UNDERSTAND.backCta}
              </button>
              {onCancel ? (
                <button type="button" className={styles.linkBtn} onClick={onCancel}>
                  Back to My Story
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
