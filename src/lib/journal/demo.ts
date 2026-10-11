/* =============================================================
   HealthStory AI — Stage 5 fictional demonstration story

   A complete multi-month HealthStory built through the real Stage 5
   pipeline (extraction → topic matching → evolution detection). It is
   entirely fictional and is always labelled as such in the UI.

   The demo deliberately stops at June so the competition flow works:
   the user then adds the July update and watches the story evolve.

   Nothing here is a real person, a real appointment, or a real result.
   ============================================================= */

import {
  addGeneratedSummary,
  analyzeUpdateSync,
  applyUpdate,
  createEmptyJournal,
  createSnapshot,
  generateSummaryFromJournal,
  setEvolutionStatus,
} from "./engine";
import { buildDemoDocument } from "../understand/engine";
import { nodeIdFor } from "../insights/engine";
import type { StoryJournal, FollowUpEntry, HealthDocument } from "./types";

interface DemoEntry {
  date: string;
  text: string;
}

export const DEMO_ENTRIES: DemoEntry[] = [
  {
    date: "2026-03-05T09:10:00.000Z",
    text: "In March I started getting headaches occasionally, especially after long study sessions.",
  },
  {
    date: "2026-04-10T18:30:00.000Z",
    text: "By April the headaches were happening more often. I was also studying more than usual.",
  },
  {
    date: "2026-05-12T20:05:00.000Z",
    text: "In May I realised I was sleeping less than usual because of exams.",
  },
  {
    date: "2026-06-08T17:45:00.000Z",
    text: "In June I started taking more breaks and drinking more water during study sessions.",
  },
];

/** The update a judge is invited to add during the demo. */
export const DEMO_UPDATE_TEXT =
  "Since my last update, I've been sleeping more regularly and the headaches happen less often. I still notice them after long study sessions.";

/** The follow-up a judge is invited to add during the Stage 7 demo. */
export const DEMO_FOLLOWUP_TEXT =
  "After my appointment, I received a report and was asked to return in two weeks. I also wanted to clarify something about my recent headaches.";

/**
 * Builds the complete fictional journal through the real update pipeline,
 * so the evolutions, evidence and topic links are genuine engine output.
 */
export function createDemoJournal(): StoryJournal {
  let journal = createEmptyJournal(new Date(DEMO_ENTRIES[0].date));

  const run = (i: number) => {
    const now = new Date(DEMO_ENTRIES[i].date);
    journal = applyUpdate(journal, analyzeUpdateSync(journal, DEMO_ENTRIES[i].text, now), now);
    return now;
  };

  // March → June, with a snapshot after the first entry so snapshots compare.
  const march = run(0);
  journal = createSnapshot(journal, "March 2026 Snapshot", march);
  run(1);
  run(2);
  run(3);

  // Confirm the changes the user would already have reviewed.
  const aprilFrequency = journal.evolutions.find(
    (e) => e.category === "Frequency" && e.changeType === "more_frequent",
  );
  const juneDate = new Date("2026-06-30T10:00:00.000Z");
  if (aprilFrequency) journal = setEvolutionStatus(journal, aprilFrequency.id, "CONFIRMED", juneDate);

  // A summary saved at the end of June. It is up to date until July is added.
  const juneSummary = generateSummaryFromJournal(journal, "standard", juneDate);
  journal = addGeneratedSummary(
    journal,
    { ...juneSummary, generatedAt: juneDate.toISOString() },
    juneDate,
  );
  journal = createSnapshot(journal, "June 2026 Snapshot", new Date("2026-06-30T10:05:00.000Z"));

  const priorFollowUp: FollowUpEntry = {
    id: "followup_demo_1",
    createdAt: new Date("2026-06-18T09:30:00.000Z").toISOString(),
    eventDate: "2026-06-18",
    eventDatePrecision: "EXACT",
    type: "REPORT",
    originalText: "On 18 June I had a blood test and was told the results would be sent to my doctor.",
    language: "English",
    extractedItems: [
      {
        id: "fitem_demo_1",
        type: "EVENT",
        text: "Test or report mentioned",
        sourceText: "On 18 June I had a blood test",
        sourceType: "USER_REPORTED",
        confidence: "HIGH",
        status: "CONFIRMED",
      },
      {
        id: "fitem_demo_2",
        type: "INFORMATION",
        text: "I was told the results would be sent to my doctor.",
        sourceText: "I was told the results would be sent to my doctor.",
        sourceType: "PROFESSIONAL_CONVERSATION",
        confidence: "MEDIUM",
        status: "CONFIRMED",
      },
    ],
    relatedTopicIds: [],
    relatedEventIds: [],
    questionIds: [],
    status: "CONFIRMED",
  };

  // Stage 8 — a fictional document built by the real Stage 8 engine.
  const demoDocument: HealthDocument = {
    ...buildDemoDocument(),
    relatedFollowUpId: priorFollowUp.id,
  };

  // Stage 9 — explicit story links, so the map is genuine engine output
  // (topic → related follow-up → linked document) plus one link the user
  // created themselves.
  const headacheTopic = journal.topics.find((t) => t.label.toLowerCase().includes("headache"));
  const headacheEvent = journal.events.find((e) => `${e.label ?? ""} ${e.description}`.toLowerCase().includes("headache"));
  if (headacheTopic || headacheEvent) {
    priorFollowUp.relatedTopicIds = headacheTopic ? [headacheTopic.id] : [];
    priorFollowUp.relatedEventIds = headacheEvent ? [headacheEvent.id] : [];
  }

  const userLinks: StoryJournal["userLinks"] = headacheTopic
    ? [
        {
          id: "user_link_1",
          fromNodeId: nodeIdFor.topic(headacheTopic.id),
          toNodeId: nodeIdFor.document(demoDocument.id),
          reason: "This document relates to the headaches I have been recording.",
          createdAt: "2026-06-20T11:00:00.000Z",
        },
      ]
    : [];

  // Make one event have an approximate date so the "What information is unclear?" panel shows "One date remains approximate."
  const examEvent = journal.events.find(
    (e) => e.label?.toLowerCase().includes("exam") || e.description?.toLowerCase().includes("exam")
  );
  if (examEvent) {
    examEvent.datePrecision = "approximate";
  }

  return {
    ...journal,
    preferences: { ...journal.preferences, demoMode: true },
    followUps: [priorFollowUp],
    documents: [demoDocument],
    userLinks,
    questions: [
      {
        id: "q_demo_1",
        text: "What should I discuss about the change in frequency?",
        source: "USER",
        status: "OPEN",
        createdAt: juneDate.toISOString(),
      },
      {
        id: "q_demo_2",
        text: "Would it be useful to track how often this happens before my next appointment?",
        source: "AI_SUGGESTED",
        status: "OPEN",
        createdAt: juneDate.toISOString(),
      },
    ],
  };
}
