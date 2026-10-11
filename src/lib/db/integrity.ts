/**
 * Stage 11 — story integrity checker.
 *
 * Cross-table consistency checks that the relational schema alone
 * cannot guarantee: referential integrity is enforced by foreign
 * keys, but *semantic* consistency (ownership, version chains,
 * confirmation state, files on disk) is not. Each check reports
 * `pass`, `warn` or `fail` with a human-readable detail — this is
 * the data behind the `Story Integrity` view and the
 * `GET /api/stories/:id/integrity` endpoint.
 *
 * Read-only: the checker never modifies data.
 */

import { prisma } from "./client";
import { readDocumentBytes, sha256 } from "@/lib/security/files";

export type IntegrityStatus = "pass" | "warn" | "fail";

export interface IntegrityCheck {
  id: string;
  label: string;
  status: IntegrityStatus;
  detail: string;
}

export interface IntegrityReport {
  storyId: string;
  generatedAt: string;
  status: IntegrityStatus;
  checks: IntegrityCheck[];
}

/** Catalog of check ids + labels (used by the security status endpoint). */
export const INTEGRITY_CHECKS: Array<{ id: string; label: string }> = [
  { id: "version-chain", label: "Story version chain is complete and sequential" },
  { id: "document-ownership", label: "Documents belong to the story owner" },
  { id: "document-storage", label: "Stored files exist and match their checksums" },
  { id: "question-ownership", label: "Questions belong to the story owner" },
  { id: "followup-ownership", label: "Follow-ups belong to the story owner" },
  { id: "confirmation-consistency", label: "Event confirmation state is internally consistent" },
  { id: "provenance-consistency", label: "Event provenance matches event status" },
  { id: "communication-selections", label: "Communication selections reference existing rows" },
];

const worst = (checks: IntegrityCheck[]): IntegrityStatus => {
  if (checks.some((c) => c.status === "fail")) return "fail";
  if (checks.some((c) => c.status === "warn")) return "warn";
  return "pass";
};

const MAX_LISTED = 5;
const listIds = (ids: string[]): string =>
  ids.length <= MAX_LISTED
    ? ids.join(", ")
    : `${ids.slice(0, MAX_LISTED).join(", ")} … (+${ids.length - MAX_LISTED} more)`;

/**
 * Run every integrity check for one story.
 * Returns `null` when the story does not exist (or was deleted).
 */
