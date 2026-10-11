"use client";

import { useId } from "react";
import {
  CHANGE_OPTIONS,
  FREQUENCY_OPTIONS,
  START_OPTIONS,
} from "@/lib/health/options";
import type { StoryDetails } from "@/lib/health/types";
import { ChevronDownIcon, PlusIcon } from "../icons";
import styles from "./workspace.module.css";

/* ---------- Radio group ----------
   Native radios inside a styled span: keyboard behaviour, roving focus
   and announcement all come from the platform, so nothing has to be
   reimplemented and screen readers get the group semantics for free. */
function OptionGroup({
  legend,
  options,
  value,
  onChange,
  name,
  optional,
}: {
  legend: string;
  options: readonly string[];
  value: string | null;
  onChange: (value: string | null) => void;
  name: string;
  optional?: boolean;
}) {
  return (
    <fieldset className={styles.formField} style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className={styles.fieldLabel}>
        {legend}
        {optional ? <span className={styles.fieldOptional}>Optional</span> : null}
      </legend>
      <div className={styles.optGrid}>
        {options.map((option) => {
          const id = `${name}-${option.replace(/\s+/g, "-").toLowerCase()}`;
          return (
            <span className={styles.opt} key={option}>
              <input
                type="radio"
                id={id}
                name={name}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
              />
              <span>{option}</span>
            </span>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ---------- DateSelector ---------- */
function DateSelector({
  value,
  customDate,
  onChange,
  onCustomDateChange,
}: {
  value: string | null;
  customDate: string;
  onChange: (value: string | null) => void;
  onCustomDateChange: (value: string) => void;
}) {
  const dateId = useId();

  return (
    <fieldset className={styles.formField} style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className={styles.fieldLabel}>
        When did this start?
        <span className={styles.fieldOptional}>Optional</span>
      </legend>

      <div className={styles.optGrid}>
        {START_OPTIONS.map((option) => {
          const id = `start-${option.replace(/\s+/g, "-").toLowerCase()}`;
          return (
            <span className={styles.opt} key={option}>
              <input
                type="radio"
                id={id}
                name="detail-start"
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
              />
              <span>{option}</span>
            </span>
          );
        })}
      </div>

      {value === "Specific date" ? (
        <div className={styles.dateRow}>
          <label htmlFor={dateId} className={styles.label}>
            Pick a date
          </label>
          <input
            id={dateId}
            type="date"
            className={styles.dateInput}
            value={customDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => onCustomDateChange(e.target.value)}
          />
          <span className={styles.fieldHelp} style={{ marginTop: 0 }}>
            This date is kept exactly as you enter it — it is never rounded to a
            “likely” value.
          </span>
        </div>
      ) : (
        <p className={styles.fieldHelp}>
          Rough answers are fine. &ldquo;A few months ago&rdquo; is stored as an
          approximate date, not a specific day.
        </p>
      )}
    </fieldset>
  );
}

type Props = {
  details: StoryDetails;
  onChange: (patch: Partial<StoryDetails>) => void;
  /** Controlled by the parent so "Add detail" in the result can open it. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * StoryDetails — the optional structured panel.
 *
 * Every question is skippable on purpose: asking a user to describe when
 * something started before they trust the tool is exactly the friction
 * this product exists to remove. Leaving a field blank is never treated
 * as an error, and blank fields are never filled in later.
 */
export default function StoryDetailsPanel({
  details,
  onChange,
  open,
  onOpenChange,
}: Props) {
  const panelId = useId();
  const notesId = useId();

  const answered = [
    details.start,
    details.frequency,
    details.change,
    details.notes.trim() || null,
  ].filter(Boolean).length;

  return (
    <section className={styles.panel}>
      <button
        type="button"
        className={styles.disclosureHead}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
      >
        <span className={styles.disclosureHeadMain}>
          <span className={styles.disclosureTitle}>
            Add more details
            {answered > 0 ? (
              <span className="pill" style={{ marginLeft: 10, verticalAlign: "middle" }}>
                {answered} added
              </span>
            ) : null}
          </span>
          <span className={styles.disclosureSub}>
            Optional. These details can help organize your timeline.
          </span>
        </span>
        <span className={styles.disclosureChev}>
          <ChevronDownIcon size={18} />
        </span>
      </button>

      <div id={panelId} className={styles.disclosureBody} hidden={!open}>
        <DateSelector
          value={details.start}
          customDate={details.customDate}
          onChange={(start) => onChange({ start })}
          onCustomDateChange={(customDate) => onChange({ customDate })}
        />

        <OptionGroup
          legend="How often does it happen?"
          optional
          name="detail-frequency"
          options={FREQUENCY_OPTIONS}
          value={details.frequency}
          onChange={(frequency) => onChange({ frequency })}
        />
        <p className={styles.fieldHelp} style={{ marginTop: -14 }}>
          No answer needed. &ldquo;Varies&rdquo; or &ldquo;Sometimes&rdquo; is a
          perfectly useful thing to record.
        </p>

        <OptionGroup
          legend="How has it changed?"
          optional
          name="detail-change"
          options={CHANGE_OPTIONS}
          value={details.change}
          onChange={(change) => onChange({ change })}
        />

        <div className={styles.formField}>
          <label htmlFor={notesId} className={styles.fieldLabel}>
            Anything else important?
            <span className={styles.fieldOptional}>Optional</span>
          </label>
          <textarea
            id={notesId}
            className={styles.notesInput}
            value={details.notes}
            placeholder="Anything you noticed alongside this — sleep, routine, stress, what you were doing."
            onChange={(e) => onChange({ notes: e.target.value })}
          />
          <p className={styles.fieldHelp}>
            This is added to your story exactly as written.
          </p>
        </div>

        <p className={styles.fieldHelp} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <PlusIcon size={15} />
          You can also add separate dated events below — use whichever way suits you.
        </p>
      </div>
    </section>
  );
}