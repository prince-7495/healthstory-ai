# HealthStory AI — Stages 1–11

> **Your health has a story. We help you make sense of it.**

HealthStory AI is a health-tech competition product built across 13 stages.
Stages 1–11 are implemented: the landing page, the workspace, the AI-organized
timeline with change detection, the **doctor-ready health summary**, the
longitudinal **HealthStory Journal**, **Conversation Mode** — a global
communication bridge — Follow-Up + Care Continuity, Understand My Health
Information, the **HealthStory Intelligence Map** for seeing the story as a
whole while keeping every source honest, the Stage 10 **backend
architecture** — real PostgreSQL persistence, session auth, a typed REST API,
an AI safety layer, and a provider abstraction — and the Stage 11
**database engineering & security** layer: migrations, transactions,
strict request validation, rate limiting, private file storage, revocable
sessions, an audit trail and the Story Integrity checker.

HealthStory AI turns fragmented health information — scattered symptoms, notes,
dates, medications, test results, in different languages — into one structured,
understandable health timeline that a person can actually discuss with a
healthcare professional.

| Stage | Where | What it is |
| --- | --- | --- |
| 1 | `/` | Public landing page |
| 2 | `/workspace` (Tell / Organize) | Type/paste/upload, organize, read your story |
| 3 | `/workspace` (Understand) | Interactive timeline, evidence, What Changed?, human confirmation |
| 4 | `/workspace` (Prepare) | Doctor-ready **Health Summary**, questions, review, selective sharing |
| 5 | `/my-story` (Continue) | Longitudinal **HealthStory Journal** — updates, story evolution, snapshots, search |
| 6 | `/my-story` → Conversation | **Conversation Mode** — communication draft, questions, evidence, language bridge, print |
| 7 | `/my-story` → Follow-Up | **Follow-Up + Care Continuity** — what happened after the conversation |
| 8 | `/my-story` → Understand | **Understand My Health Information** — document library, plain-language explanation, connect to story |
| 9 | `/my-story` → Insights | **HealthStory Intelligence Map** — story graph, evidence, questions & review, story completeness |
| 10 | `/api/*` | **Backend architecture** — PostgreSQL + Prisma, session auth, typed REST API, AI safety layer, AI provider abstraction |
| 11 | `/security` + `/api/*` | **Database engineering & security** — migrations, transactions, strict validation, rate limits, private files, revocable sessions, audit trail, integrity checker |

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm run start   # production build + preview
npm run lint                     # eslint
```

### Database (Stage 10) & migrations (Stage 11)

The API routes need a PostgreSQL database and a `DATABASE_URL`
(template in `.env.example`):

```bash
# .env
DATABASE_URL="postgresql://postgres@127.0.0.1:15433/healthstory"

npx prisma migrate status   # are all migrations applied?
npm run db:seed             # seed the demo user + story (localhost only)
npm run db:reset            # DROP + migrate + seed (destructive, confirms)
npm run db:generate         # prisma generate — regenerate the client
npm run db:studio           # prisma studio — inspect data (optional)
```

Migrations live in `prisma/migrations/` (baseline `0_init` plus the
Stage 11 security migrations) — see `DATABASE.md`. `prisma db push`
remains available for throwaway experiments, but committed schema
changes go through migrations. The frontend
(journal, workspace) still runs entirely in the browser on `localStorage`; the
database backs the API routes only. Without a reachable database the UI works
as before and API routes return a clean error — nothing fake is substituted.

The three static routes (`/`, `/workspace`, `/my-story`) remain **fully
statically prerendered** (`○ Static`). `/workspace` ships as a client component
bundle because the whole experience is in-browser state.

---

## Stage 2 — the workspace (`/workspace`)

The landing page's `Start Your Health Story →` CTA now leads to a real,
working application rather than a dead anchor.

### The seam

Everything the UI knows about "analyzing" a story lives behind one function:

```ts
analyzeHealthStory(story, onStage?): Promise<OrganizedStory>   // paced, narrated
previewOrganizedStory(story): OrganizedStory                   // sync, live preview
```

Both satisfy the `StoryAnalyzer` interface in `src/lib/health/types.ts`.
Stage 2 ships a **real deterministic rule-based extractor** that genuinely parses
the user's text — sentence splitting, symptom detection, date grammar, frequency
and change extraction. It is **not** canned output: different input produces
different output.

It is also **not** an AI model, and the UI says so plainly — the result header
reads *"Local rule-based extraction"*. **Stage 3 replaces the body of
`analyzeHealthStory` with a call to a server route; the UI does not change.**

### Honesty at the analysis boundary

| Rule | How it is enforced |
| --- | --- |
| Never invent dates | The extractor only records dates present in the text; uncertainty is preserved as `~July 2026`, never sharpened |
| No diagnosis language | Questions are written to the user as prompts for their own story, never "you may have…" |
| Documents are not analysed | Uploaded files are shown as **"Document added"** — never "AI analyzed" |
| Voice is honest | Real `SpeechRecognition` when the browser has it; otherwise a clearly labelled **demo waveform** that never claims a microphone was used |
| Demo data is labelled | One-click demo is badged **"Fictional demo data"** |
| Language support is honest | Only English is supported; every other option is explicitly marked unsupported |
| Engine is labelled | `isRealModel: false` surfaces in the UI as "Local rule-based extraction" |

### Two entry points, one result

The live preview calls the sync extractor through `useMemo` on every keystroke,
and the `Organize My Story` button calls the async one. Both produce identical
output because both go through the same functions — including the structured
panel, which reuses the free-text date grammar so precision labels never diverge.

### State machine

`data-phase` on the root drives everything: `EMPTY → EDITING → HAS_INPUT →
PROCESSING → RESULT / ERROR`, with `data-view` and `Step N of 3` for orientation.

### Privacy

Health text is held **in memory only** — no `localStorage`, no cookies, nothing
persisted. Reloading the page discards the story.

---

## Stack

| Choice | Why |
| --- | --- |
| **Next.js 16 (App Router)** | Route-based structure that can grow into the real product; built-in server API routes so AI keys stay off the client in later stages. |
| **TypeScript** | Later stages define health-event types, so the model gets typed from Stage 1. |
| **Custom CSS (design tokens + CSS Modules)** | Hand-written, so the result reads as a designed product rather than a template. No UI or animation libraries. |
| **Zero dependencies beyond React** | No icon pack, no animation library, no Tailwind. Every icon is a hand-written SVG. |
| **IntersectionObserver + CSS** | All entrance animations come from one shared observer and plain CSS transitions. |

Fonts (Plus Jakarta Sans + Inter) are self-hosted and subset by `next/font`, so
there is no render-blocking request to Google.

---

## Structure

```text
src/
├─ app/
│  ├─ layout.tsx            fonts, metadata, skip-link, no-JS fallback
│  ├─ page.tsx             narrative composition of all sections
│  ├─ globals.css          design tokens, reset, primitives, motion
│  ├─ workspace/
│  │  └─ page.tsx          ★ Stage 2 route (server component, robots: noindex)
│  └─ icon.svg             brand mark favicon
├─ components/
│  ├─ Navbar.tsx           floating bar, compacts on scroll, mobile menu
│  ├─ Hero.tsx             judge-first first screen
│  ├─ HealthStoryVisualization.tsx   ★ hero timeline + AI insight panel
│  ├─ ProblemSection.tsx
│  ├─ TransformationSection.tsx       ★ "wow" moment (scattered → AI → structured)
│  ├─ SolutionSection.tsx  product mockup, one chronological stream
│  ├─ HowItWorks.tsx       4 steps + Input → AI → Timeline → Understanding
│  ├─ ChangeDetectionPreview.tsx       ★ signature "What Changed?"
│  ├─ GlobalAccessibility.tsx   multilingual concept (interactive tabs)
│  ├─ HumanCenteredSection.tsx
│  ├─ SafetySection.tsx
│  ├─ PrivacySection.tsx
│  ├─ FinalCTA.tsx         closing CTA + "how your story begins" panel
│  ├─ Footer.tsx
│  ├─ Reveal.tsx           shared IntersectionObserver entrance primitive
│  ├─ icons.tsx            hand-drawn SVG icon set
│  ├─ *.module.css         one stylesheet per component group
│  └─ workspace/           ★ Stage 2
│     ├─ HealthStoryApp.tsx   orchestrator: data-phase / data-view state machine
│     ├─ StoryInput.tsx       textarea, quick prompts, character counter
│     ├─ EventCard.tsx        add an event by hand
│     ├─ DocumentDrop.tsx     upload → "Document added"
│     ├─ VoiceInput.tsx       real SpeechRecognition or labelled demo waveform
│     ├─ LanguageSelect.tsx   English + explicitly unsupported others
│     ├─ ActionBar.tsx        fixed bottom bar, validation, submit
│     ├─ StoryPreview.tsx     live organized preview
│     ├─ ProcessingView.tsx   5 real pipeline stages
│     ├─ StoryResult.tsx      timeline, changes, details, questions, gaps
│     ├─ ErrorState.tsx
│     └─ workspace.module.css
└─ lib/
   ├─ content.ts           ★ all Stage 1 copy + demo data
   └─ health/              ★ Stage 2
      ├─ types.ts          HealthStory, HealthEvent, StoryDetails, StoryAnalyzer
      ├─ options.ts        all Stage 2 copy, prompts, languages, messages
      ├─ dates.ts          shared date formatting + precision labels
      ├─ analyzeHealthStory.ts  ★ the extraction engine + the Stage 3 seam
      └─ demo.ts           DEMO_STORY_TEXT, createDemoStory()
