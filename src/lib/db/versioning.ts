/**
 * Stage 11 — story versioning.
 *
 * Multi-step writes call {@link recordVersion} with the SAME
 * transaction client they use for the write itself, so history and
 * data commit (or roll back) together. A story version row is the
 * durable record of *why* the story changed — never a score.
 */

import type { Prisma, VersionChangeReason } from "@prisma/client";
import { prisma } from "./client";

type Tx = Prisma.TransactionClient;

export type VersionRecordInput = {
  storyId: string;
  changeReason: VersionChangeReason;
  createdBy: string;
  /** What triggered the version (e.g. "event.confirm", "followUp.create"). */
  source: string;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Bump `Story.currentVersion` and append a `StoryVersion` row inside
 * the caller's transaction. Returns the new version number.
 */
export async function recordVersion(tx: Tx, input: VersionRecordInput): Promise<number> {
  const story = await tx.story.findUnique({
    where: { id: input.storyId },
    select: { currentVersion: true },
  });
  if (!story) {
    throw new Error(`Cannot record a version: story ${input.storyId} not found`);
  }

  const nextVersion = story.currentVersion + 1;

  await tx.story.update({
    where: { id: input.storyId },
    data: { currentVersion: nextVersion },
  });

  await tx.storyVersion.create({
    data: {
      storyId: input.storyId,
      versionNumber: nextVersion,
      changeReason: input.changeReason,
      createdBy: input.createdBy,
      source: input.source,
      metadata: input.metadata,
    },
  });

  return nextVersion;
}

/** Convenience for non-transactional contexts (single-row writes). */
export async function recordVersionStandalone(input: VersionRecordInput): Promise<number> {
  return prisma.$transaction((tx) => recordVersion(tx, input));
}
