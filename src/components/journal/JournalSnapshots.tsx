"use client";

import { useState } from "react";
import { JOURNAL } from "@/lib/journal/options";
import { compareSnapshots } from "@/lib/journal/engine";
import type { StoryJournal } from "@/lib/journal/types";
import { PlusIcon, TrashIcon } from "../icons";
import styles from "./journal.module.css";

type Props = {
  journal: StoryJournal;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * JournalSnapshots — point-in-time versions of the story.
 *
 * Snapshots store the event ids present at the time, so a comparison is
 * a diff of what the user had actually recorded — no interpolation.
 */
export default function JournalSnapshots({ journal, onCreate, onDelete }: Props) {
  const [name, setName] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const comparison = a && b && a !== b ? compareSnapshots(journal, a, b) : null;

  return (
    <section className={styles.panel} aria-labelledby="snapshots-heading">
      <div className={styles.panelHead}>
        <PlusIcon size={17} />
        <h2 className={styles.panelTitle} id="snapshots-heading">
          {JOURNAL.snapshotsHeading}
        </h2>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.filterRow}>
          <label htmlFor="snapshot-name" className="sr-only">
            {JOURNAL.createSnapshotCta}
          </label>
          <input
            id="snapshot-name"
            className={styles.input}
            style={{ flex: 1, minWidth: 180 }}
            placeholder={JOURNAL.snapshotNamePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCreate(name);
                setName("");
              }
            }}
          />
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
            onClick={() => {
              onCreate(name);
              setName("");
            }}
          >
            <PlusIcon size={14} />
            {JOURNAL.createSnapshotCta}
          </button>
        </div>

        {journal.snapshots.length === 0 ? (
          <p className={styles.sub} style={{ marginTop: 14 }}>{JOURNAL.noSnapshots}</p>
        ) : (
          <div style={{ marginTop: 14 }}>
            {journal.snapshots.map((s) => (
              <div key={s.id} className={styles.snapCard}>
                <div className={styles.snapTop}>
                  <div>
                    <p className={styles.snapName}>{s.name}</p>
                    <p className={styles.snapDate}>{formatDate(s.createdAt)} · {s.includedEventIds.length} events</p>
                  </div>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => onDelete(s.id)}
                    aria-label={`${JOURNAL.deleteSnapshotCta} ${s.name}`}
                  >
                    <TrashIcon size={13} />
                    {JOURNAL.deleteSnapshotCta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {journal.snapshots.length >= 2 ? (
          <div className={styles.snapCompare}>
            <p className={styles.drawerKey}>{JOURNAL.compareSnapshotsHeading}</p>
            <div className={styles.filterRow}>
              <label htmlFor="snap-a" className="sr-only">{JOURNAL.previousLabel}</label>
              <select id="snap-a" className={styles.select} value={a} onChange={(e) => setA(e.target.value)}>
                <option value="">Earlier snapshot…</option>
                {journal.snapshots.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <label htmlFor="snap-b" className="sr-only">{JOURNAL.nowLabel}</label>
              <select id="snap-b" className={styles.select} value={b} onChange={(e) => setB(e.target.value)}>
                <option value="">Later snapshot…</option>
                {journal.snapshots.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {comparison ? (
              <div style={{ marginTop: 12 }}>
                <div className={styles.compareCols}>
                  <div>
                    <p className={styles.evidenceKey}>{comparison.a.name}</p>
                    <ul className={styles.compareCol}>
                      {comparison.a.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className={styles.evidenceKey}>{comparison.b.name}</p>
                    <ul className={styles.compareCol}>
                      {comparison.b.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className={styles.drawerKey} style={{ marginTop: 14 }}>{JOURNAL.changesBetweenSnapshots}</p>
                {comparison.changes.length === 0 ? (
                  <p className={styles.sub}>No differences were identified between these snapshots.</p>
                ) : (
                  comparison.changes.map((c, i) => (
                    <p key={`${c}-${i}`} className={styles.changeLine}>{c}</p>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
