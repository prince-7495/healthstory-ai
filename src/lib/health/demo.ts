/* =============================================================
   Fictional demo content for the hackathon demo path.

   Nothing here is real: no real person, no real medical record, no
   real appointment. The wording is deliberately plain ("headaches",
   "sleeping less") because that is how people actually describe
   things, and because the extractor must cope with this register.
   ============================================================= */

import type { HealthStory } from "./types";
import { createEmptyDetails } from "./types";

export const DEMO_STORY_TEXT =
  "Over the last few months I've noticed that I get headaches more often after long study sessions. They were occasional at first, but recently they've become more frequent. I've also been sleeping less than usual.";

/**
 * Structured answers as well as prose, so the demo exercises the whole
 * flow: field-by-field input and free text end up in one story.
 */
export function createDemoStory(): HealthStory {
  return {
    storyText: DEMO_STORY_TEXT,
    language: "English",
    events: [],
    documents: [],
    voiceInput: null,
    details: {
      ...createEmptyDetails(),
      start: "A few months ago",
      frequency: "Several times a week",
      change: "Getting worse",
      notes:
        "Longest stretches come after evening study sessions. They usually ease by morning.",
    },
    organizedStory: null,
  };
}