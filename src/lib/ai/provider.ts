/**
 * AI Provider Abstraction - Stage 10
 * Allows swapping between different AI providers
 */

import { z } from "zod";
import { ExtractedEvent, ExtractionOutput, ChangeDetectionOutput, CommunicationDraft, DocumentAnalysis, ExtractionOutputSchema, ChangeDetectionOutputSchema, CommunicationDraftSchema, DocumentAnalysisSchema } from "@/lib/ai/schemas/validation";
import type { StoryInsight } from "@/lib/insights/types";
import type { HealthEvent, HealthStory } from "@/lib/health/types";
import type { FollowUpEntry, HealthDocument, StoryEvolution, StoryJournal, StoryQuestion } from "@/lib/journal/types";
import { createDefaultPreferences } from "@/lib/journal/types";
import type {
  CommunicationLanguageId,
  CommunicationPerson,
  CommunicationStyle,
  CommunicationTone,
} from "@/lib/communication/types";

export interface AIProvider {
  readonly name: string;
  readonly model: string;

  extractStory(input: StoryExtractionInput): Promise<ExtractionOutput>;
  detectChanges(input: ChangeDetectionInput): Promise<ChangeDetectionOutput>;
  generateCommunication(input: CommunicationInput): Promise<CommunicationDraft>;
  translateCommunication(input: TranslationInput): Promise<TranslationResult>;
  analyzeDocument(input: DocumentInput): Promise<DocumentAnalysis>;
  generateInsights(input: InsightInput): Promise<StoryInsight[]>;
}

// ============================================================
// Input Types
// ============================================================

export interface StoryExtractionInput {
  text: string;
  existingEvents?: ExtractedEvent[];
  options?: {
    language?: string;
    maxEvents?: number;
  };
}

export interface ChangeDetectionInput {
  previousText: string;
  currentText: string;
  previousEvents: ExtractedEvent[];
  currentEvents: ExtractedEvent[];
  options?: {
    language?: string;
  };
}

export interface CommunicationInput {
  story: {
    events: ExtractedEvent[];
    changes: StoryEvolution[];
    questions: string[];
  };
  selection: {
    events: string[];
    topics: string[];
    questions: string[];
  };
  style: "Quick" | "Standard" | "Detailed";
  tone: "Calm" | "Direct" | "Simple" | "Clear & structured";
  pointOfView: "first person" | "neutral";
  simplifyLanguage: boolean;
  targetLanguage: string;
  sourceLanguage: string;
}

export interface TranslationInput {
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: string;
}

export interface DocumentInput {
  text: string;
  filename: string;
  mimeType: string;
  options?: {
    language?: string;
  };
}

export interface InsightInput {
  events: ExtractedEvent[];
  documents: HealthDocument[];
  followUps: FollowUpEntry[];
  questions: StoryQuestion[];
  graphNodes: unknown[];
  graphEdges: unknown[];
  recentChanges: StoryEvolution[];
}

export interface TranslationResult {
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
  reviewedByUser: boolean;
}

// ============================================================
// Shared event mapping
// ============================================================

/**
 * Maps a schema-level `ExtractedEvent` into the application's story event
 * shape used by the local organization and insights engines.
 */
function toStoryEvent(e: ExtractedEvent, index: number) {
  return {
    id: `mock-${index}`,
    date: e.date,
    dateLabel: e.dateLabel,
    datePrecision: e.datePrecision,
    dateText: e.dateLabel,
    description: e.description,
    frequency: e.frequency,
    change: e.change,
    notes: e.notes,
    origin: "ai" as const,
    title: e.label ?? e.description.slice(0, 50),
    category: e.category ?? "other",
    severity: e.severity,
    context: e.context,
    sourceText: e.sourceText ?? "",
    evidence: [],
    mentions: undefined,
    label: e.label ?? "",
    timeLabel: e.timeLabel ?? "",
    extractionConfidence: e.extractionConfidence ?? "medium",
    status: "AI_ORGANIZED" as const,
    needsConfirmation: true,
    metadata: undefined,
  };
}

