/* =============================================================
   HealthStory AI — Stage 5 local-first storage

   Stage 5 is longitudinal, so the story has to survive a reload.
   This prototype stores the journal in the browser's localStorage on
   the user's own device. That is stated plainly in the UI, and it is
   true: nothing is sent anywhere.

   If storage is unavailable (private mode, SSR), every function
   degrades to a no-op and the app still works for the session.
   ============================================================= */

import { makeId, type AnalyzedEvent } from "../health/types";
import { applyUpdate, analyzeUpdateSync, createEmptyJournal } from "./engine";
import type { StoryJournal, StoryJournalEntry, StoryTopic } from "./types";

const JOURNAL_KEY = "healthstory.journal.v1";
const HANDOFF_KEY = "healthstory.handoff.v1";

export interface StoryHandoff {
  storyText: string;
  events: AnalyzedEvent[];
  isDemo: boolean;
  savedAt: string;
}

export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = "__hs_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function loadJournal(): StoryJournal | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(JOURNAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoryJournal;
    if (!parsed || !Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveJournal(journal: StoryJournal): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  } catch {
    /* quota or disabled — the in-memory journal still works */
  }
}

export function clearJournal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(JOURNAL_KEY);
  } catch {
    /* ignore */
  }
}

/* ---------- handoff from the Stage 2–4 workspace ---------- */

export function saveHandoff(payload: Omit<StoryHandoff, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      HANDOFF_KEY,
      JSON.stringify({ ...payload, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* ignore */
  }
}

export function consumeHandoff(): StoryHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(HANDOFF_KEY);
    return JSON.parse(raw) as StoryHandoff;
  } catch {
    return null;
  }
}

/**
 * Turns a workspace story + reviewed events into a journal with one entry.
 * Used when the user chooses "Continue in My Story" from Stage 4.
 */
export function buildJournalFromHandoff(handoff: StoryHandoff): StoryJournal {
  const now = new Date();
  const base = createEmptyJournal(now);

  if (handoff.events.length === 0 && !handoff.storyText.trim()) return base;

  // Run the normal update pipeline so topics and initial information are
  // organized exactly as a fresh update would be.
  const analysis = analyzeUpdateSync(base, handoff.storyText, now);
  const withResolvedEvents: typeof analysis = {
    ...analysis,
    events: handoff.events.length > 0 ? handoff.events : analysis.events,
  };

  const journal = applyUpdate(base, withResolvedEvents, now);

  const topics: StoryTopic[] = journal.topics;
  const entry: StoryJournalEntry = {
    ...analysis.entry,
    extractedEventIds: withResolvedEvents.events.map((e) => e.id),
  };

  return {
    ...journal,
    id: makeId("journal"),
    entries: [entry],
    topics,
    preferences: { ...journal.preferences, demoMode: handoff.isDemo },
    activity: [
      {
        id: makeId("act"),
        at: now.toISOString(),
        type: "update_added",
        label: "Started your journal from your health story",
      },
    ],
  };
}