```

`src/lib/content.ts` holds every Stage 1 string and demo datum;
`src/lib/health/options.ts` does the same for Stage 2. Copy and demo data are
separated from UI so later stages can swap demonstration data for real
extraction output without touching a single component.

---

## Page narrative (judge-first)

1. **Hero** — name, promise, one-paragraph explanation, CTA, timeline preview
2. **Problem** — healthcare information is scattered (4 cards)
3. **Transformation** — scattered information → AI → structured health story
4. **Product** — one story, one timeline, a clearer picture
5. **How it works** — four steps with an animated flow
6. **What Changed?** — the signature feature: before vs recent + notable changes
7. **Languages** — healthcare has no single language
8. **Human-centered** — understand, remember, communicate
9. **Safety** — supports, never replaces, professionals
10. **Privacy** — three design principles
11. **Final CTA** — start your health story

---

## Trust & honesty rules honoured

The product never claims to diagnose, predict, or certify anything.

- Every visualisation is labelled **Product preview / Sample data / Concept**
- The demo subject is **"Alex"**, a fictional person. No real patient data.
- Every mention of "diagnosis" is a **negation** ("does not diagnose them",
  "not a substitute for professional medical advice")
- **No** "detects disease", "cures", "guaranteed", "95% accurate", "saves lives"
- **No** fabricated certifications — no HIPAA / GDPR / "100% secure" claims;
  the privacy section states explicitly that these are design principles
- Directional data never relies on colour alone — each bar pairs an arrow icon
  with the word "increased" / "decreased" / "changed"
- Language support is presented as **future product direction**, not a
  shipped feature, with a note saying support ships only where a model is verified
- The final CTA states plainly that this stage is the landing page and that
  nothing on the page is pretending to be live AI

---

## Verification

### Stage 1 — landing page

| Check | Result |
| --- | --- |
| Lighthouse Accessibility | **100** |
| Lighthouse Best Practices | **100** |
| Lighthouse SEO | **100** |
| Horizontal overflow (320 → 1920px) | **none** at 9 widths |
| Entrance animations fired | **29 / 29** |
| Console errors / warnings | **0** |
| Broken internal links | **0** |
| WCAG AA text contrast | **all text passes** |
| Touch targets < 32px | **none** |
| `<h1>` count | **1** (logical heading order throughout) |
| Lint / TypeScript | **clean** |

Accessibility specifics: skip link, semantic landmarks, visible focus rings,
`aria-label` / `aria-expanded` / `aria-controls` on the menu and CTA, roving
`tablist` with arrow-key support on the language tabs, `sr-only` descriptions on
data bars, `aria-hidden` on all decorative icons, RTL rendering for Arabic.

Performance & resilience: no layout shift, no web fonts from a third party, no
libraries, animations via one observer, `prefers-reduced-motion` honoured in 7
places, and a `<noscript>` fallback so content is never trapped invisible if
JavaScript is unavailable.

### Stage 2 — workspace

| Check | Result |
| --- | --- |
| Horizontal overflow (320 → 1920px) | **none** at 14 widths |
| Console errors / warnings | **0** |
| Fixed action bar clearance at end of page | **positive** at all 14 widths (23–74px slack) |
| Focus ring on textarea / select | 4px brand ring, pill radii preserved |
| Empty submit | "Tell us a little about what you've noticed first." |
| Short submit | "Add a little more detail so we can organize your story." |
| Error announcement | single `role="alert"`, `aria-invalid`, `aria-errormessage`, focus moved to the textarea |
| Full flow | demo → organize → processing (Step 2 of 3) → result (Step 3 of 3) → edit (text preserved, focus restored, Step 1 of 3) |
| Prose-only path | cough + dizziness → "Approximate date: ~March 2026" |
| `prefers-reduced-motion` | live dot `blink` 2.1s → `none`; mic `ripple` 1.9s → `none`; step `spin` 0.9s → `none` |
| WCAG AA contrast | all new surfaces pass, incl. amber gaps, action error, badges, error icon |
| Lint / TypeScript | **clean** |

Accessibility specifics: `role="alert"` used exactly once so the message is not
announced twice, `aria-errormessage` wires the textarea to it, focus is moved to
the invalid field and restored on return, the action bar reserves its own height
so it can never cover content, and every decorative icon is `aria-hidden`.

---

## Stage 4 — Doctor-ready health summary (`Prepare`)

Stage 4 turns the user's **confirmed** Stage 3 story into a clear communication
package. The signature feature is **Prepare for a Healthcare Conversation**:

> Your story is organized. Now turn it into a clear summary you can review and
> discuss with a healthcare professional.

It is reached from the Stage 3 analysis screen with **Prepare My Summary**.

### What it produces

A `HealthSummary` document with:

- **Main concern** — one reporting-language paragraph
- **Timeline** — compact, deduplicated, uncertainty preserved
- **Changes reported** — the Stage 3 changes, each still linked to its evidence
- **Other information mentioned** — medication, treatment, tests, appointments, lifestyle
- **Questions to discuss** — neutral prompts, editable, removable, or user-added
- **Information not provided** — gaps, never filled with guesses
- **Conversation Prep** — a glanceable card for the appointment itself

### The rules it enforces

| Brief rule | How it is enforced |
| --- | --- |
| Use confirmed information | Built from the events the user reviewed; `REMOVED` events never appear |
| Never add facts / dates / causes | Deterministic generator; every statement derives from an event or a change |
| Keep uncertainty | Approximate dates stay approximate; missing stays "not provided" |
| Missing ≠ negative | `CategoryPolarity` distinguishes `REPORTED` / `NONE_REPORTED` / `NOT_MENTIONED` in the type system |
| Traceability | Every section keeps `sourceEventIds`; **View source** opens a drawer with the user's own words |
| Human control | Edit main concern, remove/restore sections, edit/remove/add questions, add notes, restore the original draft |
| Not a chatbot | Story → structure → timeline → change → summary; no chat loop, no doctor avatar |
| No automatic transmission | Copy / download / print / native share only, each explicitly user-initiated, after a review checklist |

### State machine

`PREPARING_SUMMARY → SUMMARY_DRAFT → USER_REVIEW → REVIEWED → EXPORT_PREVIEW`,
with `SUMMARY_ERROR → RETRY`. An `AbortController` cancels generation on unmount.

### Stage 4 files

```text
src/lib/health/summary.ts                     generator, editing, diff, export, sources
src/components/workspace/summary/
  SummaryExperience.tsx                       orchestrator + state machine
  SummaryPreparing.tsx                        assembly animation + skeleton
  SummarySections.tsx                         main 65% column
  SummarySidePanel.tsx                        35% side column
  SummaryQuestions.tsx                        editable / user-added questions
  SummaryReview.tsx                           review checklist (not a legal attestation)
  SummarySharing.tsx                          selective sharing + preview
  SummarySourceDrawer.tsx                     evidence drawer
  ConversationPrep.tsx                         appointment-prep card
  summary.module.css                          Stage 4 styles (design tokens reused)
