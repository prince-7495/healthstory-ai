"use client";

import { useId } from "react";
import {
  DEMO,
  INPUT,
  LANGUAGES,
  QUICK_PROMPTS,
  type QuickPrompt,
} from "@/lib/health/options";
import type { VoiceCapture } from "@/lib/health/types";
import {
  ChevronDownIcon,
  GlobeIcon,
  InfoIcon,
  SparkIcon,
} from "../icons";
import VoiceInput from "./VoiceInput";
import styles from "./workspace.module.css";

/* ---------- LanguageSelector ----------
   Visually complete for the languages a future model could support, but
   anything unimplemented is disabled and labelled, so the UI never
   implies live translation. */
function LanguageSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const labelId = useId();

  return (
    <div className={styles.langRow}>
      <label className={styles.label} id={labelId} htmlFor="story-language">
        <GlobeIcon
          size={16}
          style={{ display: "inline", verticalAlign: "-3px", marginRight: 7 }}
        />
        Story language
      </label>

      <span className={styles.selectWrap}>
        <select
          id="story-language"
          className={styles.select}
          value={value}
          aria-describedby={`${labelId}-help`}
          onChange={(e) => onChange(e.target.value)}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id} disabled={!lang.supported}>
              {lang.id}
              {lang.supported ? "" : " — coming soon"}
            </option>
          ))}
        </select>
        <span className={styles.selectChev} aria-hidden="true">
          <ChevronDownIcon size={16} />
        </span>
      </span>

      <p id={`${labelId}-help`} className={styles.fieldHelp} style={{ flex: "1 1 220px", marginTop: 0 }}>
        English only in this build. Other languages are listed so the option set is
        visible, not because translation is available.
      </p>
    </div>
  );
}

/* ---------- QuickPrompts ---------- */
function QuickPrompts({
  activeId,
  onSelect,
}: {
  activeId: string | null;
  onSelect: (prompt: QuickPrompt) => void;
}) {
  const active = QUICK_PROMPTS.find((p) => p.id === activeId) ?? null;

  return (
    <div className={styles.quickWrap}>
      <p className={styles.quickLabel}>Need a starting point?</p>

      <div className={styles.chipRow}>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            className={styles.chip}
            data-active={activeId === prompt.id || undefined}
            aria-pressed={activeId === prompt.id}
            onClick={() => onSelect(prompt)}
          >
            {prompt.label}
          </button>
        ))}
      </div>

      {active ? (
        <p className={styles.chipPrompt} role="status">
          <InfoIcon size={17} className={styles.chipPromptIcon} />
          <span>
            Start with: <strong>&ldquo;{active.placeholder}&rdquo;</strong>
          </span>
        </p>
      ) : null}
    </div>
  );
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  activePromptId: string | null;
  onSelectPrompt: (prompt: QuickPrompt) => void;
  language: string;
  onLanguageChange: (value: string) => void;
  voiceCapture: VoiceCapture | null;
  onVoiceCapture: (capture: VoiceCapture | null) => void;
  onInsertVoice: (text: string) => void;
  onLoadDemo: () => void;
  /** Id of the validation message rendered beside the primary action. */
  errorId?: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
};

/**
 * StoryInput — the primary input experience.
 *
 * Sized and shaped to invite long-form natural writing, not a contact
 * form: a full-height textarea, a live character counter, and quick
 * start prompts that only change the placeholder so nothing is ever
 * written into the user's words on their behalf.
 */
export default function StoryInput({
  value,
  onChange,
  activePromptId,
  onSelectPrompt,
  language,
  onLanguageChange,
  voiceCapture,
  onVoiceCapture,
  onInsertVoice,
  onLoadDemo,
  errorId,
  inputRef,
}: Props) {
  const headingId = useId();
  const helperId = useId();
  const counterId = useId();

  const active = QUICK_PROMPTS.find((p) => p.id === activePromptId) ?? null;
  const used = value.length;
  const remaining = INPUT.charLimit - used;
  const nearLimit = remaining <= 250;

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <div className={styles.panelBody}>
        <h2 className={styles.panelTitle} id={headingId}>
          {INPUT.heading}
        </h2>

        <label className="sr-only" htmlFor="health-story">
          {INPUT.heading}
        </label>
        <textarea
          id="health-story"
          ref={inputRef}
          className={styles.textarea}
          placeholder={active?.placeholder ?? INPUT.placeholder}
          value={value}
          maxLength={INPUT.charLimit}
          aria-describedby={`${helperId} ${counterId}`}
          aria-invalid={errorId ? true : undefined}
          aria-errormessage={errorId}
          onChange={(e) => onChange(e.target.value)}
        />

        <div className={styles.inputFoot}>
          <span id={helperId}>{INPUT.helper}</span>
          <span id={counterId} className={styles.counter} data-near={nearLimit || undefined}>
            {used} / {INPUT.charLimit}
          </span>
        </div>

        <QuickPrompts activeId={activePromptId} onSelect={onSelectPrompt} />

        <div style={{ marginTop: 20, paddingTop: 4 }}>
          <VoiceInput
            capture={voiceCapture}
            onCapture={onVoiceCapture}
            onInsert={onInsertVoice}
          />
        </div>

        <LanguageSelector value={language} onChange={onLanguageChange} />

        <div className={styles.chipRow} style={{ marginTop: 22 }}>
          <button type="button" className={styles.chip} onClick={onLoadDemo}>
            <SparkIcon size={16} />
            {DEMO.button}
          </button>
          <span className="demo-tag">{DEMO.label}</span>
        </div>
        <p className={styles.fieldHelp}>{DEMO.notice}</p>
      </div>
    </section>
  );
}