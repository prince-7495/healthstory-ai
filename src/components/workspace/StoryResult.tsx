"use client";

import { RESULT } from "@/lib/health/options";
import type { NotableChange, OrganizedStory } from "@/lib/health/types";
import {
  ArrowDownIconSmall,
  ArrowRightIcon,
  InfoIcon,
  MinusTrendIcon,
  NewTagIcon,
  PencilIcon,
  PlusIcon,
  PlusTrendIcon,
  QuestionIcon,
  SparkIcon,
  TimelineIcon,
} from "../icons";
import SafetyNotice from "./SafetyNotice";
import styles from "./workspace.module.css";

/* ---------- change direction icons ----------
   Icon plus colour plus words, never colour alone. */
function ChangeIcon({ direction }: { direction: NotableChange["direction"] }) {
  if (direction === "up") return <PlusTrendIcon size={15} />;
  if (direction === "down") return <ArrowDownIconSmall size={15} />;
  if (direction === "new") return <NewTagIcon size={15} />;
  return <MinusTrendIcon size={15} />;
}

/* ---------- Structured information ---------- */
function StructuredInfo({ story }: { story: OrganizedStory }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelBody}>
        <h3 className={styles.blockTitle}>
          <SparkIcon size={18} className={styles.blockTitleIcon} />
          {RESULT.structuredHeading}
        </h3>

        <div className={styles.structGrid}>
          <div className={styles.structBlock}>
            <div className={styles.structBlockHead}>
              <span className={styles.structName}>Symptoms</span>
              <span className={styles.tagUser}>What you mentioned</span>
            </div>
            {story.symptoms.length > 0 ? (
              <div className={styles.symptomRow}>
                {story.symptoms.map((s) => (
                  <span key={s.id} className={styles.symptomChip}>
                    {s.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className={styles.structAbsent}>
                None recognised in what you wrote. That is fine &mdash; your story
                does not have to name anything to be useful.
              </p>
            )}
          </div>

          <div className={styles.structBlock}>
            <div className={styles.structBlockHead}>
              <span className={styles.structName}>Time</span>
            </div>
            <ul className={styles.structList}>
              <li>
                <span className={styles.factDot} aria-hidden="true" />
                <span>
                  First noticed:{" "}
                  {story.time.firstNoticed ? (
                    <strong>{story.time.firstNoticed}</strong>
                  ) : (
                    <em className={styles.structAbsent}>
                      you did not mention a start date
                    </em>
                  )}
                </span>
              </li>
              <li>
                <span className={styles.factDot} aria-hidden="true" />
                <span>
                  Recent change:{" "}
                  {story.time.recentChange ? (
                    <strong>{story.time.recentChange}</strong>
                  ) : (
                    <em className={styles.structAbsent}>
                      no dated change was recorded
                    </em>
                  )}
                </span>
              </li>
            </ul>
          </div>

          <div className={styles.structBlock}>
            <div className={styles.structBlockHead}>
              <span className={styles.structName}>Context</span>
            </div>
            {story.context.length > 0 ? (
              <ul className={styles.structList}>
                {story.context.map((item) => (
                  <li key={item}>
                    <span className={styles.factDot} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.structAbsent}>
                Nothing you described was linked to a specific situation.
              </p>
            )}
          </div>

          <div className={styles.structBlock}>
            <div className={styles.structBlockHead}>
              <span className={styles.structName}>Other information</span>
            </div>
            {story.other.length > 0 ? (
              <ul className={styles.structList}>
                {story.other.map((item) => (
                  <li key={item}>
                    <span className={styles.factDot} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.structAbsent}>No additional notes added.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

type Props = {
  story: OrganizedStory;
  isDemo: boolean;
  onEdit: () => void;
  onAddDetail: () => void;
  /** Handed down from HealthStoryApp — navigates to Stage 3 analysis. */
  onContinueToAnalysis: () => void;
};

/**
 * StoryResult — the payoff screen.
 *
 * Two ideas carry this screen:
 *   1. Provenance is always visible. Every timeline entry says whether the
 *      user wrote it or the extractor grouped it, so an interpretation can
 *      never be mistaken for a confirmed fact.
 *   2. Uncertainty is displayed, not resolved. Approximate dates say
 *      "approximate", and missing dates say "Date not provided".
 */
export default function StoryResult({ story, isDemo, onEdit, onAddDetail, onContinueToAnalysis }: Props) {

  return (
    <div className={styles.result}>
      <header className={styles.resultHead}>
        <h1 className={styles.resultTitle}>{RESULT.heading}</h1>
        <span className={styles.badge}>
          <SparkIcon size={15} className={styles.badgeIcon} />
          {RESULT.badge}
        </span>
        {isDemo ? (
          <span className={`${styles.badge} ${styles.badgeGhost}`}>Fictional demo data</span>
        ) : null}
      </header>

      {/* What actually ran. Not a footnote — part of the interface. */}
      <p className={styles.analyzerNote}>
        <InfoIcon size={17} className={styles.analyzerNoteIcon} />
        <span>
          <strong>{story.analyzer.label}.</strong> {story.analyzer.description}
        </span>
      </p>

      <div className={styles.resultGrid}>
        <div className={styles.resultCol}>
          <section className={styles.panel}>
            <div className={styles.panelBody}>
              <h3 className={styles.blockTitle}>
                <TimelineIcon size={18} className={styles.blockTitleIcon} />
                {RESULT.timelineHeading}
              </h3>

              {story.timeline.length === 0 ? (
                <p className={styles.structAbsent}>
                  Nothing to place on a timeline yet.
                </p>
              ) : (
                <ol className={styles.tl}>
                  {story.timeline.map((entry) => (
                    <li key={entry.id} className={styles.tlItem} data-prov={entry.provenance}>
                      <span className={styles.tlDot} aria-hidden="true" />
                      <p className={styles.tlPeriod}>
                        {entry.period}
                        <span
                          className={entry.provenance === "user" ? styles.tagUser : styles.tagAi}
                        >
                          {entry.provenance === "user"
                            ? RESULT.provenance.user
                            : RESULT.provenance.ai}
                        </span>
                      </p>
                      <p className={styles.tlHead}>{entry.headline}</p>
                      {entry.detail ? <p className={styles.tlDetail}>{entry.detail}</p> : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelBody}>
              <h3 className={styles.blockTitle}>
                <PlusTrendIcon size={18} className={styles.blockTitleIcon} />
                {RESULT.changesHeading}
              </h3>

              {story.notableChanges.length === 0 ? (
                <p className={styles.structAbsent}>
                  No clear change was reported in what you wrote. If something has
                  shifted, adding it usually makes a timeline much more useful.
                </p>
              ) : (
                <ul className={styles.changeList}>
                  {story.notableChanges.map((change) => (
                    <li key={change.id} className={styles.changeRow}>
                      <span className={styles.changeIcon} data-dir={change.direction}>
                        <ChangeIcon direction={change.direction} />
                      </span>
                      <span>
                        <span className={styles.changeText}>{change.text}</span>
                        <span className={styles.changeEvidence}>
                          &ldquo;{change.evidence}&rdquo;
                          <span className={styles.changeEvidenceSrc}>
                            {" "}
                            &mdash; {RESULT.provenance.user}
                          </span>
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <div className={styles.resultCol}>
          <StructuredInfo story={story} />

          <section className={styles.panel}>
            <div className={styles.panelBody}>
              <h3 className={styles.blockTitle}>
                <QuestionIcon size={18} className={styles.blockTitleIcon} />
                {RESULT.questionsHeading}
              </h3>
              <ul className={styles.questionList}>
                {story.questions.map((question) => (
                  <li key={question} className={styles.questionRow}>
                    <QuestionIcon size={15} className={styles.questionIcon} />
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.fieldHelp}>
                These are prompts to help you describe your own experience, not
                questions about what might be wrong.
              </p>
            </div>
          </section>

          {story.gaps.length > 0 ? (
            <section className={styles.panel}>
              <div className={styles.panelBody}>
                <h3 className={styles.blockTitle}>
                  <PlusIcon size={18} className={styles.blockTitleIcon} />
                  {RESULT.gapsHeading}
                </h3>
                <ul className={styles.gapList}>
                  {story.gaps.map((gap) => (
                    <li key={gap.id} className={styles.gapRow}>
                      <p className={styles.gapPrompt}>
                        <PlusIcon size={16} className={styles.gapIcon} />
                        <span>{gap.prompt}</span>
                      </p>
                      {gap.suggest ? <p className={styles.gapSuggest}>{gap.suggest}</p> : null}
                      <button type="button" className={styles.gapBtn} onClick={onAddDetail}>
                        <PlusIcon size={14} />
                        Add detail
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <SafetyNotice />

      <div className={styles.resultActions}>
        <button
          type="button"
          className="btn btn--primary"
          onClick={onContinueToAnalysis}
        >
          {RESULT.continueCta}
          <ArrowRightIcon size={18} className="btn__arrow" />
        </button>
        <button type="button" className="btn btn--ghost" onClick={onEdit}>
          <PencilIcon size={16} />
          {RESULT.editCta}
        </button>
      </div>
    </div>
  );
}