```

The generator is deterministic and says so: `engine.isRealModel === false` and
the UI reads *"Organized from your reviewed story"*. A real model can replace the
body of `generateHealthSummary()` without touching any component.

### Stage 4 verification

| Check | Result |
| --- | --- |
| Full flow (demo → organize → timeline → Prepare → summary) | **works**, no console errors |
| Source drawer opens and closes on `Escape` | **pass** |
| `Make clearer` adds no facts and is idempotent | **pass** |
| Review checklist gates **Export Summary** | **pass** (enabled only when all boxes checked) |
| Section removal + restore | **pass** |
| Add question (badged "Added by you") | **pass** |
| Selective-sharing preview | **pass** |
| TypeScript / ESLint / production build | **clean** (0 errors) |

---

## Stage 5 — HealthStory Journal (`Continue` step of `/my-story`)

Stage 5 turns HealthStory AI from a one-time tool into a **longitudinal health
companion**. The user returns, adds updates, and watches their story evolve.

> **Your health story doesn't stop after one appointment.** → Continue →
> Compare over time → Update your story.

The signature flow is:

```text
TELL → ORGANIZE → UNDERSTAND → PREPARE → CONTINUE → COMPARE OVER TIME → UPDATE YOUR STORY
```

### What Stage 5 adds

- **My Health Story dashboard** — overview statistics (updates, topics, first/last
  entry), a searchable/filterable timeline, and quick actions. No health score,
  streak or gamified metric anywhere.
- **Add an Update** — natural-language entry with organizational quick chips and a
  visible processing pipeline (Reading → Comparing → Finding → Organizing →
  Identifying changes → Updating).
- **Update comparison engine** — compares the new update only against relevant
  prior events and emits evidence-backed comparisons (`more_frequent`,
  `less_frequent`, `improved`, `worsened`, `started`, `stopped`, `continued`,
  `new_information`) with **both** source phrases.
- **Story Evolution** — a before → after card with **View evidence**, and
  **Confirm / Edit / Dismiss**. Dismissed comparisons are never treated as an
  established change.
- **Contradiction & correction handling** — "I have never had headaches" after a
  headaches entry is surfaced as *"Information may need clarification"* with both
  entries and Keep Earlier / Keep Later / Add Clarification. Nothing is silently
  overwritten.
- **No-change restraint** — an update with no explicit change reports *"No clear
  change detected"* rather than inventing one.
- **Topic History** — click any topic for its first/last mention, every source
  entry, the changes reported, and co-mentioned topics (never causes).
- **Snapshots** — save a point-in-time story and compare two snapshots.
- **Summary status & versioning** — Up to date / New information available,
  Update Summary creates a new version while keeping previous ones; export uses
  the reviewed version.
- **Story Memory & privacy** — user-controlled toggles (save updates, keep
  summaries, save evidence, demo mode), local-first storage ("stored on this
  device for this prototype"), and an obvious Delete My Story flow.

### Reusing Stages 3–4

Stage 5 does **not** invent parallel event or summary types. Journal events are
`AnalyzedEvent`s from Stage 3, and journal summaries are Stage 4 `HealthSummary`
objects built through the same generator. The engine adds *longitudinal* logic on
top: entries, stable topics, evolution, contradictions, snapshots, search.

### Local-first storage

The journal is stored in the browser's `localStorage` on the user's own device,
so a reload restores the story (*"Your story is ready to continue."*). Nothing is
sent to a server. This claim is shown in the UI only because it is true; if
storage is unavailable the app says so and falls back to a session-only journal.

### Handoff from the workspace

Stage 4's final screen has **Continue in My Story**, which carries the confirmed
story into `/my-story` (via an in-memory → localStorage handoff) and organizes it
as the journal's first entry.

### Stage 5 files

```text
src/lib/journal/
  types.ts      journal, entries, topics, evolutions, snapshots, preferences
  options.ts    all Stage 5 copy + quick-update chips
  engine.ts     extraction, topic matching, evolution/conflict detection,
                search, filters, patterns, topics, snapshots, summary status
  storage.ts    local-first persistence + workspace handoff
  demo.ts       fictional March–June story (the July update is the live demo)
src/components/journal/
  StoryJournalApp.tsx      orchestrator + persistence + flows
  AddUpdate.tsx            input, chips, processing pipeline
  UpdateResult.tsx         Story Updated + evolution cards + confirm/edit/dismiss
  JournalOverview.tsx      overview stats + quick actions
  JournalEvolutions.tsx    persistent what-changed record
  JournalInsights.tsx      Story Evolution viz, patterns, activity
  JournalTimeline.tsx      search + date/category filters + timeline
  JournalSummary.tsx       summary status + versions + export
  JournalSnapshots.tsx     create + compare snapshots
  JournalSettings.tsx      Story Memory, privacy, delete story
  TopicHistoryDrawer.tsx   topic history + evidence
  journal.module.css       Stage 5 styles (design tokens reused)
```

### Safety rules honoured

No diagnosis, no disease prediction, no health score, no treatment
recommendation, no inferred improvement/worsening (only the user's own wording),
no causality (co-mentioned topics are labelled as such), no gamification, and no
automatic transmission. The AI detects; the human verifies.

### Stage 5 verification

| Check | Result |
| --- | --- |
| Demo (March–June) loads with topic/evolution output from the real engine | **pass** |
| Add update → Frequency "More frequent → Less frequent" + Sleep "Reduced → More" | **pass** |
| Confirm changes → timeline updates → summary "New information available" | **pass** |
| Update Summary → v2 created, v1 kept, status returns to "Up to date" | **pass** |
| Contradiction ("I have never had headaches") → clarification with both entries | **pass** |
| No-change update → "No clear change detected", nothing invented | **pass** |
| Search, date/category filters, topic-history drawer (+ Escape) | **pass** |
| Snapshot create + compare | **pass** |
| Persistence across reload; Delete My Story | **pass** |
| No horizontal overflow on a narrow viewport | **pass** |
| Console errors during the full flow | **0** |
| TypeScript / ESLint / production build | **clean** (0 errors) |

---

## Stage 6 — Conversation Mode (global communication bridge)

Stage 6 answers *"How do I communicate this story clearly to another person?"*
It turns the confirmed HealthStory into a concise, structured, human-readable
communication draft.

The flow is:

```text
MY HEALTH STORY → SELECT WHAT I WANT TO SHARE → CHOOSE LANGUAGE / FORMAT
   → COMMUNICATION PREVIEW → REVIEW → USE IN A CONVERSATION
