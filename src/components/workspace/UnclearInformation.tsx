"use client";

import { ANALYSIS } from "@/lib/health/options";
import type { Gap, UnclearItem } from "@/lib/health/types";
import { AlertIcon, CheckIcon, InfoIcon } from "../icons";
import styles from "./workspace.module.css";

/* ---------- Unclear / Conflicting ---------- */

function UnclearCard({
  item,
  onResolve,
}: {
  item: UnclearItem;
  onResolve: () => void;
}) {
  return (
    <li className={styles.unclearItem}>
      <p className={styles.unclearStatement}>{item.statement}</p>

      {item.evidence.length > 0 ? (
        <div className={styles.unclearEvidence} aria-label="Conflicting evidence">
          {item.evidence.map((ev) => (
            <p key={ev.id} className={styles.unclearQuote}>
              {ev.text}
            </p>
          ))}
        </div>
      ) : null}

      {item.resolved ? (
        <p className={styles.unclearResolved}>
          <CheckIcon size={14} />
          Marked as resolved
        </p>
      ) : (
        <button
          type="button"
          className={styles.unclearResolveBtn}
          onClick={onResolve}
        >
          <CheckIcon size={13} />
          Mark as resolved
        </button>
      )}
    </li>
  );
}

/* ---------- Missing information ---------- */

function MissingItem({ gap }: { gap: Gap }) {
  return (
    <li className={styles.missingItem}>
      <span className={styles.missingDot} aria-hidden="true" />
      <span>{gap.prompt}</span>
    </li>
  );
}

/* ---------- UnclearInformation ---------- */

type Props = {
  unclear: UnclearItem[];
  missing: Gap[];
  onResolve: (id: string) => void;
};

/**
 * UnclearInformation — surfaces ambiguities and gaps without inventing answers.
 *
 * "Information that needs clarification" is one of the strongest
 * competition features because it demonstrates that the AI knows the
 * boundary of what it can honestly claim.
 */
export default function UnclearInformation({ unclear, missing, onResolve }: Props) {
  const hasUnclear = unclear.length > 0;
  const hasMissing = missing.length > 0;

  if (!hasUnclear && !hasMissing) return null;

  return (
    <>
      {hasUnclear ? (
        <section className={styles.sectionPanel} aria-labelledby="unclear-heading">
          <div className={styles.sectionHead}>
            <AlertIcon size={18} style={{ color: "#b07a22" }} />
            <h2 className={styles.sectionTitle} id="unclear-heading">
              {ANALYSIS.unclearHeading}
            </h2>
            <span className={styles.sectionCount}>{unclear.length}</span>
          </div>
          <div className={styles.sectionBody}>
            <ul className={styles.unclearList} aria-label="Information that may need clarification">
              {unclear.map((item) => (
                <UnclearCard
                  key={item.id}
                  item={item}
                  onResolve={() => onResolve(item.id)}
                />
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {hasMissing ? (
        <section className={styles.sectionPanel} aria-labelledby="missing-heading">
          <div className={styles.sectionHead}>
            <InfoIcon size={18} className={styles.blockTitleIcon} />
            <h2 className={styles.sectionTitle} id="missing-heading">
              {ANALYSIS.missingHeading}
            </h2>
          </div>
          <div className={styles.sectionBody}>
            <p
              style={{
                fontSize: "13.5px",
                lineHeight: 1.6,
                color: "var(--ink-500)",
                marginBottom: 12,
              }}
            >
              These details were not included in what you wrote. They are shown
              here so you know they are absent — not because anything is wrong.
            </p>
            <ul className={styles.missingList} aria-label="Information not provided">
              {missing.map((gap) => (
                <MissingItem key={gap.id} gap={gap} />
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
