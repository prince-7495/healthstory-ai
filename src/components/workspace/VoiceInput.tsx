"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { VOICE } from "@/lib/health/options";
import type { VoiceCapture } from "@/lib/health/types";
import { CheckIcon, InfoIcon, MicIcon, PauseIcon, StopIcon } from "../icons";
import styles from "./workspace.module.css";

/* ---------- Minimal SpeechRecognition typing ----------
   The DOM lib does not ship these types, so we describe only the
   slice we actually use. This keeps feature detection honest without
   widening the project's type surface. */
interface SpeechResultItem {
  readonly transcript: string;
  readonly isFinal: boolean;
}
interface SpeechResultList {
  readonly length: number;
  readonly [index: number]: SpeechResultItem;
}
interface SpeechResultEvent {
  readonly resultIndex: number;
  readonly results: SpeechResultList;
}
interface SpeechErrorEvent {
  readonly error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  pause?(): void;
  resume?(): void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Speech support is a browser capability, not React state, so it is read
 * through `useSyncExternalStore`. That also solves the hydration problem:
 * the server snapshot is `false`, the client snapshot is the real value,
 * and React reconciles them without us branching during render.
 */
const noopSubscribe = () => () => {};
const getServerSnapshot = () => false;
const getClientSnapshot = () => getRecognition() !== null;

/**
 * Inserted only when no speech engine exists. It is always labelled as a
 * sample, so nobody can mistake it for words the system "heard".
 */
const DEMO_SAMPLE =
  "Over the last few months I've noticed that I get headaches more often after long study sessions. I've also been sleeping less than usual.";

const BAR_COUNT = 22;

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

type Props = {
  capture: VoiceCapture | null;
  onCapture: (capture: VoiceCapture | null) => void;
  onInsert: (text: string) => void;
};

/**
 * VoiceInput — a polished microphone interaction with two honest modes:
 *
 *   1. The browser exposes SpeechRecognition → real transcription,
 *      captured locally by the browser engine.
 *   2. It does not → a clearly labelled demo timer and waveform. No
 *      microphone is opened, no audio is stored, and the text offered
 *      on "Use recording" is labelled sample text.
 *
 * The waveform is decorative in both modes: it indicates that capture is
 * in progress, it never claims to be an analysis of your voice.
 */
export default function VoiceInput({ capture, onCapture, onInsert }: Props) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(0);
  // Kept in a ref so the recognition instance survives re-renders without
  // becoming a dependency of the callbacks.
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => stopTimer, [stopTimer]);

  const beginTimer = useCallback(() => {
    stopTimer();
    startedRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startedRef.current);
    }, 180);
  }, [stopTimer]);

  const start = useCallback(() => {
    setNotice(null);
    const Ctor = getRecognition();

    if (Ctor) {
      try {
        const rec = new Ctor();
        rec.lang = "en-US";
        rec.continuous = true;
        rec.interimResults = false;

        let finalText = "";
        rec.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i];
            if (result.isFinal) finalText += `${result.transcript} `;
          }
        };
        rec.onerror = (event) => {
          if (event.error !== "aborted" && event.error !== "no-speech") {
            setNotice(
              "Your browser stopped speech recognition. Type your story instead — nothing you wrote is affected.",
            );
          }
        };
        rec.onend = () => {
          const transcript = finalText.trim();
          if (!transcript) return;
          onCapture({
            state: "captured",
            transcript,
            durationMs: Date.now() - startedRef.current,
            isDemo: false,
          });
        };

        rec.start();
        recognitionRef.current = rec;
        beginTimer();
        onCapture({ state: "recording", transcript: "", durationMs: 0, isDemo: false });
        return;
      } catch {
        setNotice(
          "This browser blocked microphone access. Use the text field instead — your story is unaffected.",
        );
      }
    }

    // Demo mode: timer and waveform only. No microphone is opened.
    beginTimer();
    onCapture({ state: "recording", transcript: "", durationMs: 0, isDemo: true });
  }, [beginTimer, onCapture]);

  const pause = useCallback(() => {
    stopTimer();
    try {
      recognitionRef.current?.pause?.();
    } catch {
      /* pause is optional on some engines */
    }
    onCapture(capture ? { ...capture, state: "paused" } : capture);
  }, [capture, onCapture, stopTimer]);

  const resume = useCallback(() => {
    beginTimer();
    try {
      recognitionRef.current?.resume?.();
    } catch {
      /* resume is optional on some engines */
    }
    onCapture(capture ? { ...capture, state: "recording" } : capture);
  }, [beginTimer, capture, onCapture]);

  const stop = useCallback(() => {
    stopTimer();
    const durationMs = Date.now() - startedRef.current;

    if (recognitionRef.current) {
      // `onend` fires after `stop()` and publishes the transcript, so the
      // capture state is left alone here.
      try {
        recognitionRef.current.stop();
      } catch {
        /* already stopped */
      }
      return;
    }

    onCapture({ state: "captured", transcript: DEMO_SAMPLE, durationMs, isDemo: true });
  }, [onCapture, stopTimer]);

  const reset = useCallback(() => {
    stopTimer();
    try {
      recognitionRef.current?.abort();
    } catch {
      /* nothing to abort */
    }
    recognitionRef.current = null;
    setNotice(null);
    onCapture(null);
  }, [onCapture, stopTimer]);

  const isRecording = capture?.state === "recording";
  const isPaused = capture?.state === "paused";
  const isLive = isRecording || isPaused;

  // Decorative travelling wave: each bar has its own phase so it reads as
  // motion rather than a single pulsing block.
  const phase = elapsed / 380;

  return (
    <div>
      <div className={styles.voiceRow}>
        {!isLive ? (
          <button type="button" className={styles.micBtn} onClick={start}>
            <span className={styles.micPulse}>
              <MicIcon size={19} />
            </span>
            {VOICE.idle}
          </button>
        ) : (
          <>
            <span className={styles.micBtn} data-recording={isRecording || undefined}>
              <span className={styles.micPulse}>
                <MicIcon size={19} />
              </span>
              {isPaused ? VOICE.paused : VOICE.recording}
            </span>

            <div className={styles.wave} aria-hidden="true">
              {Array.from({ length: BAR_COUNT }, (_, i) => {
                const h = isRecording
                  ? 5 +
                    Math.abs(Math.sin(i * 0.62 + phase)) *
                      Math.abs(Math.cos(i * 0.29 + phase * 0.55)) *
                      24
                  : 5;
                return (
                  <span
                    key={i}
                    className={styles.waveBar}
                    style={{ height: `${h.toFixed(1)}px` }}
                  />
                );
              })}
            </div>

            <div className={styles.voiceMeta}>
              <span className={styles.voiceTimer}>{formatClock(elapsed)}</span>
              <button type="button" className={styles.voiceBtn} onClick={isPaused ? resume : pause}>
                <PauseIcon size={15} />
                {isPaused ? "Resume" : VOICE.pause}
              </button>
              <button type="button" className={styles.voiceBtn} onClick={stop}>
                <StopIcon size={14} />
                {VOICE.stop}
              </button>
            </div>
          </>
        )}
      </div>

      {capture?.state === "captured" ? (
        <div className={styles.voiceDone}>
          <CheckIcon size={18} />
          <span className={styles.voiceDoneText}>
            {capture.isDemo
              ? "Demo capture complete — no microphone was used, so there is nothing to transcribe."
              : "Voice captured. Use it in your story, or try again."}
          </span>
          <button
            type="button"
            className={styles.voiceBtn}
            data-variant="primary"
            onClick={() => onInsert(capture.transcript)}
          >
            {VOICE.useRecording}
          </button>
          <button type="button" className={styles.voiceBtn} onClick={reset}>
            {VOICE.tryAgain}
          </button>
        </div>
      ) : null}

      {!supported || capture?.isDemo ? (
        <p className={styles.voiceNote}>
          <InfoIcon size={16} className={styles.voiceNoteIcon} />
          <span>{VOICE.demoNotice}</span>
        </p>
      ) : null}

      {notice ? (
        <p className={styles.voiceNote}>
          <InfoIcon size={16} className={styles.voiceNoteIcon} />
          <span>{notice}</span>
        </p>
      ) : null}
    </div>
  );
}