```

It is reached from **My Health Story → Communication → Generate Conversation
Summary** (or Practice My Story / View Questions).

### What Stage 6 adds

- **Conversation setup** — choose what to prepare (full story, recent changes, a
  specific topic, questions, recent timeline, summary only), then privacy-first
  share choices (timeline, changes, context, summary, questions, older entries,
  source evidence). AI-organized items the user has not confirmed are excluded by
  default.
- **Communication styles** — Quick, Standard, Detailed; plus tone (Calm / Direct /
  Simple / Clear & structured), point of view (first person / neutral) and a
  **Simplify Language** (plain-language) toggle.
- **Conversation Summary** — a structured draft with *What I noticed*, *When it
  started*, *How it changed*, *Relevant context*, *Recent update*, *Questions* and
  *Information not recorded*.
- **One-Minute Story** — a short spoken-style version, with an honest note that
  speaking time varies.
- **Conversation View** — large-type cards for glancing at during a conversation,
  with an arrow flow from what was noticed → how it changed → recently.
- **Evidence & explainability** — every line carries its source event ids; *View
  source* shows the exact phrases and *Why is this included?* explains the origin.
  No internal chain-of-thought is ever shown.
- **Question manager** — add, edit, delete, reorder, and mark questions discussed.
  AI-suggested questions are visually distinct, and HealthStory AI never answers a
  medical question.
- **Language bridge** — English is fully implemented. **Hindi and Gujarati ship as
  a clearly labelled prototype**: the draft is generated *directly from the
  structured story* in the chosen language using a curated dictionary (never by
  translating a generated English summary, which causes drift). Wording that
  cannot be mapped safely stays in the original language and is flagged. A
  **Side-by-side** view shows the English reference next to the communication
  version. Spanish/French/Arabic are listed only as planned.
- **Output validator** — a safety layer rejects diagnostic, causal or treatment
  wording and reports the result in the UI.
- **Final review + export** — a review checkbox gates "Use This Version"; Copy,
  Print and Save-as-PDF produce a document headed *HealthStory Conversation
  Summary* with the standing disclaimer.
- **Rehearsal mode** — "Practice My Story" steps through the draft one section at
  a time as communication coaching, ending with "Conversation Ready" (not a
  medical readiness score).

### Reusing Stages 3–5

Conversation Mode reuses the Stage 3 `AnalyzedEvent`s, the Stage 5 `StoryEvolution`
comparisons and the Stage 5 question model. Nothing is re-extracted and no new
narrative is invented: the draft is an organization of the user's confirmed data.

### Stage 6 files

```text
src/lib/communication/
  types.ts       communication session, draft, selection, validation types
  options.ts     all Stage 6 copy
  languages.ts   language list + English/Hindi/Gujarati dictionaries
  engine.ts      context builder, draft generation, questions, validation, export
src/components/communication/
  ConversationMode.tsx        orchestrator (selection → generate → review → final)
  ConversationSetup.tsx       focus, share, topic, period, style, language
  ConversationDraftView.tsx   summary/conversation/bridge views, evidence, edit, export
  QuestionManager.tsx         add/edit/delete/reorder/mark-discussed questions
  RehearsalMode.tsx           Practice My Story
  CommunicationCard.tsx       dashboard entry point
  communication.module.css    Stage 6 styles (design tokens reused)
```

### Safety rules honoured

No diagnosis, no disease prediction, no treatment advice, no medical scores, no
invented dates/facts/causes, no silent translation or modification of user
information, no automatic sharing, and no language claimed that is not actually
working.

### Stage 6 verification

| Check | Result |
| --- | --- |
| Conversation Mode: select → generate → review → final | **pass** |
| Quick / Standard / Detailed drafts; plain language; first person | **pass** |
| Evidence toggle + "Why is this included?" with source phrases | **pass** |
| Edit a line → "User edited" badge | **pass** |
| Regenerate (Clearer / Shorter / Simpler / More structured) keeps facts | **pass** |
| Language bridge: English ↔ Hindi ↔ Gujarati, labelled prototype | **pass** |
| Side-by-side + Conversation View + Practice My Story | **pass** |
| Questions: add / edit / delete / reorder / mark discussed; AI suggestions labelled | **pass** |
| Output validator reports a clean draft | **pass** |
| Final review gate + Copy / Print / Save-as-PDF | **pass** |
| Console errors during the full flow | **0** |
| TypeScript / ESLint / production build | **clean** (0 errors) |

---

## Notes for later stages

- **The only thing that changes is the body of `analyzeHealthStory`.** It already
  takes a `HealthStory` and returns an `OrganizedStory`; call a server route
  instead of the local extractor and the UI needs no edits.
- `isRealModel: false` is already threaded to the UI — flipping it to `true` is
  what turns the header from "Local rule-based extraction" into a real model label.
- Put the AI call in a **server route** (`src/app/api/...`) so keys never reach
  the client — never put an API key in a `"use client"` component.
- Keep `Promise` + `onStage` narration. A real model call is slow, and the staged
  progress copy in `options.PROCESSING` already matches a real pipeline.
- Uncertain dates must stay uncertain. The extractor's precision labels are the
  contract; a model must not sharpen them.
- Stage 1's `lib/content.ts` demo data is still used by the landing page
  visualisations; Stage 2 replaced it only inside the workspace.
- The three intended input paths (paste notes, add events by hand, upload
  documents) are all live in Stage 2.

---

## Stage 7 — Follow-Up + Care Continuity + Story Loop

Stage 7 closes the loop: **what happened after the conversation?**

> You recorded your story. You organized it. You tracked changes. You prepared to
> communicate. Now record what happened next — and carry your story forward.

The user can add a **Follow-Up** after an appointment, test, or conversation.
HealthStory AI organizes it, compares it with the existing story, and the user
reviews every item before it becomes part of the confirmed HealthStory.

### What Stage 7 adds

- **Follow-Up entry point** on the journal dashboard ("What happened next?") with
  an example pre-filled so a judge can try it instantly.
- **Natural-language input** (primary) plus optional structured chips: Date,
  Conversation with (professional / family / other), What happened, Information
  received, Questions that remain, What I want to remember.
- **Staged processing pipeline** (Reading → Identifying → Finding dates →
  Comparing → New information → Preparing) with an abortable `AbortController`.
- **Review screen** — every item grouped (New information / Information I received /
  Changes / Questions / Dates mentioned). Each item shows:
  - Attribution: *You reported being told* vs *You recorded* vs *From a document* —
    never the AI's own claim.
  - Extraction confidence (HIGH / MEDIUM / LOW), labelled extraction-only.
  - **Why was this added?** evidence panel quoting your original words.
  - Confirm / Edit / Remove buttons.
  - Topic match → Connect / Keep Separate (never auto-merged).
- **Conflicts** — when the follow-up contradicts an earlier entry, both statements
  are shown side by side with Keep Earlier / Keep Later / Add Clarification.
- **Corrections** — "I was wrong, actually…" surfaced as Apply Correction / Keep Both.
- **Apply to story** — confirmed items are carried into the journal:
  events added to the timeline, changes recorded as evolutions, questions added to
  the question list, the follow-up entry saved, activity logged, and the previous
  summary marked stale (Stage 5's status logic handles this automatically).
- **Story Updated banner** — Added/Updated diff, **Save Story Snapshot** button,
  and **Review Updated Summary** link (opens Stage 4's summary with new info).
- **Follow-Up History** — searchable, filterable (by type, date range), with
  inline detail view.
- **Follow-Up detail** — read-only view of a past follow-up: date, type, who,
  original words, all items with attribution and status, related topics.
- **Story Timeline** on the home screen — last 8 dated events with follow-up
  markers (brand dot).
- **Safety & emergency boundary** — same rules as Stage 5/6: no diagnosis, no
  scheduling, no urgency decision, no history deletion. Relative dates stay
  approximate ("approximately two weeks").

### Reusing Stages 3–6

Stage 7 **does not re-extract** health events. It calls the Stage 5
`analyzeUpdateSync` engine (which already extracts events, detects changes,
finds contradictions, matches topics) and then layers the follow-up-specific
extraction on top: event classification, attribution, relative dates, unresolved
questions, and the review step.

### Stage 7 files

```text
src/lib/journal/types.ts                     (extended with FollowUpEntry, FollowUpItem, InformationSource, etc.)
src/lib/health/types.ts                      (metadata field on HealthEvent)
src/lib/followup/
  engine.ts       classification, attribution, item extraction, create/apply/process, summary, filters, snapshot
  options.ts      all Stage 7 copy (incl. safety footer, emergency notice)
