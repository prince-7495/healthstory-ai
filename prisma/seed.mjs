/**
 * Stage 11 — database seed.
 *
 * Creates a self-consistent demo account + story (events, questions,
 * follow-up with item rows, audit entries, story versions) so the
 * application, the integrity checker and the judge walkthrough have
 * real data to run against. Idempotent: the previous seed rows are
 * removed (children cascade) and recreated.
 *
 * Safety guard: refuses to run unless DATABASE_URL points at a LOCAL
 * PostgreSQL instance — a seed script must never touch a shared or
 * production database.
 *
 * Run automatically by `prisma migrate reset`, or directly:
 *   node prisma/seed.mjs
 */
import { readFileSync, existsSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

/* ---------- load .env when run outside the Prisma CLI ---------- */
if (!process.env.DATABASE_URL) {
  const envPath = new URL("../.env", import.meta.url);
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}

/* ---------- localhost-only guard ---------- */
const url = process.env.DATABASE_URL ?? "";
if (!/^postgresql:\/\/[^/@]*@(127\.0\.0\.1|localhost)(:\d+)?\//i.test(url)) {
  const safe = url.replace(/\/\/[^/@]*@/, "//***@");
  console.error("[seed] Refusing to seed: DATABASE_URL is not a local PostgreSQL instance.");
  console.error(`[seed] DATABASE_URL = ${safe || "(unset)"}`);
  process.exit(1);
}

const DEMO_USER_ID = "seed_user_demo";
const DEMO_STORY_ID = "seed_story_demo";
const DEMO_EMAIL = "demo@healthstory.local";
const DEMO_PASSWORD = "DemoStory123!";

const prisma = new PrismaClient();

async function main() {
  // Idempotent: cascade removes story/events/questions/follow-ups,
  // audit rows and sessions belonging to the seed user.
  await prisma.user.deleteMany({ where: { id: DEMO_USER_ID } });

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: DEMO_USER_ID,
        email: DEMO_EMAIL,
        displayName: "Demo User",
        passwordHash: await hash(DEMO_PASSWORD, 12),
        authProvider: "email",
        status: "ACTIVE",
      },
    });

    // currentVersion 2 matches the two version rows below.
    const story = await tx.story.create({
      data: {
        id: DEMO_STORY_ID,
        userId: user.id,
        title: "My health story",
        language: "en",
        currentVersion: 2,
      },
    });

    await tx.storyVersion.createMany({
      data: [
        {
          storyId: story.id,
          versionNumber: 1,
          changeReason: "INITIAL_CREATION",
          createdBy: user.id,
          source: "seed",
        },
        {
          storyId: story.id,
          versionNumber: 2,
          changeReason: "FOLLOW_UP",
          createdBy: user.id,
          source: "seed",
          metadata: { note: "seed data loaded" },
        },
      ],
    });

    await tx.storyEvent.createMany({
      data: [
        {
          id: "seed_event_1",
          storyId: story.id,
          title: "Started daily inhaler",
          category: "MEDICATION",
          description: "Started a low-dose daily inhaler after the spring check-up.",
          date: new Date("2026-04-02T00:00:00.000Z"),
          datePrecision: "EXACT",
          dateText: "2 Apr 2026",
          frequency: "Once daily",
          createdBy: "AI",
          status: "AI_ORGANIZED",
          confirmedByUser: false,
          needsConfirmation: true,
          extractionConfidence: "HIGH",
        },
        {
          id: "seed_event_2",
          storyId: story.id,
          title: "Spirometry test",
          category: "TEST",
          description: "Breathing test (spirometry) at the clinic; results reviewed the same day.",
          date: new Date("2026-04-02T00:00:00.000Z"),
          datePrecision: "EXACT",
          dateText: "2 Apr 2026",
          createdBy: "AI",
          status: "USER_CONFIRMED",
          confirmedByUser: true,
          needsConfirmation: false,
          extractionConfidence: "MEDIUM",
        },
        {
          id: "seed_event_3",
          storyId: story.id,
          title: "Wheeze after climbing stairs",
          category: "SYMPTOM",
          description: "Occasional wheeze when climbing stairs quickly, relieved by resting.",
          date: new Date("2026-06-18T00:00:00.000Z"),
          datePrecision: "MONTH",
          dateText: "June 2026",
          createdBy: "USER",
          status: "USER_REPORTED",
          confirmedByUser: false,
          needsConfirmation: false,
        },
      ],
    });

    await tx.storyQuestion.createMany({
      data: [
        {
          id: "seed_question_1",
          storyId: story.id,
          userId: user.id,
          text: "Could the wheeze be related to the new inhaler?",
          source: "USER",
          status: "OPEN",
        },
        {
          id: "seed_question_2",
          storyId: story.id,
          userId: user.id,
          text: "When is the next spirometry check-up due?",
          source: "AI_SUGGESTED",
          status: "DISCUSSED",
        },
      ],
    });

    await tx.followUpEntry.create({
      data: {
        id: "seed_followup_1",
        storyId: story.id,
        userId: user.id,
        type: "APPOINTMENT",
        originalText: "Follow-up appointment on 15 September 2026 to review inhaler and repeat spirometry.",
        eventDate: new Date("2026-09-15T00:00:00.000Z"),
        eventDatePrecision: "EXACT",
        language: "en",
        status: "AI_ORGANIZED",
        extractedItems: [
          { type: "APPOINTMENT", text: "Follow-up appointment 15 September 2026", confidence: "HIGH" },
          { type: "TEST", text: "Repeat spirometry at the follow-up", confidence: "MEDIUM" },
        ],
        items: {
          create: [
            {
              type: "APPOINTMENT",
              text: "Follow-up appointment 15 September 2026",
              sourceText: "Follow-up appointment on 15 September 2026",
              sourceType: "FOLLOW_UP",
              confidence: "HIGH",
              status: "AI_ORGANIZED",
            },
            {
              type: "TEST",
              text: "Repeat spirometry at the follow-up",
              sourceText: "repeat spirometry",
              sourceType: "FOLLOW_UP",
              confidence: "MEDIUM",
              status: "AI_ORGANIZED",
            },
          ],
        },
      },
    });

    await tx.auditLog.createMany({
      data: [
        { userId: user.id, storyId: story.id, action: "STORY_CREATED", resourceType: "STORY", resourceId: story.id },
        { userId: user.id, storyId: story.id, action: "EVENT_CREATED", resourceType: "EVENT", resourceId: "seed_event_1", metadata: { count: 3 } },
        { userId: user.id, storyId: story.id, action: "QUESTION_CREATED", resourceType: "QUESTION", resourceId: "seed_question_1" },
        { userId: user.id, storyId: story.id, action: "FOLLOW_UP_ADDED", resourceType: "FOLLOW_UP", resourceId: "seed_followup_1", metadata: { itemCount: 2 } },
      ],
    });

    console.log("[seed] Created demo user:    " + DEMO_EMAIL);
    console.log("[seed] Password:            " + DEMO_PASSWORD);
    console.log("[seed] Story:               " + story.id + " (1 story, 3 events, 2 questions, 1 follow-up, 2 versions)");
    console.log("[seed] Integrity check:     GET /api/stories/" + story.id + "/integrity");
  });
}

main()
  .catch((e) => {
    console.error("[seed] Failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