// ============================================================
// Mock Provider (for demo/development)
// ============================================================

export class MockAIProvider implements AIProvider {
  readonly name = "mock";
  readonly model = "local-rules-v2";

  async extractStory(input: StoryExtractionInput): Promise<ExtractionOutput> {
    // Use the local deterministic extractor
    const { previewOrganizedStory } = await import("@/lib/health/analyzeHealthStory");

    const healthStory: HealthStory = {
      storyText: input.text,
      language: input.options?.language ?? "en",
      events: (input.existingEvents || []).map(toStoryEvent) as unknown as HealthEvent[],
      documents: [],
      voiceInput: null,
      details: { start: null, customDate: "", frequency: null, change: null, notes: "" },
      organizedStory: null,
    };

    const result = previewOrganizedStory(healthStory);
    return {
      events: result?.events || [],
      summary: result?.summary,
    };
  }

  async detectChanges(input: ChangeDetectionInput): Promise<ChangeDetectionOutput> {
    // Deterministic mock: without a real model, only identical texts can be
    // reported as "no change".
    return {
      changes: [],
      noChangeDetected: input.previousText.trim() === input.currentText.trim(),
    };
  }

  async generateCommunication(input: CommunicationInput): Promise<CommunicationDraft> {
    // Use the local communication engine
    const { generateCommunicationDraft } = await import("@/lib/communication/engine");

    const journal: StoryJournal = {
      id: "mock",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: [],
      events: input.story.events.map(toStoryEvent) as unknown as StoryJournal["events"],
      topics: [],
      evolutions: input.story.changes,
      summaries: [],
      snapshots: [],
      preferences: createDefaultPreferences(),
      activity: [],
      questions: input.story.questions.map((text, index) => ({
        id: `mock-q-${index}`,
        text,
        source: "USER" as const,
        status: "OPEN" as const,
        createdAt: new Date().toISOString(),
      })),
      followUps: [],
      documents: [],
      userLinks: [],
    };

    const draft = generateCommunicationDraft({
      journal,
      selection: {
        focus: "full",
        topicIds: input.selection.topics,
        range: { id: "all" },
        style: input.style as unknown as CommunicationStyle,
        tone: input.tone as unknown as CommunicationTone,
        person: input.pointOfView as unknown as CommunicationPerson,
        plainLanguage: input.simplifyLanguage,
        language: input.targetLanguage as CommunicationLanguageId,
        sections: { timeline: true, changes: true, context: true, summary: true, questions: true, evidence: false, olderEntries: false },
        questionIds: input.selection.questions,
        includeUnconfirmed: false,
      },
    });

    // Adapt the communication engine output to match the schema-level
    // CommunicationDraft shape.
    return {
      opening: draft.text?.split('\n\n')[0] || '',
      whatINoticed: draft.text?.split('\n\n').slice(1, 2)[0] || '',
      whenItStarted: '',
      howItChanged: '',
      relevantContext: '',
      questions: [],
      informationNotRecorded: [],
      validation: { safe: true, flaggedPhrases: [], rewritten: undefined },
      recentUpdate: undefined,
      closing: undefined,
    };
  }

  async translateCommunication(input: TranslationInput): Promise<TranslationResult> {
    // Mock translation - in production would use a real translation service
    return {
      content: `[Translated to ${input.targetLanguage}] ${input.content}`,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      reviewedByUser: false,
    };
  }

  async analyzeDocument(input: DocumentInput): Promise<DocumentAnalysis> {
    // Use the local document understanding engine
    const { buildDocument } = await import("@/lib/understand/engine");
    const doc = await buildDocument(
      { name: input.filename, type: input.mimeType, size: input.text.length, text: input.text },
      new Date().toISOString()
    );
    return doc.analysis as unknown as DocumentAnalysis;
  }