src/components/followup/
  FollowUpForm.tsx       type chips + natural language + structured fields
  FollowUpReview.tsx     review with groups, evidence, conflicts, topic match
  FollowUpMode.tsx       orchestrator (home / add / review / detail)
  FollowUpCard.tsx       dashboard entry point
  followup.module.css    Stage 7 styles (design tokens reused)
src/lib/journal/demo.ts                     (prior follow-up + DEMO_FOLLOWUP_TEXT)
```

### Safety rules honoured

No diagnosis, no result interpretation, no appointment scheduling, no urgency
judgement, no history erasure. Information the user was told is attributed, never
presented as the AI's claim. Relative dates remain approximate. The user reviews
and confirms every item before it enters the story.

### Stage 7 verification

| Check | Result |
| --- | --- |
| Add Follow-Up (example text) → Organize → Review | **pass** |
| Groups: New info / Information received / Changes / Questions / Dates | **pass** |
| Attribution tags (You reported being told / You recorded) | **pass** |
| Confidence tags + "Why was this added?" evidence panel | **pass** |
| Conflict handling (Keep Earlier / Keep Later / Add Clarification) | **pass** |
| Topic match Connect / Keep Separate | **pass** |
| Apply → events on timeline + evolutions + questions + activity + summary stale | **pass** |
| Story Updated diff + Save Snapshot + Review Updated Summary | **pass** |
| Follow-Up History search + type filter + date-range filter | **pass** |
| Follow-Up Detail read-only view | **pass** |
| No horizontal overflow on narrow viewport | **pass** |
| Console errors during the full flow | **0** |
| TypeScript / ESLint / production build | **clean** (0 errors) |

## Stage 8 — Understand My Health Information

**Route:** `/my-story` → dashboard → *Understand My Health Information* card.
A document library and understanding workspace that helps a person make sense of
a health document **they already have** — without turning the app into a
diagnosis tool.

### What Stage 8 adds

| Capability | Implementation |
| --- | --- |
| Document library | search + type filters over `journal.documents` |
| Upload / paste text | real `FileReader` text reading, drag-and-drop + file picker |
| Demo mode | one labelled demo blood-test report built by the real Stage 8 engine |
| Staged processing | Reading → Sections → Terms → Organizing → Explaining, with cancel |
| Two-pane viewer | source document left, plain-language understanding right |
| Explanation levels | `SIMPLE` / `STANDARD` / `DETAILED` |
| Term explainer | definition + "in this document" + why it appears, saveable to vocabulary |
| Source attribution | every explanation carries page / section / original quote |
| Document-bounded Q&A | answers retrieved from the document; says so when not found |
| Measurements table | value, unit, date, page — as recorded, never interpreted |
| Connect to Story | review gate: the user picks every item that enters the story |
| Language bridge | English full; हिन्दी / ગુજરાતી dictionary prototype, labelled |

### The pipeline (honest about what it does)

```text
file / paste  →  review before understanding  →  processing (staged)
              →  understand (source ↔ explanation)
              →  [ ask about this document ]  [ connect to my story ]
              →  review gate  →  story update  →  back to the timeline
```

**No OCR and no PDF parsing are claimed.** The prototype reads plain text files
and pasted text; that is exactly what the UI says. Page counts, scanned pages and
image-based extraction are out of scope and are never shown as if they worked.

### Reusing Stages 3–7

- Types live in `journal/types.ts` alongside `StoryQuestion` and `FollowUpEntry`
  to avoid a circular import — `HealthDocument`, `DocumentAnalysis`,
  `DocumentSection`, `DocumentTerm`, `DocumentMeasurement`, `DocumentExplanation`,
  `SourceReference`.
- Stage 8 **does not re-implement event creation**: "Connect to Story" runs the
  same `toAnalyzedEvent` path used by Stage 5, so imported items appear on the
  timeline, in evolutions, in the summary and in the activity feed exactly like
  any other entry.
- Follow-up drafts produced by the import land in the Stage 7 `followUps`
  pipeline; conversation items hand off to Stage 6 Conversation Mode.
- The demo document is built by `buildDemoDocument()` → the **same**
  `buildDocument()` used for user files, so nothing is hand-faked.

### Stage 8 files

```text
src/lib/journal/types.ts              (HealthDocument, DocumentAnalysis, DocumentStatus, …)
src/lib/understand/
  engine.ts       document building, sections/terms/measurements/dates, explanations,
                  staged processDocument, document Q&A, import items, filters, languages
  options.ts      all Stage 8 copy (safety, privacy, no-interpretation notes)
src/components/understand/
  UnderstandHome.tsx          entry options, paste, document library
  DocumentUpload.tsx          review-before-understanding + staged processing
  DocumentUnderstanding.tsx   two-pane source ↔ explanation, terms, measurements
  DocumentQandA.tsx           document-bounded questions with source evidence
  ConnectToStory.tsx          review gate for what enters the story
  UnderstandMode.tsx          orchestrator (home / preview / understand / qa / connect)
  UnderstandCard.tsx          dashboard entry point
  understand.module.css       Stage 8 styles (design tokens reused)