export async function checkStoryIntegrity(storyId: string): Promise<IntegrityReport | null> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, userId: true, currentVersion: true, status: true },
  });
  if (!story) return null;

  const checks: IntegrityCheck[] = [];

  // ---- 1. Version chain -------------------------------------------------
  // Every version 1..currentVersion must exist exactly once. The
  // numbers are written in the same transaction as the bump, so a gap
  // or duplicate means a write was applied outside that path.
  const versionRows = await prisma.storyVersion.findMany({
    where: { storyId },
    select: { versionNumber: true },
    orderBy: { versionNumber: "asc" },
  });
  const numbers = versionRows.map((v) => v.versionNumber);
  const chainOk =
    numbers.length === story.currentVersion &&
    numbers.every((n, i) => n === i + 1);
  checks.push({
    id: "version-chain",
    label: INTEGRITY_CHECKS[0].label,
    status: chainOk ? "pass" : "fail",
    detail: chainOk
      ? `${numbers.length} version row(s), chain 1..${story.currentVersion} complete`
      : `Expected versions 1..${story.currentVersion} (${story.currentVersion} rows), found ${numbers.length}: ${listIds(numbers.map(String))}`,
  });

  // ---- 2. Document ownership -------------------------------------------
  const documents = await prisma.document.findMany({
    where: { storyId },
    select: { id: true, userId: true, status: true, storageKey: true, checksum: true },
  });
  const foreignDocs = documents.filter((d) => d.userId !== story.userId);
  checks.push({
    id: "document-ownership",
    label: INTEGRITY_CHECKS[1].label,
    status: foreignDocs.length === 0 ? "pass" : "fail",
    detail:
      foreignDocs.length === 0
        ? `${documents.length} document(s) owned by the story owner`
        : `${foreignDocs.length} document(s) owned by a different user: ${listIds(foreignDocs.map((d) => d.id))}`,
  });

  // ---- 3. Document storage ---------------------------------------------
  // Live documents must have their bytes on disk with a matching
  // sha256; deleted documents must not leave bytes behind.
  const missing: string[] = [];
  const mismatched: string[] = [];
  const lingering: string[] = [];
  for (const doc of documents) {
    const bytes = await readDocumentBytes(doc.storageKey);
    if (doc.status === "DELETED") {
      if (bytes) lingering.push(doc.id);
      continue;
    }
    if (!bytes) {
      missing.push(doc.id);
      continue;
    }
    if (sha256(bytes) !== doc.checksum) mismatched.push(doc.id);
  }
  const storageFail = missing.length + mismatched.length;
  checks.push({
    id: "document-storage",
    label: INTEGRITY_CHECKS[2].label,
    status: storageFail > 0 ? "fail" : lingering.length > 0 ? "warn" : "pass",
    detail:
      storageFail === 0 && lingering.length === 0
        ? `${documents.filter((d) => d.status !== "DELETED").length} stored file(s) verified by checksum`
        : [
            ...(missing.length ? [`missing file: ${listIds(missing)}`] : []),
            ...(mismatched.length ? [`checksum mismatch: ${listIds(mismatched)}`] : []),
            ...(lingering.length ? [`deleted document still has bytes on disk: ${listIds(lingering)}`] : []),
          ].join("; "),
  });

  // ---- 4. Question ownership -------------------------------------------
  const questions = await prisma.storyQuestion.findMany({
    where: { storyId },
    select: { id: true, userId: true },
  });
  const foreignQuestions = questions.filter((q) => q.userId !== null && q.userId !== story.userId);
  const unattributedQuestions = questions.filter((q) => q.userId === null);
  checks.push({
    id: "question-ownership",
    label: INTEGRITY_CHECKS[3].label,
    status: foreignQuestions.length > 0 ? "fail" : unattributedQuestions.length > 0 ? "warn" : "pass",
    detail:
      foreignQuestions.length === 0 && unattributedQuestions.length === 0
        ? `${questions.length} question(s) owned by the story owner`
        : [
            ...(foreignQuestions.length ? [`foreign owner: ${listIds(foreignQuestions.map((q) => q.id))}`] : []),
            ...(unattributedQuestions.length ? [`no owner attribution: ${listIds(unattributedQuestions.map((q) => q.id))}`] : []),
          ].join("; "),
  });

  // ---- 5. Follow-up ownership ------------------------------------------
  const followUps = await prisma.followUpEntry.findMany({
    where: { storyId },
    select: { id: true, userId: true },
  });
  const foreignFollowUps = followUps.filter((f) => f.userId !== story.userId);
  checks.push({
    id: "followup-ownership",
    label: INTEGRITY_CHECKS[4].label,
    status: foreignFollowUps.length === 0 ? "pass" : "fail",
    detail:
      foreignFollowUps.length === 0
        ? `${followUps.length} follow-up(s) owned by the story owner`
        : `${foreignFollowUps.length} follow-up(s) owned by a different user: ${listIds(foreignFollowUps.map((f) => f.id))}`,
  });

  // ---- 6. Confirmation consistency --------------------------------------
  // `confirmedByUser` and `status = USER_CONFIRMED` are written
  // together by the confirm action — a mismatch means the row was
  // changed outside that path.
  const events = await prisma.storyEvent.findMany({
    where: { storyId },
    select: {
      id: true,
      status: true,
      createdBy: true,
      confirmedByUser: true,
      needsConfirmation: true,
    },
  });
  const badConfirmation = events.filter(
    (e) => e.confirmedByUser !== (e.status === "USER_CONFIRMED") || (e.status === "USER_CONFIRMED" && e.needsConfirmation)
  );
  checks.push({
    id: "confirmation-consistency",
    label: INTEGRITY_CHECKS[5].label,
    status: badConfirmation.length === 0 ? "pass" : "fail",
    detail:
      badConfirmation.length === 0
        ? `${events.length} event(s) with consistent confirmation state`
        : `${badConfirmation.length} event(s) with confirmation flag/status mismatch: ${listIds(badConfirmation.map((e) => e.id))}`,
  });

  // ---- 7. Provenance consistency ----------------------------------------
  const badProvenance = events.filter(
    (e) =>
      (e.createdBy === "AI" && e.status === "USER_REPORTED") ||
      (e.createdBy === "USER" && e.status === "AI_ORGANIZED")
  );
  checks.push({
    id: "provenance-consistency",
    label: INTEGRITY_CHECKS[6].label,
    status: badProvenance.length === 0 ? "pass" : "warn",
    detail:
      badProvenance.length === 0
        ? "createdBy matches status on all events"
        : `${badProvenance.length} event(s) where createdBy and status disagree: ${listIds(badProvenance.map((e) => e.id))}`,
  });

  // ---- 8. Communication selections ---------------------------------------
  const [communications, eventIds, questionIds, topicIds] = await Promise.all([
    prisma.communicationSession.findMany({
      where: { storyId },
      select: { id: true, selectedEventIds: true, selectedQuestionIds: true, selectedTopicIds: true },
    }),
    prisma.storyEvent.findMany({ where: { storyId }, select: { id: true } }),
    prisma.storyQuestion.findMany({ where: { storyId }, select: { id: true } }),
    prisma.topic.findMany({ where: { storyId }, select: { id: true } }),
  ]);
  const knownEvents = new Set(eventIds.map((r) => r.id));
  const knownQuestions = new Set(questionIds.map((r) => r.id));
  const knownTopics = new Set(topicIds.map((r) => r.id));
  const staleSelections: string[] = [];
  for (const comm of communications) {
    const stale =
      comm.selectedEventIds.filter((x) => !knownEvents.has(x)).length +
      comm.selectedQuestionIds.filter((x) => !knownQuestions.has(x)).length +
      comm.selectedTopicIds.filter((x) => !knownTopics.has(x)).length;
    if (stale > 0) staleSelections.push(comm.id);
  }
  checks.push({
    id: "communication-selections",
    label: INTEGRITY_CHECKS[7].label,
    status: staleSelections.length === 0 ? "pass" : "warn",
    detail:
      staleSelections.length === 0
        ? `${communications.length} communication(s) with fully resolvable selections`
        : `${staleSelections.length} communication(s) select rows that no longer exist: ${listIds(staleSelections)}`,
  });

  return {
    storyId,
    generatedAt: new Date().toISOString(),
    status: worst(checks),
    checks,
  };
}
