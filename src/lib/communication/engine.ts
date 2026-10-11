/* =============================================================
   HealthStory AI — Stage 6 Communication Engine
   Generates structured communication drafts from confirmed HealthStory data.
   ============================================================= */

import { makeId } from "@/lib/health/types";
import type {
  CommunicationDraft,
  CommunicationLine,
  ConversationSelection,
  CommunicationValidation,
  ConversationContext,
} from "./types";
import type { StoryJournal, StoryQuestion } from "@/lib/journal/types";
import type { AnalyzedEvent } from "@/lib/health/types";
import { validateMedicalClaims, validateUncertaintyPreservation } from "@/lib/ai/safety/medicalClaims";

/* ------------------------------------------------------------------ *
 * Context Building
 * ------------------------------------------------------------------ */

/** Builds the context object passed to the generator from a journal and selection. */
export function buildConversationContext(
  journal: StoryJournal,
  selection: ConversationSelection
): ConversationContext {
  const confirmedEvents = journal.events.filter(
    (e) => e.status === "CONFIRMED"
  );

  const relevantEvents = filterEventsBySelection(confirmedEvents, selection, journal);
  const relevantTopics = journal.topics.filter(t => selection.topicIds.length === 0 || selection.topicIds.includes(t.id));
  const relevantQuestions = (journal.questions ?? []).filter(q => selection.questionIds.length === 0 || selection.questionIds.includes(q.id));
  const relevantChanges = (journal.evolutions ?? []).filter(
    c => c.status === "CONFIRMED" && relevantEvents.some(e => e.id === c.currentEventId || e.id === c.previousEventId)
  );

  const unconfirmedEvents = journal.events.filter(e => e.status === "AI_ORGANIZED" && e.needsConfirmation);
  const conflicts = (journal.evolutions ?? []).filter(c => c.status === "AI_ORGANIZED" && c.changeType === "contradiction");

  return {
    events: relevantEvents,
    topics: relevantTopics,
    questions: relevantQuestions,
    evolutions: relevantChanges,
    eventIds: relevantEvents.map(e => e.id),
    topicIds: relevantTopics.map(t => t.id),
    periodLabel: getPeriodLabel(selection),
    conflicts,
    unconfirmedCount: unconfirmedEvents.length,
  };
}

/** Filters events based on the user's sharing selection. */
function filterEventsBySelection(events: AnalyzedEvent[], selection: ConversationSelection, journal: StoryJournal) {
  if (!selection.topicIds.length) return events;
  
  // Since we don't have direct access to EventTopic relations in the journal type,
  // we'll filter by checking if the event's label matches any of the selected topic names
  const selectedTopicNames = new Set(
    journal.topics
      .filter(t => selection.topicIds.includes(t.id))
      .map(t => t.label.toLowerCase())
  );
  
  return events.filter(e => {
    const eventLabel = (e.label || e.title || "").toLowerCase();
    return Array.from(selectedTopicNames).some(topicName => 
      eventLabel.includes(topicName) || topicName.includes(eventLabel)
    );
  });
}

/* ------------------------------------------------------------------ *
 * Draft Generation
 * ------------------------------------------------------------------ */

export function generateCommunicationDraft(params: {
  journal: StoryJournal;
  selection: ConversationSelection;
}): CommunicationDraft {
  const { journal, selection } = params;
  const ctx = buildConversationContext(journal, selection);
  return buildDraftFromContext(ctx, selection);
}

function buildDraftFromContext(ctx: ReturnType<typeof buildConversationContext>, selection: ConversationSelection): CommunicationDraft {
  const lines: CommunicationLine[] = [];

  // What I noticed
  for (const e of ctx.events) {
    lines.push({
      id: makeId("line"),
      text: formatEventLine(e),
      sourceEventIds: [e.id],
      aiOrganized: true,
      userEdited: false,
      localized: false,
    });
  }

  // Timeline
  const timeline = ctx.events
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .map(e => ({
      id: makeId("line"),
      text: formatEventLine(e),
      sourceEventIds: [e.id],
      aiOrganized: true,
      userEdited: false,
      localized: false,
    }));

  // Reported changes
  const reportedChanges = ctx.evolutions.map(c => ({
    id: makeId("line"),
    text: `${c.category}: ${c.previousValue} → ${c.currentValue}`,
    sourceEventIds: [c.previousEventId, c.currentEventId].filter(Boolean) as string[],
    aiOrganized: true,
    userEdited: false,
    localized: false,
  }));

  // Relevant context
  const relevantContext = ctx.events
    .filter(e => e.context || e.category === "context" || e.category === "lifestyle")
    .map(e => ({
      id: makeId("line"),
      text: e.context || e.description,
      sourceEventIds: [e.id],
      aiOrganized: true,
      userEdited: false,
      localized: false,
    }));

  // Recent update
  const recentUpdate = ctx.events
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const recentUpdateLine = recentUpdate ? {
    id: makeId("line"),
    text: recentUpdate.description,
    sourceEventIds: [recentUpdate.id],
    aiOrganized: true,
    userEdited: false,
    localized: false,
  } : null;

  // One minute version
  const oneMinute = {
    id: makeId("line"),
    text: buildOneMinuteSummary(ctx),
    sourceEventIds: ctx.events.map(e => e.id),
    aiOrganized: true,
    userEdited: false,
    localized: false,
  };

  const missingInformation = [
    ...(ctx.events.some(e => !e.frequency) ? ["How often symptoms occur"] : []),
    ...(ctx.events.some(e => !e.severity) ? ["Severity of symptoms"] : []),
    ...(ctx.events.some(e => !e.date || e.datePrecision !== "exact") ? ["Exact dates for some events"] : []),
  ];

  return {
    id: makeId("draft"),
    version: 1,
    language: selection.language,
    languageLabel: getLanguageLabel(selection.language),
    style: selection.style,
    tone: selection.tone,
    person: selection.person,
    plainLanguage: selection.plainLanguage,
    periodLabel: getPeriodLabel(selection),
    whatINoticed: lines,
    timeline,
    reportedChanges,
    relevantContext,
    recentUpdate: recentUpdateLine,
    questions: ctx.questions,
    missingInformation,
    oneMinute,
    sourceEventIds: ctx.events.map(e => e.id),
    sourceTopicIds: ctx.topics.map(t => t.id),
    userEdited: false,
    createdAt: new Date().toISOString(),
  };
}