src/lib/journal/demo.ts              (fictional demo document, related to the demo follow-up)
```

### Safety rules honoured

- **No clinical interpretation.** Measurements are shown as recorded with the
  document's own reference range; the app never says whether a value is normal,
  high, low, good or worrying.
- **No diagnosis, no disease prediction, no treatment advice, no health score.**
- **Never auto-imports.** Nothing reaches the story until the user reviews the
  Connect-to-Story list and presses Confirm; a single refusal path exists at
  every step.
- **Source attribution everywhere** — page, section and original quote for every
  explanation, term and answer; unanswered questions are marked *not found in
  document* instead of being invented.
- **Translate ≠ explain ≠ simplify** kept separate; non-English output is
  explicitly labelled as a prototype translation, and unimplemented languages are
  listed as planned rather than silently rendered in English.
- **Privacy honesty:** files are read in the browser and stored in this
  prototype's local storage — no encryption, HIPAA or GDPR claim is made.
- Emergency notice and "not medical advice" disclaimer present.

### Stage 8 verification

| Check | Result |
| --- | --- |
| Dashboard → Understand card → understand workspace | **pass** |
| Demo report → staged processing → two-pane viewer | **pass** |
| Cancel during processing returns to review and stores nothing | **pass** |
| Explanation levels SIMPLE / STANDARD / DETAILED | **pass** |
| Term chip → explainer → Save to My Health Vocabulary | **pass** |
| Measurements table with value / unit / date / page | **pass** |
| View Source shows the original quote for the section | **pass** |
| Q&A: grounded answer cites page; ungrounded answer says so | **pass** |
| Connect to Story: opt-in rows → review → Confirm | **pass** |
| Imported items appear on timeline + activity feed | **pass** |
| Library search + type filter + remove document | **pass** |
| No diagnosis / score / treatment language anywhere | **pass** |
| No OCR or PDF capability claimed in the UI | **pass** |
| No horizontal overflow on narrow viewport | **pass** |
| Console errors during the full flow | **0** |
| TypeScript / ESLint / production build | **clean** (0 errors) |

---

## Stage 9 — Personal Health Knowledge Map + Evidence Graph + Story Intelligence Layer

**Route:** `/my-story` → dashboard → *Insights* card → **Story Intelligence Map**.

Stage 9 is the "story layer": it turns the HealthStory journal into a **derived
knowledge graph** — topics, events, follow-ups, documents, questions, summaries —
where every node shows *why it exists, where it came from, and what the AI did to
it*. It never hides the machine's role.

### What Stage 9 adds

| Capability | Implementation |
| --- | --- |
| **Story graph** | `buildStoryGraph(journal)` derives nodes (`EVENT`, `TOPIC`, `FOLLOW_UP`, `DOCUMENT`, `QUESTION`, `SUMMARY`, `SNAPSHOT`) plus typed edges (`SAME_TOPIC`, `TEMPORAL_SEQUENCE`, `FOLLOW_UP_TO`, `MENTIONED_IN`, `SUPPORTS` / `SOURCE_OF`, `CORRECTS`, `USER_LINKED`) — each edge carries a plain reason |
| **Node cards** | short title, date, source indicator, and a status badge |
| **Statuses** | `USER RECORDED` / `AI ORGANIZED` / `USER CONFIRMED` / `USER EDITED` / `SOURCE DOCUMENT` / `NEEDS REVIEW` — AI-derived cards are visually distinct (dashed borders) and the AI status is never hidden |
| **Story map** | SVG map with pan/zoom, type/status/period filters, free-text search (title + date + source wording), timeline view, mobile cluster cards |
| **Why is this connected?** | clicking an edge explains the reason with `sourceIds` so it can be traced to your own words |
| **Node detail** | what / when / source / related topics / connected events / original wording, plus Confirm, Remove, Add to Conversation |
| **Information to Review (gaps)** | missing dates, unconfirmed AI items, unlinked documents, unresolved questions — each gap offers Add Date / Keep Approximate / Ignore, and always *Leave as is* / *Not sure* |
| **Story Consistency** | duplicates, conflicting dates/statements, broken document links, orphaned questions, outdated summaries, unconfirmed AI items — with **Compare / Merge / Keep Separate**; the app **never auto-merges** |
| **Insight pipeline** | insights pass **Safety + Source validation** before display; every insight carries a signature, evidence, and source-node links |
| **Scoped generation** | AI never runs on the whole story at once — only the current view + relevant nodes + their sources + recent changes |
| **Add Follow-Up** | produces a **user-reviewable draft** in the Stage 7 pipeline (no auto-apply) |
| **View Supporting Documents** | per-node, from the node detail panel |
| **Story Completeness instead of a Health Score** | "8 confirmed events, 2 open questions, 1 unlinked document" categorised as *Well documented / Some information missing / Needs review* |
| **Prepare for Conversation** | privacy-first selection (topics / events / documents / questions) with a **"Review what you're sharing"** list; Confirm hands a `ConversationSelection` to Conversation Mode — nothing is shared automatically |

### The model (describe + never fake)

Every insight is disciplined by `validateStoryInsightText` / `isSafeInsight`:
banned phrases ("You have…", "This proves…", "This indicates…", "You are at
risk…") are only ever produced inside an **attributed quote** from a source the
user recorded. `generateStoryInsights` emits `REPEATED_TOPIC`, `CORRECTION`,
`UNRESOLVED_QUESTION`, `DOCUMENT_CONNECTION`, `MISSING_INFORMATION`, `CONFLICT`
and `NEW_INFORMATION` findings — all deterministic and traceable.

Insights are recomputed from the journal on every render. Before display, the
orchestrator compares each insight's **signature** with the last one shown: if
the underlying story changed, the insight is marked **"Needs refresh"** instead
of silently re-showing stale findings. Dismiss / Confirm decisions are keyed by
stable insight ids and are session-scoped (never persisted).

The demo graph includes the topic chain, follow-up/documented links, a
user-created link between the headaches topic and the demo document, open
questions, and unconfirmed AI events — so the map, gaps, and completeness all
have real engine output to show.

### Reusing stages 3–8

Types come from `journal/types.ts` (plus `userLinks?: UserStoryLink[]` on the
journal). Event nodes re-use Stage 3 `AnalyzedEvent`s and their
`needsConfirmation`; follow-ups are Stage 7 `FollowUpEntry`s; documents are
Stage 8 `HealthDocument`s; summaries are Stage 4 `HealthSummary` objects;
conversation handoff uses Stage 6 `ConversationSelection`. **Nothing synthetic
is invented for the graph** — edges, reasons, statuses and insights are all
derived from the journal that already exists.

The Stage 9 "API endpoints" in the master brief are **adapted to the current
architecture** as a pure client-side, deterministic engine (no server routes,
no runtime dependencies) — which matches how every prior stage is implemented.

### Stage 9 files

```text
src/lib/insights/
  types.ts       StoryNode/status, relationships + confidence/origin/reason, gaps,
                 duplicates, conflicts, StoryConsistency, StoryInsight + signature,
                 StoryCompleteness, search, feed
  options.ts     all Stage 9 copy (status/node/relationship/insight/gap label maps,
                 trust flow, completeness, prepare-for-conversation)
  engine.ts      buildStoryGraph, detectDuplicateSuggestions, searchStoryMap,
                 computeLayout (deterministic) + node id helpers
  analyze.ts     detectInformationGaps, detectConflicts, detectDuplicates,
                 detectConsistency, computeCompleteness
  insights.ts    validateStoryInsight + generateStoryInsights, buildStoryFeed,
                 buildInventory, buildTopicClusters
src/components/insights/
  InsightsMode.tsx         orchestrator (Overview / Story Map / Evidence / Questions & Review)
  InsightsCard.tsx         dashboard entry point
  StoryMap.tsx             SVG map, pan/zoom, filters, search, timeline, mobile cards
  NodeDetailPanel.tsx      what/when/source/actions, related topics, evidence, actions
  InsightCards.tsx         recent insights, why-am-I-seeing-this, dismiss/review/evidence
  EvidenceExplorer.tsx     topic clusters, inventory, activity feed, trust panel
  QuestionsReview.tsx      open questions, gaps, duplicates, conflicts, completeness
  insights.module.css      Stage 9 styles (design tokens reused)
