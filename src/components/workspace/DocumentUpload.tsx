"use client";

import { useId, useRef, useState } from "react";
import { DOCUMENT } from "@/lib/health/options";
import type { StoryDocument } from "@/lib/health/types";
import { makeId } from "@/lib/health/types";
import { DocumentIcon, InfoIcon, TrashIcon, UploadIcon } from "../icons";
import styles from "./workspace.module.css";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const MAX_BYTES = 10 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  documents: StoryDocument[];
  onChange: (documents: StoryDocument[]) => void;
};

/**
 * DocumentUpload — file name and size only.
 *
 * This is the important honesty boundary of the stage: the file is
 * registered, its name is listed, and that is *all* that happens. The
 * copy never says "analyzed", because nothing reads the file. Only the
 * name and type are kept in memory; the bytes are never uploaded,
 * stored, or sent anywhere.
 */
export default function DocumentUpload({ documents, onChange }: Props) {
  const headingId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function add(files: FileList | null) {
    if (!files || files.length === 0) return;
    const accepted: StoryDocument[] = [];
    let rejected = 0;

    for (const file of Array.from(files)) {
      const ok =
        /^(application\/pdf|image\/jpeg|image\/png)$/.test(file.type) &&
        /\.(pdf|jpe?g|png)$/i.test(file.name);
      if (!ok || file.size > MAX_BYTES) {
        rejected += 1;
        continue;
      }
      accepted.push({
        id: makeId("doc"),
        name: file.name,
        size: file.size,
        type: file.type,
        addedAt: new Date().toISOString(),
        state: "added",
      });
    }

    if (accepted.length > 0) onChange([...documents, ...accepted]);
    setMessage(
      rejected > 0
        ? `${rejected} file${rejected > 1 ? "s were" : " was"} skipped. Use a PDF, JPG or PNG under 10 MB.`
        : null,
    );
  }

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <div className={styles.panelBody}>
        <h2 className={styles.panelTitle} id={headingId}>
          {DOCUMENT.heading}
        </h2>
        <p className={styles.panelNote}>{DOCUMENT.supporting}</p>

        <div
          className={styles.drop}
          data-over={dragging || undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            add(e.dataTransfer.files);
          }}
        >
          <span className={styles.dropIcon}>
            <UploadIcon size={22} />
          </span>

          <div className={styles.dropBody}>
            <label htmlFor={inputId} className={styles.label}>
              {DOCUMENT.button}
            </label>
            <p className={styles.fieldHelp} style={{ marginTop: 5 }}>
              {DOCUMENT.dropHint} &middot; {DOCUMENT.formats}
            </p>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              onChange={(e) => {
                add(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <div className={styles.dropActions}>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => inputRef.current?.click()}
            >
              <UploadIcon size={16} />
              {DOCUMENT.button}
            </button>
          </div>
        </div>

        <p role="status" aria-live="polite" className={styles.fieldHelp}>
          {message ?? ""}
        </p>

        {documents.length > 0 ? (
          <ul className={styles.docList}>
            {documents.map((doc) => (
              <li key={doc.id} className={styles.docRow}>
                <span className={styles.docIcon}>
                  <DocumentIcon size={20} />
                </span>
                <span className={styles.docBody}>
                  <span className={styles.docName}>{doc.name}</span>
                  <span className={styles.docMeta}>
                    {formatSize(doc.size)} &middot; {DOCUMENT.addedLabel}
                  </span>
                </span>
                <button
                  type="button"
                  className={styles.iconBtn}
                  data-danger="true"
                  onClick={() => onChange(documents.filter((d) => d.id !== doc.id))}
                  aria-label={`Remove ${doc.name}`}
                >
                  <TrashIcon size={15} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <p className={styles.honestNote}>
          <InfoIcon size={16} className={styles.honestNoteIcon} />
          <span>{DOCUMENT.notice}</span>
        </p>
      </div>
    </section>
  );
}