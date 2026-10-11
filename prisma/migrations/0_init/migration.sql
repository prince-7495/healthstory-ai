-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('AI_ORGANIZED', 'USER_REPORTED', 'USER_CONFIRMED', 'USER_EDITED', 'NEEDS_REVIEW', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DatePrecision" AS ENUM ('EXACT', 'MONTH', 'APPROXIMATE', 'RELATIVE', 'RANGE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('SYMPTOM', 'MEDICATION', 'TREATMENT', 'TEST', 'APPOINTMENT', 'LIFESTYLE', 'CONTEXT', 'CHANGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExtractionConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "Provenance" AS ENUM ('USER', 'AI');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('USER_ENTRY', 'DOCUMENT', 'FOLLOW_UP', 'COMMUNICATION', 'MANUAL_ENTRY');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('CONVERSATION', 'APPOINTMENT', 'TEST_OR_REPORT', 'NEW_UPDATE', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpItemStatus" AS ENUM ('AI_ORGANIZED', 'USER_CONFIRMED', 'USER_EDITED', 'REMOVED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('USER', 'AI_SUGGESTED');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('OPEN', 'ANSWERED', 'DISCUSSED', 'REMOVED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'ANALYZED', 'NEEDS_REVIEW', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('DRAFT', 'REVIEWED', 'FINALIZED', 'STALE');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('EVENT', 'TOPIC', 'FOLLOW_UP', 'DOCUMENT', 'QUESTION', 'COMMUNICATION', 'SOURCE', 'SNAPSHOT');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('SAME_TOPIC', 'TEMPORAL_SEQUENCE', 'SOURCE_OF', 'SUPPORTS', 'FOLLOW_UP_TO', 'MENTIONED_IN', 'DERIVED_FROM', 'CORRECTS', 'DUPLICATE_OF', 'USER_LINKED');

-- CreateEnum
CREATE TYPE "RelationshipConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "RelationshipOrigin" AS ENUM ('USER', 'AI');

-- CreateEnum
CREATE TYPE "VersionChangeReason" AS ENUM ('INITIAL_CREATION', 'AI_ORGANIZATION', 'USER_CONFIRMATION', 'USER_EDIT', 'FOLLOW_UP', 'DOCUMENT_IMPORT', 'CORRECTION');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('STORY_CREATED', 'EVENT_CREATED', 'EVENT_EDITED', 'EVENT_CONFIRMED', 'DOCUMENT_UPLOADED', 'DOCUMENT_DELETED', 'COMMUNICATION_GENERATED', 'STORY_EXPORTED', 'STORY_DELETED', 'FOLLOW_UP_ADDED', 'QUESTION_CREATED', 'USER_EDIT', 'AI_ORGANIZATION', 'CONFIRMATION');

-- CreateEnum
CREATE TYPE "AIProcessingType" AS ENUM ('STORY_EXTRACTION', 'CHANGE_DETECTION', 'COMMUNICATION_GENERATION', 'DOCUMENT_ANALYSIS', 'TRANSLATION', 'INSIGHT_GENERATION');

-- CreateEnum
CREATE TYPE "AIProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'VALIDATION_FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "authProvider" TEXT,
    "authProviderId" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" "StoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_events" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "datePrecision" "DatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "description" TEXT NOT NULL,
    "frequency" TEXT,
    "severity" TEXT,
    "context" TEXT,
    "changeDescription" TEXT,
    "originalText" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'AI_ORGANIZED',
    "createdBy" "Provenance" NOT NULL DEFAULT 'AI',
    "confirmedByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "category" "EventCategory",
    "dateText" TEXT,
    "sourceText" TEXT,
    "evidence" JSONB,
    "mentions" INTEGER DEFAULT 1,
    "label" TEXT,
    "timeLabel" TEXT,
    "extractionConfidence" "ExtractionConfidence",
    "needsConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "graphNodeId" TEXT,

    CONSTRAINT "story_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'AI_ORGANIZED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_topics" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_references" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "quotedText" TEXT NOT NULL,
    "location" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_entries" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FollowUpType" NOT NULL,
    "originalText" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3),
    "eventDatePrecision" "DatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "status" "EventStatus" NOT NULL DEFAULT 'AI_ORGANIZED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "extractedItems" JSONB,

    CONSTRAINT "follow_up_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_items" (
    "id" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "confidence" "ExtractionConfidence" NOT NULL,
    "status" "FollowUpItemStatus" NOT NULL DEFAULT 'AI_ORGANIZED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_up_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_questions" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT,
    "text" TEXT NOT NULL,
    "source" "QuestionSource" NOT NULL DEFAULT 'USER',
    "status" "QuestionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "title" TEXT,
    "originalText" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "pageCount" INTEGER,
    "language" TEXT,
    "analysis" JSONB,
    "relatedFollowUpId" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sections" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "sectionTitle" TEXT,
    "originalText" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "sourceReferenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_terms" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "plainDefinition" TEXT NOT NULL,
    "documentContext" TEXT,
    "sourceReferenceId" TEXT,
    "savedByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_measurements" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "date" TIMESTAMP(3),
    "sourceReferenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_sessions" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL DEFAULT 'en',
    "targetLanguage" TEXT,
    "style" TEXT,
    "tone" TEXT,
    "pointOfView" TEXT,
    "simplifyLanguage" BOOLEAN NOT NULL DEFAULT false,
    "selectedEventIds" TEXT[],
    "selectedTopicIds" TEXT[],
    "selectedQuestionIds" TEXT[],
    "sourceVersion" INTEGER NOT NULL,
    "draft" TEXT,
    "finalDraft" TEXT,
    "status" "CommunicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_translations" (
    "id" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "sourceVersion" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "reviewedByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_snapshots" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "summary" JSONB,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "topicCount" INTEGER NOT NULL DEFAULT 0,
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "questionCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "story_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_versions" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeReason" "VersionChangeReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "source" TEXT,
    "metadata" JSONB,

    CONSTRAINT "story_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_graph_nodes" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "nodeType" "NodeType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'AI_ORGANIZED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_graph_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_graph_relationships" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "relationshipType" "RelationshipType" NOT NULL,
    "sourceIds" TEXT[],
    "createdBy" "RelationshipOrigin" NOT NULL DEFAULT 'AI',
    "confirmedByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_graph_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT,
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_processing_records" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "type" "AIProcessingType" NOT NULL,
    "status" "AIProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "inputSummary" JSONB,
    "outputSummary" JSONB,
    "errorMessage" TEXT,
    "tokensUsed" INTEGER,
    "durationMs" INTEGER,
    "provider" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ai_processing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_story_links" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_story_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EventSourceReferences" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_authProviderId_key" ON "users"("authProviderId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_authProviderId_idx" ON "users"("authProviderId");

-- CreateIndex
CREATE INDEX "stories_userId_idx" ON "stories"("userId");

-- CreateIndex
CREATE INDEX "stories_status_idx" ON "stories"("status");

-- CreateIndex
CREATE INDEX "story_events_storyId_idx" ON "story_events"("storyId");

-- CreateIndex
CREATE INDEX "story_events_storyId_date_idx" ON "story_events"("storyId", "date");

-- CreateIndex
CREATE INDEX "story_events_label_idx" ON "story_events"("label");

-- CreateIndex
CREATE INDEX "topics_storyId_idx" ON "topics"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "topics_storyId_name_key" ON "topics"("storyId", "name");

-- CreateIndex
CREATE INDEX "event_topics_eventId_idx" ON "event_topics"("eventId");

-- CreateIndex
CREATE INDEX "event_topics_topicId_idx" ON "event_topics"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "event_topics_eventId_topicId_key" ON "event_topics"("eventId", "topicId");

-- CreateIndex
CREATE INDEX "source_references_storyId_idx" ON "source_references"("storyId");

-- CreateIndex
CREATE INDEX "source_references_sourceType_sourceId_idx" ON "source_references"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "follow_up_entries_storyId_idx" ON "follow_up_entries"("storyId");

-- CreateIndex
CREATE INDEX "follow_up_entries_userId_idx" ON "follow_up_entries"("userId");

-- CreateIndex
CREATE INDEX "follow_up_entries_type_idx" ON "follow_up_entries"("type");

-- CreateIndex
CREATE INDEX "follow_up_items_followUpId_idx" ON "follow_up_items"("followUpId");

-- CreateIndex
CREATE INDEX "story_questions_storyId_idx" ON "story_questions"("storyId");

-- CreateIndex
CREATE INDEX "story_questions_status_idx" ON "story_questions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storageKey_key" ON "documents"("storageKey");

-- CreateIndex
CREATE INDEX "documents_storyId_idx" ON "documents"("storyId");

-- CreateIndex
CREATE INDEX "documents_userId_idx" ON "documents"("userId");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_storageKey_idx" ON "documents"("storageKey");

-- CreateIndex
CREATE INDEX "document_sections_documentId_idx" ON "document_sections"("documentId");

-- CreateIndex
CREATE INDEX "document_sections_documentId_pageNumber_idx" ON "document_sections"("documentId", "pageNumber");

-- CreateIndex
CREATE INDEX "document_terms_documentId_idx" ON "document_terms"("documentId");

-- CreateIndex
CREATE INDEX "document_measurements_documentId_idx" ON "document_measurements"("documentId");

-- CreateIndex
CREATE INDEX "communication_sessions_storyId_idx" ON "communication_sessions"("storyId");

-- CreateIndex
CREATE INDEX "communication_sessions_userId_idx" ON "communication_sessions"("userId");

-- CreateIndex
CREATE INDEX "communication_sessions_status_idx" ON "communication_sessions"("status");

-- CreateIndex
CREATE INDEX "communication_translations_communicationId_idx" ON "communication_translations"("communicationId");

-- CreateIndex
CREATE INDEX "story_snapshots_storyId_idx" ON "story_snapshots"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "story_snapshots_storyId_versionNumber_key" ON "story_snapshots"("storyId", "versionNumber");

-- CreateIndex
CREATE INDEX "story_versions_storyId_idx" ON "story_versions"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "story_versions_storyId_versionNumber_key" ON "story_versions"("storyId", "versionNumber");

-- CreateIndex
CREATE INDEX "story_graph_nodes_storyId_idx" ON "story_graph_nodes"("storyId");

-- CreateIndex
CREATE INDEX "story_graph_nodes_storyId_nodeType_idx" ON "story_graph_nodes"("storyId", "nodeType");

-- CreateIndex
CREATE INDEX "story_graph_nodes_entityId_idx" ON "story_graph_nodes"("entityId");

-- CreateIndex
CREATE INDEX "story_graph_relationships_storyId_idx" ON "story_graph_relationships"("storyId");

-- CreateIndex
CREATE INDEX "story_graph_relationships_fromNodeId_idx" ON "story_graph_relationships"("fromNodeId");

-- CreateIndex
CREATE INDEX "story_graph_relationships_toNodeId_idx" ON "story_graph_relationships"("toNodeId");

-- CreateIndex
CREATE INDEX "story_graph_relationships_relationshipType_idx" ON "story_graph_relationships"("relationshipType");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_storyId_idx" ON "audit_logs"("storyId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "ai_processing_records_storyId_idx" ON "ai_processing_records"("storyId");

-- CreateIndex
CREATE INDEX "ai_processing_records_type_idx" ON "ai_processing_records"("type");

-- CreateIndex
CREATE INDEX "ai_processing_records_status_idx" ON "ai_processing_records"("status");

-- CreateIndex
CREATE INDEX "user_story_links_storyId_idx" ON "user_story_links"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "_EventSourceReferences_AB_unique" ON "_EventSourceReferences"("A", "B");

-- CreateIndex
CREATE INDEX "_EventSourceReferences_B_index" ON "_EventSourceReferences"("B");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_events" ADD CONSTRAINT "story_events_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_topics" ADD CONSTRAINT "event_topics_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "story_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_topics" ADD CONSTRAINT "event_topics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_references" ADD CONSTRAINT "source_references_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_entries" ADD CONSTRAINT "follow_up_entries_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_entries" ADD CONSTRAINT "follow_up_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_items" ADD CONSTRAINT "follow_up_items_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "follow_up_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_questions" ADD CONSTRAINT "story_questions_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_questions" ADD CONSTRAINT "story_questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_relatedFollowUpId_fkey" FOREIGN KEY ("relatedFollowUpId") REFERENCES "follow_up_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sections" ADD CONSTRAINT "document_sections_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_terms" ADD CONSTRAINT "document_terms_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_measurements" ADD CONSTRAINT "document_measurements_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_sessions" ADD CONSTRAINT "communication_sessions_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_sessions" ADD CONSTRAINT "communication_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_translations" ADD CONSTRAINT "communication_translations_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "communication_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_snapshots" ADD CONSTRAINT "story_snapshots_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_graph_nodes" ADD CONSTRAINT "story_graph_nodes_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_graph_relationships" ADD CONSTRAINT "story_graph_relationships_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_graph_relationships" ADD CONSTRAINT "story_graph_relationships_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "story_graph_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_graph_relationships" ADD CONSTRAINT "story_graph_relationships_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "story_graph_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventSourceReferences" ADD CONSTRAINT "_EventSourceReferences_A_fkey" FOREIGN KEY ("A") REFERENCES "source_references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventSourceReferences" ADD CONSTRAINT "_EventSourceReferences_B_fkey" FOREIGN KEY ("B") REFERENCES "story_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

