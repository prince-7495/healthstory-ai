import { prisma } from "./client";
import type { Prisma } from "@prisma/client";

export class UserRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  }
}

export class StoryRepository {
  async findById(id: string, includeRelations = false) {
    return prisma.story.findUnique({
      where: { id },
      include: includeRelations
        ? {
            events: { orderBy: { date: "asc" } },
            topics: true,
            followUps: { orderBy: { createdAt: "desc" } },
            questions: { orderBy: { createdAt: "desc" } },
            documents: { orderBy: { uploadedAt: "desc" } },
            communications: { orderBy: { createdAt: "desc" } },
            snapshots: { orderBy: { versionNumber: "desc" } },
            versions: { orderBy: { versionNumber: "desc" } },
            graphNodes: { include: { fromEdges: true, toEdges: true } },
            graphEdges: true,
          }
        : undefined,
    });
  }

  async findByUserId(userId: string) {
    return prisma.story.findMany({
      where: { userId, status: { not: "DELETED" } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async create(data: Prisma.StoryCreateInput) {
    return prisma.story.create({ data });
  }

  async update(id: string, data: Prisma.StoryUpdateInput) {
    return prisma.story.update({ where: { id }, data });
  }

  async incrementVersion(id: string) {
    return prisma.story.update({
      where: { id },
      data: { currentVersion: { increment: 1 }, updatedAt: new Date() },
    });
  }

  async softDelete(id: string) {
    return prisma.story.update({
      where: { id },
      data: { status: "DELETED", archivedAt: new Date() },
    });
  }
}

export class StoryEventRepository {
  async findById(id: string) {
    return prisma.storyEvent.findUnique({
      where: { id },
      include: { topics: { include: { topic: true } }, sourceReferences: true },
    });
  }

  async findByStoryId(storyId: string) {
    return prisma.storyEvent.findMany({
      where: { storyId },
      orderBy: { date: "asc" },
      include: { topics: { include: { topic: true } } },
    });
  }

  async create(data: Prisma.StoryEventCreateInput) {
    return prisma.storyEvent.create({ data });
  }

  async createMany(data: Prisma.StoryEventCreateManyInput[]) {
    return prisma.storyEvent.createMany({ data });
  }

  async update(id: string, data: Prisma.StoryEventUpdateInput) {
    return prisma.storyEvent.update({ where: { id }, data });
  }

  async confirm(id: string) {
    return prisma.storyEvent.update({
      where: { id },
      data: { status: "USER_CONFIRMED", confirmedByUser: true, needsConfirmation: false },
    });
  }

  async remove(id: string) {
    return prisma.storyEvent.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  }

  async delete(id: string) {
    return prisma.storyEvent.delete({ where: { id } });
  }
}

export class TopicRepository {
  async findByStoryId(storyId: string) {
    return prisma.topic.findMany({
      where: { storyId },
      include: { events: { include: { event: true } } },
      orderBy: { name: "asc" },
    });
  }

  async findOrCreate(storyId: string, name: string, description?: string) {
    const existing = await prisma.topic.findUnique({
      where: { storyId_name: { storyId, name } },
    });
    if (existing) return existing;

    return prisma.topic.create({
      data: { storyId, name, description },
    });
  }

  async linkEvent(topicId: string, eventId: string) {
    return prisma.eventTopic.upsert({
      where: { eventId_topicId: { eventId, topicId } },
      create: { eventId, topicId },
      update: {},
    });
  }

  async unlinkEvent(topicId: string, eventId: string) {
    return prisma.eventTopic.delete({
      where: { eventId_topicId: { eventId, topicId } },
    });
  }
}

export class SourceReferenceRepository {
  async create(data: Prisma.SourceReferenceCreateInput) {
    return prisma.sourceReference.create({ data });
  }

  async createMany(data: Prisma.SourceReferenceCreateManyInput[]) {
    return prisma.sourceReference.createMany({ data });
  }

  async findByStoryId(storyId: string) {
    return prisma.sourceReference.findMany({ where: { storyId } });
  }

  async findByEventId(eventId: string) {
    return prisma.sourceReference.findMany({
      where: { events: { some: { id: eventId } } },
    });
  }
}

export class FollowUpRepository {
  async findByStoryId(storyId: string) {
    return prisma.followUpEntry.findMany({
      where: { storyId },
      orderBy: { createdAt: "desc" },
      include: { items: true, relatedDocuments: true },
    });
  }

  async findById(id: string) {
    return prisma.followUpEntry.findUnique({
      where: { id },
      include: { items: true, relatedDocuments: true },
    });
  }

  async create(data: Prisma.FollowUpEntryCreateInput) {
    return prisma.followUpEntry.create({ data });
  }

  async update(id: string, data: Prisma.FollowUpEntryUpdateInput) {
    return prisma.followUpEntry.update({ where: { id }, data });
  }
}

export class FollowUpItemRepository {
  async create(data: Prisma.FollowUpItemCreateInput) {
    return prisma.followUpItem.create({ data });
  }

  async createMany(data: Prisma.FollowUpItemCreateManyInput[]) {
    return prisma.followUpItem.createMany({ data });
  }

  async updateStatus(id: string, status: "AI_ORGANIZED" | "USER_CONFIRMED" | "USER_EDITED" | "REMOVED" | "NEEDS_REVIEW") {
    return prisma.followUpItem.update({ where: { id }, data: { status } });
  }
}

export class QuestionRepository {
  async findByStoryId(storyId: string) {
    return prisma.storyQuestion.findMany({
      where: { storyId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: Prisma.StoryQuestionCreateInput) {
    return prisma.storyQuestion.create({ data });
  }

  async update(id: string, data: Prisma.StoryQuestionUpdateInput) {
    return prisma.storyQuestion.update({ where: { id }, data });
  }

  async markDiscussed(id: string) {
    return prisma.storyQuestion.update({
      where: { id },
      data: { status: "DISCUSSED" },
    });
  }
}

export class DocumentRepository {
  async findByStoryId(storyId: string) {
    return prisma.document.findMany({
      where: { storyId, status: { not: "DELETED" } },
      orderBy: { uploadedAt: "desc" },
      include: { sections: { orderBy: { pageNumber: "asc" } } },
    });
  }

  async findById(id: string) {
    return prisma.document.findUnique({
      where: { id },
      include: { sections: { orderBy: { pageNumber: "asc" } }, terms: true, measurements: true },
    });
  }

  async create(data: Prisma.DocumentCreateInput) {
    return prisma.document.create({ data });
  }

  async update(id: string, data: Prisma.DocumentUpdateInput) {
    return prisma.document.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return prisma.document.update({
      where: { id },
      data: { status: "DELETED", deletedAt: new Date() },
    });
  }
}

export class CommunicationRepository {
  async findByStoryId(storyId: string) {
    return prisma.communicationSession.findMany({
      where: { storyId },
      orderBy: { createdAt: "desc" },
      include: { translations: true },
    });
  }

  async findById(id: string) {
    return prisma.communicationSession.findUnique({
      where: { id },
      include: { translations: true },
    });
  }

  async create(data: Prisma.CommunicationSessionCreateInput) {
    return prisma.communicationSession.create({ data });
  }

  async update(id: string, data: Prisma.CommunicationSessionUpdateInput) {
    return prisma.communicationSession.update({ where: { id }, data });
  }
}

export class SnapshotRepository {
  async findByStoryId(storyId: string) {
    return prisma.storySnapshot.findMany({
      where: { storyId },
      orderBy: { versionNumber: "desc" },
    });
  }

  async create(data: Prisma.StorySnapshotCreateInput) {
    return prisma.storySnapshot.create({ data });
  }
}

export class VersionRepository {
  async findByStoryId(storyId: string) {
    return prisma.storyVersion.findMany({
      where: { storyId },
      orderBy: { versionNumber: "desc" },
    });
  }

  async create(data: Prisma.StoryVersionCreateInput) {
    return prisma.storyVersion.create({ data });
  }
}

export class GraphRepository {
  async findNodesByStoryId(storyId: string) {
    return prisma.storyGraphNode.findMany({
      where: { storyId },
      include: { fromEdges: true, toEdges: true },
    });
  }

  async findEdgesByStoryId(storyId: string) {
    return prisma.storyGraphRelationship.findMany({
      where: { storyId },
    });
  }

  async createNode(data: Prisma.StoryGraphNodeCreateInput) {
    return prisma.storyGraphNode.create({ data });
  }

  async createEdge(data: Prisma.StoryGraphRelationshipCreateInput) {
    return prisma.storyGraphRelationship.create({ data });
  }

  async rebuildForStory(storyId: string) {
    await prisma.$transaction([
      prisma.storyGraphRelationship.deleteMany({ where: { storyId } }),
      prisma.storyGraphNode.deleteMany({ where: { storyId } }),
    ]);
  }
}

export class AuditRepository {
  async log(data: Prisma.AuditLogCreateInput) {
    return prisma.auditLog.create({ data });
  }

  async findByUserId(userId: string) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 100,
    });
  }

  async findByStoryId(storyId: string) {
    return prisma.auditLog.findMany({
      where: { storyId },
      orderBy: { timestamp: "desc" },
      take: 100,
    });
  }
}

export class AIProcessingRepository {
  async create(data: Prisma.AIProcessingRecordCreateInput) {
    return prisma.aIProcessingRecord.create({ data });
  }

  async update(id: string, data: Prisma.AIProcessingRecordUpdateInput) {
    return prisma.aIProcessingRecord.update({ where: { id }, data });
  }

  async findByStoryId(storyId: string) {
    return prisma.aIProcessingRecord.findMany({
      where: { storyId },
      orderBy: { createdAt: "desc" },
    });
  }
}

// Export all repositories as a single service
export const repositories = {
  users: new UserRepository(),
  stories: new StoryRepository(),
  events: new StoryEventRepository(),
  topics: new TopicRepository(),
  sourceReferences: new SourceReferenceRepository(),
  followUps: new FollowUpRepository(),
  followUpItems: new FollowUpItemRepository(),
  questions: new QuestionRepository(),
  documents: new DocumentRepository(),
  communications: new CommunicationRepository(),
  snapshots: new SnapshotRepository(),
  versions: new VersionRepository(),
  graph: new GraphRepository(),
  audit: new AuditRepository(),
  aiProcessing: new AIProcessingRepository(),
};