function formatEventLine(e: { description: string; frequency?: string | null; dateLabel?: string; dateText?: string }): string {
  const dateStr = e.dateLabel || e.dateText || "Date not provided";
  const freq = e.frequency ? ` (${e.frequency})` : "";
  return `- ${e.description}${freq} — ${dateStr}`;
}

function buildOneMinuteSummary(ctx: ReturnType<typeof buildConversationContext>): string {
  const parts = [];
  if (ctx.events.length) {
    parts.push(`I've been tracking ${ctx.events.length} health events.`);
  }
  if (ctx.evolutions && ctx.evolutions.length) {
    parts.push(`${ctx.evolutions.length} changes noted.`);
  }
  return parts.join(" ") || "No health information recorded yet.";
}

function getLanguageLabel(lang: string): string {
  const labels: Record<string, string> = { en: "English", hi: "Hindi", gu: "Gujarati" };
  return labels[lang] || lang;
}

function getPeriodLabel(selection: ConversationSelection): string {
  if (selection.range.id === "custom" && selection.range.from && selection.range.to) {
    return `${selection.range.from} – ${selection.range.to}`;
  }
  const labels: Record<string, string> = {
    all: "All recorded history",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "3m": "Last 3 months",
    "6m": "Last 6 months",
  };
  return labels[selection.range.id] || "All recorded history";
}

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

export function validateCommunication(draft: CommunicationDraft): CommunicationValidation {
  const issues: CommunicationValidation["issues"] = [];

  const checkText = (text: string, lineId: string) => {
    const medical = validateMedicalClaims(text);
    if (!medical.safe) {
      issues.push({ line: lineId, pattern: "medical_claim", message: medical.flaggedPhrases.join(", ") });
    }
    const uncertainty = validateUncertaintyPreservation(text);
    if (!uncertainty.safe) {
      issues.push({ line: lineId, pattern: "uncertainty", message: uncertainty.flaggedPhrases.join(", ") });
    }
  };

  for (const line of draft.whatINoticed) checkText(line.text, line.id);
  for (const line of draft.timeline) checkText(line.text, line.id);
  for (const line of draft.reportedChanges) checkText(line.text, line.id);
  for (const line of draft.relevantContext) checkText(line.text, line.id);
  if (draft.recentUpdate) checkText(draft.recentUpdate.text, draft.recentUpdate.id);
  if (draft.oneMinute) checkText(draft.oneMinute.text, draft.oneMinute.id);

  return { ok: issues.length === 0, issues };
}

/* ------------------------------------------------------------------ *
 * Question Management
 * ------------------------------------------------------------------ */

export function addJournalQuestion(journal: StoryJournal, text: string, source: "USER" | "AI_SUGGESTED" = "USER") {
  const question = {
    id: makeId("q"),
    text,
    source,
    status: "OPEN" as const,
    createdAt: new Date().toISOString(),
  };
  return { ...journal, questions: [...(journal.questions || []), question] };
}

export function removeJournalQuestion(journal: StoryJournal, questionId: string) {
  return { ...journal, questions: (journal.questions || []).filter((q: StoryQuestion) => q.id !== questionId) };
}

export function setJournalQuestionStatus(journal: StoryJournal, questionId: string, status: "OPEN" | "DISCUSSED" | "REMOVED") {
  return {
    ...journal,
    questions: (journal.questions || []).map((q: StoryQuestion) => q.id === questionId ? { ...q, status } : q),
  };
}

export function reorderJournalQuestions(journal: StoryJournal, questionIds: string[]) {
  const questionMap = new Map((journal.questions || []).map((q: StoryQuestion) => [q.id, q]));
  const reordered = questionIds
    .map((id) => questionMap.get(id))
    .filter((q): q is StoryQuestion => q !== undefined);
  const remaining = (journal.questions || []).filter((q: StoryQuestion) => !questionIds.includes(q.id));
  return { ...journal, questions: [...reordered, ...remaining] };
}