src/lib/journal/types.ts   (+ optional userLinks)
src/lib/journal/demo.ts    (topics/follow-up/document relation + a user-created link)
src/lib/communication/ConversationMode.tsx   (optional initialSelection handoff)
```

### Safety rules honoured (Stage 9)

- **No health score** — only Story Completeness ("Well documented / Some
  information missing / Needs review").
- **Never auto-merges or auto-modifies.** Merge/Keep Separate only ever flags a
  resolution; originals stay saved. Keep Approximate, Ignore, Leave as is and
  Not sure are always available.
- **Never hides AI status.** AI-organized nodes are visually distinct and
  labelled.
- **No bans applied to quotes.** Prohibited claim language is only ever rendered
  inside an attributed source quote.
- **No whole-story AI runs**, no fabricated evidence, no fake "AI analyzed
  documents" claims, and no automatic sharing.
- Insights, edges, gaps and completeness remain traceable to `sourceIds` and the
  user's own words.

### Stage 9 verification

| Check | Result |
| --- | --- |
| Dashboard → Insights card → Intelligence Map | **pass** |
| Story map renders demo nodes + topic clusters + edges | **pass** |
| Edge click → "Why are these connected?" with reason + sources | **pass** |
| Node card statuses + dashed AI-style border (never hidden) | **pass** |
| Search, type/status/period filters, timeline view, mobile cards | **pass** |
| Node detail → Confirm event → node becomes USER CONFIRMED | **pass** |
| Gaps: Add Date / Keep Approximate / Ignore / Leave as is / Not sure | **pass** |
| Duplicates: Compare → Merge / Keep Separate (originals preserved) | **pass** |
| Insight: dismiss / review / view evidence; "Needs refresh" on change | **pass** |
| Open questions: mark discussed / remove; Add Follow-Up is a draft | **pass** |
| Story Completeness shows a category + counting line (no score) | **pass** |
| Prepare for Conversation → review what's shared → Confirm → Conversation Mode | **pass** |
| No banned "you are at risk / this indicates" language | **pass** |
| No horizontal overflow on narrow viewport | **pass** |
| Console errors during the full flow | **0** |
| TypeScript / ESLint / production build | **clean** (0 errors) |

---

## Stage 10 — Backend architecture, AI safety & provider abstraction

Stage 10 gives the product a real backend without changing any frontend
behaviour: a **PostgreSQL database** via Prisma, **session auth**, a **typed
REST API**, an **AI safety layer** around every generated output, and an
**AI provider abstraction** so a real model can replace the deterministic
engine without touching routes or UI.

### Database (real, not faked)

- `prisma/schema.prisma` — ~25 models and ~20 enums covering users, sessions,
  stories, story events, topics, questions, follow-ups, documents, communication
  sessions/drafts, snapshots, versions, graph nodes/relationships, insights and
  audit logs.
- `npm run db:push` creates the schema; the Prisma client is generated to
  `node_modules/@prisma/client`.
- Connection is configured through `DATABASE_URL` in `.env` (see Quick start).
- **No fake persistence**: when the database is unreachable, API routes return
  an honest error — they never write to an in-memory store and claim success.

### Auth

- `POST /api/auth/register` — bcrypt-hashed password (cost 12), creates the
  user, sets the session.
- `POST /api/auth/login` — verifies with `bcryptjs`, updates `lastLoginAt`.
- `POST /api/auth/logout` — clears the session cookie.
- `GET /api/auth/me` — returns the current user (401 without a session).
- Session = **JWT in an `HttpOnly`, `SameSite=Lax` cookie**
  (`healthstory_session`, 7 days) signed with `jose` (HS256). The `Secure`
  attribute is applied in production builds only, so plain-HTTP localhost
  clients work.
- Route guards in `src/lib/auth/middleware.ts` return a discriminated union
  (`requireAuth`, `requireStoryOwner`, `requireDocumentOwner`) so every handler
  gets a narrowed, non-null user or a ready-made 401/403 response.

### API surface (`src/app/api/**`)

| Group | Routes |
| --- | --- |
| Auth | `register`, `login`, `logout`, `me` |
| Stories | `GET/POST /api/stories`, `GET/PATCH/DELETE /api/stories/[id]` |
| Events | `POST /events`, `PATCH/DELETE /events/[eventId]`, `POST /events/[eventId]/confirm` |
| Questions | `GET/POST /questions`, `PATCH/DELETE /questions/[questionId]` |
| Follow-ups | `GET/POST /follow-ups` |
| Documents | `GET/POST /documents`, `DELETE /documents/[docId]`, `POST /documents/[docId]/analyze` |
| AI | `POST /organize`, `POST /preview`, `POST /communication/generate`, `GET/POST /communication` |

All request bodies are validated with **zod** (`src/lib/validation.ts`); all
responses use one envelope (`{ success, data | error }`); mutations write
**audit log** rows; ownership is enforced on every story-scoped route (cross-user
access → 403, no session → 401).

### AI safety layer

- `src/lib/ai/safety.ts` — runs on every generated draft/organize output before
  it can be returned: rejects diagnostic, causal, treatment-urgency and
  guarantee wording; strips/redacts and reports what was found.
- The same validator the UI already shows ("Wording check") is now enforced at
  the API boundary, so server responses carry the safety result explicitly.

### AI provider abstraction

- `src/lib/ai/provider.ts` — one `AIProvider` interface with two
  implementations: the existing **deterministic engine** (default, labelled
  honestly) and a `MockAIProvider` used for tests. Swapping in a hosted model
  means adding one provider implementation; no route or component changes.
- The provider never invents facts: it only re-organizes the events, topics and
  questions it is given, and it preserves date precision as-is.

### Stage 10 files

```text
prisma/schema.prisma               ~25 models / ~20 enums (PostgreSQL)
.env                               DATABASE_URL (not committed)
src/lib/db/client.ts               Prisma client singleton
src/lib/auth/session.ts            JWT create/verify, bcrypt, cookie helpers
src/lib/auth/middleware.ts         requireAuth / requireStoryOwner / requireDocumentOwner
src/lib/validation.ts              zod schemas for every request body
src/lib/ai/safety.ts               output safety validation
src/lib/ai/provider.ts             AIProvider interface + engine/mock implementations
src/app/api/**                     22 route handlers (auth + stories + AI)
```

### Stage 10 verification

| Check | Result |
| --- | --- |
| `prisma db push` against local PostgreSQL 18 | **pass** (all tables created) |
| Register → login → `/api/auth/me` round-trip | **pass** (200/200/200) |
| Bad password → 401; no cookie → 401 | **pass** |
| Create / list / fetch story | **pass** (201 / 200 / 200) |
| Cross-user read **and** delete → 403 | **pass** |
| Questions GET/POST, follow-up POST, preview POST | **pass** (200/201/201) |
| Session cookie `HttpOnly` + `SameSite=Lax`, `Secure` in production | **pass** |
| Conversation Mode: generate → wording check → reorder → suggest → accept | **pass**, 0 console warnings |
| Intelligence Map: questions & review (mark discussed / remove) | **pass**, 0 console warnings |
| Frontend behaviour/UI unchanged (Stages 1–9 flows) | **pass** |
| TypeScript / ESLint / production build | **clean** (0 errors, 0 warnings) |

---

## Stage 11 — Database engineering, security & integrity

Stage 11 hardens the Stage 10 backend without touching the frontend:
every API route now runs behind strict validation, object-level
authorization, rate limits and auditing; every multi-row write is
transactional; documents live in private storage behind a full
validation pipeline; sessions can be revoked; and an independent
integrity checker proves the data is consistent. Nothing is faked —
no mock persistence, no decorative "security" that the code does not
actually perform.

### Schema & migrations

- **Prisma Migrate** with a `prisma/migrations/` history: baseline
  `0_init` (marked applied via `prisma migrate resolve`) plus
  `stage11_security` (adds `user_sessions`, optional `AuditLog.userId`
  with relation, `AIProcessingRecord.story` FK) and
  `stage11_audit_actions` (new `AuditAction` values).
- **`UserSession`** — one row per login; its id is the JWT `jti`.
  `getUserFromToken` fails closed when the row is missing, revoked or
  expired, so **logout invalidates the token server-side** while other
  devices keep their own sessions.
- `prisma/seed.mjs` (localhost-guarded, idempotent) builds a
  self-consistent demo story — 3 events in mixed states, 2 questions,
  1 follow-up with items, audit rows, version rows matching
  `currentVersion = 2` — so the integrity checker has clean data to
  verify. `npm run db:reset` = drop → migrate → seed.

### Transactions & versioning

Every multi-row write is one `prisma.$transaction`: story + v1,
events + audit + version, event confirm + audit + version,
follow-up + nested items + audit + version, document row + audit +
version, communication draft + audit. `recordVersion(tx, …)`
(`src/lib/db/versioning.ts`) bumps `stories.currentVersion` and
inserts `story_versions` **atomically with** the change, so a complete
`1..currentVersion` chain is proof no write happened outside the
application path.

### Request validation & mass-assignment defence

`src/lib/api/schemas.ts` defines **strict zod schemas** for every
endpoint (register, login, story, events, questions, follow-ups,
documents, communications, organize, preview, generate). Unknown keys
are rejected with a field-level `400 VALIDATION_ERROR` naming the
key — `userId`, `currentVersion`, `status`, `createdBy`,
`confirmedByUser`, `storageKey`, `checksum` and friends are always
derived server-side. `readJson` adds content-type (`415`), byte cap
(`413`), JSON parse (`400`) and per-endpoint resource caps
(`src/lib/security/limits.ts`).

### Rate limiting

In-memory fixed windows keyed by user+IP, env-tunable: `login`
10/5 min, `register` 10/min, `ai` 20/min, `upload` 20/10 min, `write`
120/min. `429` + `Retry-After`, each trip audited
(`RATE_LIMIT_TRIGGERED`). The per-instance limitation and the Redis
path are documented in `SECURITY.md` §4 rather than hidden.

### File security

Uploads (`src/lib/security/files.ts`) must pass: extension
allow-list → extension↔MIME consistency → **magic-byte** check →
4 MB size cap → strict base64 round-trip. Bytes are written under the
git-ignored `storage/` directory **outside `public/`**, addressed by a
**server-generated** key (`users/{uid}/stories/{sid}/{doc}.{ext}`);
client-supplied `storageKey`/`checksum` are schema-rejected and
`resolveStoragePath()` re-checks traversal on every read. Downloads
are authenticated + ownership-scoped, audited (`DOCUMENT_ACCESS`),
sent with an allow-listed `Content-Type`, attachment
`Content-Disposition` and `Cache-Control: private, no-store`.
Deletion is a transactional soft-delete (audit + version, text and
analysis cleared) followed by byte removal. The cross-story document
read (IDOR) found during review was fixed by re-scoping lookups to
`{ id, storyId, userId }`.

### Audit trail & access-denied visibility

Write routes record `STORY_CREATED`, `USER_EDIT`, `EVENT_CREATED`,
`EVENT_CONFIRMED`, `EVENT_DELETED`, `QUESTION_CREATED`,
`QUESTION_DELETED`, `FOLLOW_UP_ADDED`, `DOCUMENT_IMPORTED`,
`DOCUMENT_EDITED`, `DOCUMENT_DELETED`, `DOCUMENT_ACCESS`,
`AI_ORGANIZATION`, `COMMUNICATION_GENERATED`; auth flows record
`LOGIN_SUCCESS`, `LOGIN_FAILURE` (attempted email only — never the
password), `LOGOUT`. Failed object access writes `ACCESS_DENIED` with
the probed resource (`src/lib/auth/middleware.ts`).

### Integrity checker — the `Story Integrity` report

`src/lib/db/integrity.ts` → `GET /api/stories/:id/integrity`
(auth + ownership, strictly read-only). Eight checks, each
`pass`/`warn`/`fail` with detail, overall = worst status:

| Check | Catches |
| --- | --- |
| `version-chain` | missing/duplicate `story_versions` rows vs `currentVersion` |
| `document-ownership` | documents not owned by the story owner |
| `document-storage` | missing bytes, sha-256 mismatch, deleted docs still holding files |
| `question-ownership` | foreign or lost question attribution |
| `followup-ownership` | foreign follow-up attribution |
| `confirmation-consistency` | `confirmedByUser` vs `status`/`needsConfirmation` mismatch |
| `provenance-consistency` | `createdBy` vs event status mismatch |
| `communication-selections` | selections referencing deleted rows |

### Security headers & posture endpoint

`next.config.ts` sets (all responses): CSP (`default-src 'self'`,
`object-src 'none'`, `frame-ancestors 'none'`; eval + HMR sockets
only outside production), `nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy` (camera/geo/payment/USB off —
microphone intentionally on for the journal's voice input),
COOP/CORP `same-origin`, HSTS in production. No CORS headers are ever
emitted; CSRF is covered by `SameSite=Lax` + JSON-only bodies.
`GET /api/security/status` reports the live posture (DB reachability,
applied migration count, cookie flags, buckets, headers, audit enum,
integrity catalog) — no secrets, no counts of user data.

### The `/security` page

`/security` (footer link: **Security**) is the judge-facing write-up:
a live panel fed by `/api/security/status`, the access-control /
input-handling / data-at-rest explanations, the eight integrity checks
printed, the exact reproduction commands, and an honest
**Known limitations** card (in-memory rate limits, dev-only
`AUTH_SECRET` fallback, no password reset/2FA, inline-script CSP).

### Stage 11 files

| Area | Files |
| --- | --- |
| Schema & migrations | `prisma/schema.prisma`, `prisma/migrations/` (`0_init` + 2 Stage 11), `prisma/seed.mjs` |
| Validation | `src/lib/api/schemas.ts`, `src/lib/api/validate.ts`, `src/lib/api/errors.ts`, `src/lib/security/limits.ts` |
| Security primitives | `src/lib/security/rateLimit.ts`, `src/lib/security/files.ts` |
| Auth | `src/lib/auth/session.ts` (revocable), `src/lib/auth/middleware.ts` (ACCESS_DENIED audit) |
| Consistency | `src/lib/db/versioning.ts`, `src/lib/db/integrity.ts` |
| Routes | all of `src/app/api/**` (validation + limits + tx + audit), new `…/documents/[docId]/download`, `…/integrity`, `api/security/status` |
| Headers | `next.config.ts` (`headers()`) |
| Tests & tooling | `scripts/security-tests.mjs`, `npm run test:security`, `npm run db:seed`, `npm run db:reset` |
| Docs & page | `SECURITY.md`, `DATABASE.md`, `.env.example`, `/security` (`src/app/security/`), footer link |

### Stage 11 verification

| Check | Result |
| --- | --- |
| `tsc --noEmit` / `eslint .` / `npm run build` | **clean** (0 errors, 0 warnings) |
| `npm run test:security` (~150 assertions) | **pass** (see § list below) |
| — 401/403/409/400/413/415 semantics incl. codes | **pass** |
| — forged JWT → 401; revoked session → 401; other sessions unaffected | **pass** |
| — cross-user IDOR (story read/write/delete, questions, documents, download, integrity) | **pass** |
| — mass assignment on register/story/event/follow-up/document/communication | **pass** (400 naming the key) |
| — fake PDF magic bytes, `.exe`, MIME mismatch, client `storageKey` | **pass** (400) |
| — server-generated storage key + sha-256 + audited download + delete cascade | **pass** |
| — security headers, no CORS headers, CSP | **pass** |
| — rate limiter trips with 429 + `Retry-After` | **pass** (run last: exhausts the login bucket) |
| — static secret scan + config posture (.gitignore, `.env.example`, seed guard) | **pass** |
| `GET /api/stories/:id/integrity` on an API-built story → `pass`, 8/8 checks | **pass** |
| Browser regression (landing/workspace/journal flows, 0 console warnings) | **pass** |