  async generateInsights(input: InsightInput): Promise<StoryInsight[]> {
    // Use the local insights engine
    const { generateStoryInsights } = await import("@/lib/insights/insights");
    const { buildStoryGraph } = await import("@/lib/insights/engine");

    const journal: StoryJournal = {
      id: "mock",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      entries: [],
      events: input.events.map(toStoryEvent) as unknown as StoryJournal["events"],
      topics: [],
      evolutions: [],
      summaries: [],
      snapshots: [],
      preferences: createDefaultPreferences(),
      activity: [],
      questions: input.questions,
      followUps: input.followUps,
      documents: input.documents,
      userLinks: [],
    };

    const graph = buildStoryGraph(journal);
    return generateStoryInsights(journal, graph);
  }
}

// ============================================================
// Real OpenAI Provider (for production)
// ============================================================

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Validates that the AI response is valid JSON matching the expected schema.
 * Returns parsed object or throws if invalid.
 */
async function parseAIResponse<T>(response: string, schemaName: string): Promise<T> {
  try {
    // Try to extract JSON from the response (handle code blocks)
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || response.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    throw new Error(`Failed to parse AI response for ${schemaName}: ${e}. Raw response: ${response.slice(0, 500)}`);
  }
}

/**
 * OpenAI-compatible provider implementation.
 * Integrates with the existing safety validation pipeline.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly model: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: { apiKey: string; model?: string; baseUrl?: string; timeoutMs?: number }) {
    this.apiKey = options.apiKey;
    this.model = options.model || "gpt-4o-mini";
    this.baseUrl = options.baseUrl || "https://api.openai.com/v1";
    this.timeoutMs = options.timeoutMs || 60000;
  }

  private schemaToPrompt(schema: z.ZodTypeAny, name: string): string {
    try {
      const jsonSchema = z.toJSONSchema(schema, { target: "jsonSchema7" });
      return `Output must be valid JSON matching this JSON Schema (${name}):\n${JSON.stringify(jsonSchema, null, 2)}`;
    } catch {
      return `Output must be valid JSON matching the ${name} schema.`;
    }
  }

  private async callOpenAI(messages: OpenAIMessage[], temperature = 0.1): Promise<OpenAIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "unknown error");
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error(`OpenAI request timed out after ${this.timeoutMs}ms`);
      }
      throw e;
    }
  }

  private async validateAndSanitizeOutput(text: string, operation: string): Promise<string> {
    // Import safety validators dynamically to avoid circular deps
    const { validateAIOutput } = await import("@/lib/ai/safety/medicalClaims");
    const { checkPromptInjection } = await import("@/lib/ai/safety/promptInjection");

    // Check for prompt injection in output (shouldn't happen but defense in depth)
    const injectionCheck = checkPromptInjection(text);
    if (!injectionCheck.safe) {
      console.warn(`[AI Safety] Prompt injection detected in ${operation} output:`, injectionCheck.detected);
    }

    // Validate medical claims, uncertainty, source grounding
    const safetyCheck = validateAIOutput(text, { hasSources: true });
    if (!safetyCheck.safe) {
      console.warn(`[AI Safety] Medical claim validation failed for ${operation}:`, safetyCheck.flaggedPhrases);
      // Use rewritten version if available
      if (safetyCheck.rewritten) {
        return safetyCheck.rewritten;
      }
    }

    return text;
  }

  async extractStory(input: StoryExtractionInput): Promise<ExtractionOutput> {
    const systemPrompt = `You are a medical information organizer. Your task is to extract structured health events from a user's narrative text.

Rules:
- Extract ONLY what the user explicitly stated. Do not infer, diagnose, or add medical knowledge.
- Preserve uncertainty: if the user says "around March", do not convert to "March 15".
- Each event MUST include: description (required), sourceText (required), date (YYYY-MM-DD or null), datePrecision, category, extractionConfidence.
- Do not generate diagnoses, treatments, or medication recommendations.
- If information is not in the text, do not include it.
- Date format: YYYY-MM-DD or null if unknown.
- datePrecision: one of "exact", "month", "approximate", "relative", "range", "unknown".
- category: one of "symptom", "medication", "treatment", "test", "appointment", "lifestyle", "context", "change", "other".
- extractionConfidence: one of "high", "medium", "low".`;

    const schemaPrompt = this.schemaToPrompt(ExtractionOutputSchema, "ExtractionOutput");

    const userPrompt = `Extract health events from this narrative:

"${input.text}"

${input.existingEvents && input.existingEvents.length > 0 ? `Existing events to consider (do not duplicate):\n${JSON.stringify(input.existingEvents, null, 2)}` : ""}

Options: ${JSON.stringify(input.options || {})}

${schemaPrompt}`;

    const response = await this.callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const content = response.choices[0]?.message?.content || "{}";
    const validatedContent = await this.validateAndSanitizeOutput(content, "extractStory");
    return parseAIResponse<ExtractionOutput>(validatedContent, "ExtractionOutput");
  }

  async detectChanges(input: ChangeDetectionInput): Promise<ChangeDetectionOutput> {
    const systemPrompt = `You are a change detection engine for health stories. Compare the previous and current text to identify what changed.

Rules:
- Only report changes explicitly supported by the text.
- Do not infer medical significance.
- Report: new events, modified events, removed events, frequency changes, date changes.
- Preserve uncertainty from the original text.
- confidence: one of "high", "medium", "low".`;

    const schemaPrompt = this.schemaToPrompt(ChangeDetectionOutputSchema, "ChangeDetectionOutput");

    const userPrompt = `Previous text: "${input.previousText}"
Current text: "${input.currentText}"

Previous events: ${JSON.stringify(input.previousEvents)}
Current events: ${JSON.stringify(input.currentEvents)}

${schemaPrompt}`;

    const response = await this.callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const content = response.choices[0]?.message?.content || "{}";
    const validatedContent = await this.validateAndSanitizeOutput(content, "detectChanges");
    return parseAIResponse<ChangeDetectionOutput>(validatedContent, "ChangeDetectionOutput");
  }

  async generateCommunication(input: CommunicationInput): Promise<CommunicationDraft> {
    const systemPrompt = `You are a communication assistant for healthcare conversations. Generate a structured communication draft based on the user's health story.

Rules:
- Use ONLY the selected events, topics, and questions provided.
- Do not add medical advice, diagnoses, or treatments not in the source.
- Use clear, patient-friendly language.
- Include only information the user has explicitly recorded.
- validation.safe: boolean, validation.flaggedPhrases: string[], validation.rewritten: string (optional).`;

    const schemaPrompt = this.schemaToPrompt(CommunicationDraftSchema, "CommunicationDraft");

    const userPrompt = `Generate a communication draft for this health story:

Story events: ${JSON.stringify(input.story.events)}
Story changes: ${JSON.stringify(input.story.changes)}
Story questions: ${JSON.stringify(input.story.questions)}

Selection: ${JSON.stringify(input.selection)}
Style: ${input.style}
Tone: ${input.tone}
Point of view: ${input.pointOfView}
Simplify language: ${input.simplifyLanguage}
Target language: ${input.targetLanguage}
Source language: ${input.sourceLanguage}

${schemaPrompt}`;

    const response = await this.callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const content = response.choices[0]?.message?.content || "{}";
    const validatedContent = await this.validateAndSanitizeOutput(content, "generateCommunication");
    return parseAIResponse<CommunicationDraft>(validatedContent, "CommunicationDraft");
  }

  async translateCommunication(input: TranslationInput): Promise<TranslationResult> {
    const systemPrompt = `You are a medical translation assistant. Translate the content accurately, preserving medical terminology and uncertainty.

Rules:
- Do not add or remove medical information.
- Preserve uncertainty markers (e.g., "approximately", "user reported").
- Keep medical terms accurate.
- reviewedByUser: boolean.`;

    const schemaPrompt = `Output must be valid JSON matching this schema (TranslationResult):
{
  "type": "object",
  "properties": {
    "content": { "type": "string" },
    "sourceLanguage": { "type": "string" },
    "targetLanguage": { "type": "string" },
    "reviewedByUser": { "type": "boolean" }
  },
  "required": ["content", "sourceLanguage", "targetLanguage", "reviewedByUser"]
}`;

    const userPrompt = `Translate this content from ${input.sourceLanguage} to ${input.targetLanguage}:

${input.content}

${input.context ? `Context: ${input.context}` : ""}

${schemaPrompt}`;

    const response = await this.callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const content = response.choices[0]?.message?.content || "{}";
    const validatedContent = await this.validateAndSanitizeOutput(content, "translateCommunication");
    return parseAIResponse<TranslationResult>(validatedContent, "TranslationResult");
  }

  async analyzeDocument(input: DocumentInput): Promise<DocumentAnalysis> {
    const systemPrompt = `You are a medical document analyzer. Extract structured information from the document text.

Rules:
- Extract ONLY what is explicitly in the document.
- Do not interpret lab values as normal/abnormal unless the document explicitly states so.
- Preserve exact values, units, and reference ranges.
- Identify: impressions, findings, recommendations, medications, measurements.
- Flag uncertainty where the document is unclear.`;

    const schemaPrompt = this.schemaToPrompt(DocumentAnalysisSchema, "DocumentAnalysis");

    const userPrompt = `Analyze this document:

Filename: ${input.filename}
MIME type: ${input.mimeType}
Text content:
${input.text}

${schemaPrompt}`;

    const response = await this.callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const content = response.choices[0]?.message?.content || "{}";
    const validatedContent = await this.validateAndSanitizeOutput(content, "analyzeDocument");
    return parseAIResponse<DocumentAnalysis>(validatedContent, "DocumentAnalysis");
  }

  async generateInsights(input: InsightInput): Promise<StoryInsight[]> {
    const systemPrompt = `You are a health story insight generator. Generate insights based on the user's recorded data.

Rules:
- Generate insights ONLY from the provided data.
- Do not infer medical conditions, risks, or treatments.
- Insights must be factual observations about patterns in the user's data.
- Each insight must reference its source data (event IDs, document IDs, etc.).
- Do not generate diagnostic or predictive insights.
- Output must be a valid JSON array of insight objects with: type, title, description, severity, sourceRefs.`;

    const schemaPrompt = `Output must be a valid JSON array where each element matches this schema:
{
  "type": "object",
  "properties": {
    "type": { "type": "string", "enum": ["pattern", "gap", "trend", "correlation", "reminder"] },
    "title": { "type": "string" },
    "description": { "type": "string" },
    "severity": { "type": "string", "enum": ["info", "low", "medium", "high"] },
    "sourceRefs": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["type", "title", "description", "severity", "sourceRefs"]
}`;

    const userPrompt = `Generate insights from this health story data:

Events: ${JSON.stringify(input.events)}
Documents: ${JSON.stringify(input.documents)}
Follow-ups: ${JSON.stringify(input.followUps)}
Questions: ${JSON.stringify(input.questions)}
Graph nodes: ${JSON.stringify(input.graphNodes)}
Graph edges: ${JSON.stringify(input.graphEdges)}
Recent changes: ${JSON.stringify(input.recentChanges)}

${schemaPrompt}`;

    const response = await this.callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const content = response.choices[0]?.message?.content || "[]";
    const validatedContent = await this.validateAndSanitizeOutput(content, "generateInsights");
    return parseAIResponse<StoryInsight[]>(validatedContent, "StoryInsight[]");
  }
}

// ============================================================
// Provider Factory (updated)
// ============================================================

let currentProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!currentProvider) {
    const aiProvider = process.env.AI_PROVIDER?.toLowerCase();
    const aiApiKey = process.env.AI_API_KEY?.trim();

    if (aiProvider && aiApiKey) {
      const model = process.env.AI_MODEL?.trim();
      const baseUrl = process.env.AI_BASE_URL?.trim();
      const timeoutMs = process.env.AI_TIMEOUT_MS
        ? parseInt(process.env.AI_TIMEOUT_MS, 10)
        : 60_000;

      if (aiProvider === "xai") {
        // xAI / Grok — OpenAI-compatible API at a custom base URL
        console.log(`[AI] Initializing xAI/Grok provider with model: ${model || "grok-3-mini"}`);
        currentProvider = new OpenAIProvider({
          apiKey: aiApiKey,
          model: model || "grok-3-mini",
          baseUrl: baseUrl || "https://api.x.ai/v1",
          timeoutMs,
        });
      } else if (aiProvider === "groq") {
        // Groq Cloud — OpenAI-compatible API, very fast inference
        console.log(`[AI] Initializing Groq provider with model: ${model || "llama-3.3-70b-versatile"}`);
        currentProvider = new OpenAIProvider({
          apiKey: aiApiKey,
          model: model || "llama-3.3-70b-versatile",
          baseUrl: baseUrl || "https://api.groq.com/openai/v1",
          timeoutMs,
        });
      } else if (aiProvider === "openai") {
        console.log(`[AI] Initializing OpenAI provider with model: ${model || "gpt-4o-mini"}`);
        currentProvider = new OpenAIProvider({
          apiKey: aiApiKey,
          model: model || "gpt-4o-mini",
          baseUrl: baseUrl || "https://api.openai.com/v1",
          timeoutMs,
        });
      } else {
        throw new Error(
          `Unsupported AI_PROVIDER: "${aiProvider}". Supported values: xai, groq, openai`
        );
      }
    } else {
      // No key configured → safe demo/mock mode.
      // In production this is a warning, not an error, so the app still starts
      // and a human can diagnose the missing env var.
      const isProduction = process.env.NODE_ENV === "production";
      if (isProduction) {
        console.warn(
          "[AI] WARNING: AI_PROVIDER/AI_API_KEY not configured in production. " +
          "Falling back to mock provider — real AI features will not work."
        );
      } else {
        console.log(
          "[AI] No AI_API_KEY set → running in demo/mock mode. " +
          "Set AI_PROVIDER=xai and AI_API_KEY in .env to enable Grok."
        );
      }
      currentProvider = new MockAIProvider();
    }
  }
  return currentProvider;
}

export function setAIProvider(provider: AIProvider) {
  currentProvider = provider;
}

// ============================================================
// Context Builder (for relevant context retrieval)
// ============================================================

export interface AIContext {
  relevantEvents: ExtractedEvent[];
  relevantDocuments: HealthDocument[];
  relevantFollowUps: FollowUpEntry[];
  relevantQuestions: StoryQuestion[];
  userPreferences: Record<string, unknown>;
  sourceReferences: string[];
}

export async function buildAIContext(
  storyId: string,
  query: string,
  options: { maxEvents?: number; maxDocuments?: number } = {}
): Promise<AIContext> {
  // This would query the database for relevant context.
  // For now, return empty context - implementation depends on search/indexing.
  // The parameters are part of the public API and are kept for that reason.
  void storyId;
  void query;
  void options;
  return {
    relevantEvents: [],
    relevantDocuments: [],
    relevantFollowUps: [],
    relevantQuestions: [],
    userPreferences: {},
    sourceReferences: [],
  };
}

// ============================================================
// Cost Control
// ============================================================

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export function estimateCost(provider: string, model: string, inputTokens: number, outputTokens: number): CostEstimate {
  // Rough estimates per 1K tokens (USD)
  const pricing: Record<string, Record<string, { input: number; output: number }>> = {
    openai: {
      "gpt-4o": { input: 0.005, output: 0.015 },
      "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
      "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
    },
    anthropic: {
      "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
      "claude-3-haiku": { input: 0.00025, output: 0.00125 },
    },
  };

  const providerPricing = pricing[provider]?.[model] || { input: 0.001, output: 0.002 };
  const inputCost = (inputTokens / 1000) * providerPricing.input;
  const outputCost = (outputTokens / 1000) * providerPricing.output;

  return {
    inputTokens,
    outputTokens,
    estimatedCost: inputCost + outputCost,
  };
}

export function checkCostLimit(estimate: CostEstimate, limit: number = 1.0): boolean {
  return estimate.estimatedCost <= limit;
}