export function updateJournalQuestion(journal: StoryJournal, questionId: string, text: string) {
  return {
    ...journal,
    questions: (journal.questions || []).map((q: StoryQuestion) => q.id === questionId ? { ...q, text } : q),
  };
}

export function suggestQuestions(journal: StoryJournal): string[] {
  const suggestions: string[] = [];
  if (journal.events.some((e) => e.category === "symptom")) {
    suggestions.push("What should I discuss about the change in my symptoms?");
  }
  if (journal.events.some((e) => e.frequency)) {
    suggestions.push("Would it be useful to track how often this happens before my next appointment?");
  }
  return suggestions;
}

/* ------------------------------------------------------------------ *
 * Draft Utilities
 * ------------------------------------------------------------------ */

export function draftToPlainText(draft: CommunicationDraft): string {
  const parts = [];
  if (draft.whatINoticed?.length) parts.push("What I noticed:\n" + draft.whatINoticed.map((l) => l.text).join("\n"));
  if (draft.timeline?.length) parts.push("Timeline:\n" + draft.timeline.map((l) => l.text).join("\n"));
  if (draft.reportedChanges?.length) parts.push("Changes:\n" + draft.reportedChanges.map((l) => l.text).join("\n"));
  if (draft.relevantContext?.length) parts.push("Context:\n" + draft.relevantContext.map((l) => l.text).join("\n"));
  if (draft.recentUpdate) parts.push("Recent update:\n" + draft.recentUpdate.text);
  if (draft.questions?.length) parts.push("Questions:\n" + draft.questions.map((q) => `- ${q.text}`).join("\n"));
  if (draft.missingInformation?.length) parts.push("Information not recorded:\n" + draft.missingInformation.map((m) => `- ${m}`).join("\n"));
  if (draft.oneMinute) parts.push("One-minute story:\n" + draft.oneMinute.text);
  return parts.join("\n\n");
}

export function draftToPrintHtml(draft: CommunicationDraft): string {
  const sections: string[] = [];
  if (draft.whatINoticed?.length)
    sections.push(`<h2>What I Noticed</h2><ul>${draft.whatINoticed.map((l) => `<li>${l.text}</li>`).join("")}</ul>`);
  if (draft.timeline?.length)
    sections.push(`<h2>Timeline</h2><ul>${draft.timeline.map((l) => `<li>${l.text}</li>`).join("")}</ul>`);
  if (draft.reportedChanges?.length)
    sections.push(`<h2>Changes</h2><ul>${draft.reportedChanges.map((l) => `<li>${l.text}</li>`).join("")}</ul>`);
  if (draft.relevantContext?.length)
    sections.push(`<h2>Context</h2><ul>${draft.relevantContext.map((l) => `<li>${l.text}</li>`).join("")}</ul>`);
  if (draft.recentUpdate)
    sections.push(`<h2>Recent Update</h2><p>${draft.recentUpdate.text}</p>`);
  if (draft.questions?.length)
    sections.push(`<h2>Questions for My Doctor</h2><ul>${draft.questions.map((q) => `<li>${q.text}</li>`).join("")}</ul>`);
  if (draft.missingInformation?.length)
    sections.push(`<h2>Information Not Recorded</h2><ul>${draft.missingInformation.map((m) => `<li>${m}</li>`).join("")}</ul>`);
  if (draft.oneMinute)
    sections.push(`<h2>One-Minute Story</h2><p>${draft.oneMinute.text}</p>`);

  const meta = [
    `<span><strong>Version:</strong> ${draft.version}</span>`,
    `<span><strong>Language:</strong> ${draft.languageLabel ?? draft.language ?? ""}</span>`,
    `<span><strong>Style:</strong> ${draft.style ?? ""}</span>`,
    draft.periodLabel ? `<span><strong>Period:</strong> ${draft.periodLabel}</span>` : "",
  ].filter(Boolean).join(" &nbsp;|&nbsp; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>HealthStory � Communication Summary</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Georgia,"Times New Roman",serif;font-size:13pt;line-height:1.7;color:#111;background:#fff;padding:2cm 2.5cm;max-width:800px;margin:0 auto}
    h1{font-size:20pt;font-weight:bold;margin-bottom:6px}
    .meta{font-size:10pt;color:#555;margin-bottom:24px;border-bottom:1px solid #ddd;padding-bottom:12px}
    h2{font-size:13pt;font-weight:bold;margin-top:22px;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:4px}
    p{margin-bottom:10px}
    ul{padding-left:20px;margin-bottom:10px}
    li{margin-bottom:5px}
    .disclaimer{margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:9pt;color:#666;font-style:italic}
    @media print{body{padding:0}@page{margin:2cm 2.5cm}}
  </style>
</head>
<body>
  <h1>HealthStory Communication Summary</h1>
  <div class="meta">${meta}</div>
  ${sections.join("\n  ")}
  <div class="disclaimer">HealthStory AI helps you organize and communicate information you have recorded. It does not diagnose conditions, recommend treatments, or replace professional medical advice.</div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);};</script>
</body>
</html>`;
}