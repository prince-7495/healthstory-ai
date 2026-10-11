#!/usr/bin/env node
/**
 * Stage 11 — security test suite (HTTP, no test framework).
 *
 * Run against a freshly started dev server so the in-memory rate
 * limiter starts from clean buckets:
 *   npm run dev           # terminal 1
 *   npm run test:security # terminal 2
 *
 * Coverage:
 *   authentication (401/403/409/400), object-level authorization
 *   (IDOR across stories/documents), strict request validation and
 *   mass-assignment rejection, file validation (extension/MIME/magic
 *   bytes/storageKey), authenticated download + deletion, session
 *   revocation on logout, transactional versioning via the integrity
 *   report, security headers, CORS posture, payload limits, rate
 *   limiting (429 + Retry-After), and a static secret scan.
 *
 * Exit code 0 = all checks passed.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push({ name, detail });
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n== ${title} ==`);
}

async function api(route, options = {}) {
  const { method = "GET", body, cookie, headers = {}, contentType } = options;
  const finalHeaders = { ...headers };
  if (body !== undefined) finalHeaders["Content-Type"] = contentType || "application/json";
  if (cookie) finalHeaders.Cookie = cookie;
  const res = await fetch(BASE + route, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return { status: res.status, json, text, headers: res.headers, setCookies };
}

const cookieOf = (setCookies) => setCookies.map((c) => c.split(";")[0]).join("; ");
const errorCode = (r) => r.json?.error?.code ?? "(none)";
const rand = () => Math.random().toString(36).slice(2, 10);

/* ------------------------------------------------------------------ */
/* 0. Server probe                                                     */
/* ------------------------------------------------------------------ */
let probe;
try {
  probe = await fetch(BASE + "/", { redirect: "manual" });
} catch (e) {
  console.error(`Cannot reach ${BASE} — start the dev server first (npm run dev).`);
  console.error(String(e));
  process.exit(2);
}

section("Environment & security headers");
check("dev server reachable", probe.status === 200, `got ${probe.status}`);
const h = probe.headers;
check(
  "Content-Security-Policy present",
  (h.get("content-security-policy") || "").includes("default-src 'self'"),
  h.get("content-security-policy") || "(missing)"
);
check("X-Content-Type-Options: nosniff", h.get("x-content-type-options") === "nosniff");
check("X-Frame-Options: DENY", h.get("x-frame-options") === "DENY");
check("Referrer-Policy present", (h.get("referrer-policy") || "").includes("strict-origin"));
check("Permissions-Policy present", (h.get("permissions-policy") || "").includes("camera=()"));
check("Cross-Origin-Opener-Policy present", h.get("cross-origin-opener-policy") === "same-origin");

/* ------------------------------------------------------------------ */
/* 1. Security status endpoint                                         */
/* ------------------------------------------------------------------ */
section("Security status endpoint");
const statusRes = await api("/api/security/status");
check("GET /api/security/status -> 200", statusRes.status === 200, `got ${statusRes.status}`);
check("database reachable", statusRes.json?.data?.database?.reachable === true);
check(
  "migrations applied (>= 3)",
  (statusRes.json?.data?.database?.appliedMigrations ?? 0) >= 3,
  `got ${statusRes.json?.data?.database?.appliedMigrations}`
);
check("logout revocation advertised", statusRes.json?.data?.authentication?.revokesOnLogout === true);
check(
  "strict validation advertised",
  String(statusRes.json?.data?.requestValidation?.mode || "").includes("strict")
);
check(
  "integrity checks catalogued",
  (statusRes.json?.data?.integrity?.checks?.length ?? 0) >= 8,
  `got ${statusRes.json?.data?.integrity?.checks?.length}`
);

/* ------------------------------------------------------------------ */
/* 2. Authentication                                                   */
/* ------------------------------------------------------------------ */
section("Authentication");
const noAuth = await api("/api/stories");
check("no cookie -> 401", noAuth.status === 401, `got ${noAuth.status}`);
check("401 code UNAUTHENTICATED", errorCode(noAuth) === "UNAUTHENTICATED", errorCode(noAuth));

const emailA = `sec-a-${rand()}@example.com`;
const emailB = `sec-b-${rand()}@example.com`;
const PASSWORD = "TestPass123!";

const regA = await api("/api/auth/register", {
  method: "POST",
  body: { email: emailA, password: PASSWORD, displayName: "Security A" },
});
check("register A -> 200", regA.status === 200, `got ${regA.status}: ${regA.text.slice(0, 160)}`);
check("session cookie is HttpOnly", /healthstory_session=[^;]+;\s*HttpOnly/i.test(regA.setCookies.join(" ") || ""));
check("session cookie is SameSite=Lax", /SameSite=Lax/i.test(regA.setCookies.join(" ") || ""));

const regB = await api("/api/auth/register", {
  method: "POST",
  body: { email: emailB, password: PASSWORD, displayName: "Security B" },
});
check("register B -> 200", regB.status === 200, `got ${regB.status}`);
const cookieB = cookieOf(regB.setCookies);

const dup = await api("/api/auth/register", {
  method: "POST",
  body: { email: emailA, password: PASSWORD },
});
check("duplicate email -> 409", dup.status === 409, `got ${dup.status}`);
check("409 code EMAIL_EXISTS", errorCode(dup) === "EMAIL_EXISTS", errorCode(dup));

const weak = await api("/api/auth/register", {
  method: "POST",
  body: { email: `weak-${rand()}@example.com`, password: "short" },
});
check("short password -> 400", weak.status === 400, `got ${weak.status}`);
check(
  "400 names the password field",
  JSON.stringify(weak.json?.error?.details || []).includes("password"),
  JSON.stringify(weak.json?.error?.details || []).slice(0, 160)
);

const injected = await api("/api/auth/register", {
  method: "POST",
  body: { email: `inject-${rand()}@example.com`, password: PASSWORD, role: "admin" },
});
check("unknown key on register -> 400", injected.status === 400, `got ${injected.status}`);
check(
  "400 mentions the injected key",
  JSON.stringify(injected.json?.error || {}).includes("role"),
  JSON.stringify(injected.json?.error || "").slice(0, 200)
);

const loginA = await api("/api/auth/login", { method: "POST", body: { email: emailA, password: PASSWORD } });
check("login A -> 200", loginA.status === 200, `got ${loginA.status}`);
const sessionA = cookieOf(loginA.setCookies);

const badPw = await api("/api/auth/login", {
  method: "POST",
  body: { email: emailA, password: "WrongPass123!" },
});
check("wrong password -> 401", badPw.status === 401, `got ${badPw.status}`);
check("401 code INVALID_CREDENTIALS", errorCode(badPw) === "INVALID_CREDENTIALS", errorCode(badPw));

const unknownAcct = await api("/api/auth/login", {
  method: "POST",
  body: { email: `ghost-${rand()}@example.com`, password: PASSWORD },
});
check("unknown account -> 401 (same code)", unknownAcct.status === 401 && errorCode(unknownAcct) === "INVALID_CREDENTIALS");

const badEmail = await api("/api/auth/login", {
  method: "POST",
  body: { email: "not-an-email", password: PASSWORD },
});
check("malformed email -> 400", badEmail.status === 400, `got ${badEmail.status}`);

const meA = await api("/api/auth/me", { cookie: sessionA });
check("me with A session -> 200", meA.status === 200, `got ${meA.status}`);
const userAId = meA.json?.data?.user?.id;
check("me returns A user id", typeof userAId === "string" && userAId.length > 0);

const forged = await api("/api/auth/me", { cookie: "healthstory_session=eyJhbGciOiJIUzI1NiJ9.forgedy.signature" });
check("forged JWT -> 401", forged.status === 401, `got ${forged.status}`);

/* ------------------------------------------------------------------ */
/* 3. Object-level authorization (IDOR)                                */
/* ------------------------------------------------------------------ */
section("Object-level authorization");
const storyA = await api("/api/stories", { method: "POST", cookie: sessionA, body: { title: "A story" } });
check("A creates story -> 201", storyA.status === 201, `got ${storyA.status}`);
const sA = storyA.json?.data?.id;

const storyB = await api("/api/stories", { method: "POST", cookie: cookieB, body: { title: "B story" } });
check("B creates story -> 201", storyB.status === 201, `got ${storyB.status}`);
const sB = storyB.json?.data?.id;

const bReadsA = await api(`/api/stories/${sA}`, { cookie: cookieB });
check("B reads A's story -> 403", bReadsA.status === 403, `got ${bReadsA.status}`);
check("403 code FORBIDDEN", errorCode(bReadsA) === "FORBIDDEN", errorCode(bReadsA));

const bWritesA = await api(`/api/stories/${sA}`, { method: "PATCH", cookie: cookieB, body: { title: "hijacked" } });
check("B patches A's story -> 403", bWritesA.status === 403, `got ${bWritesA.status}`);

const bEventsA = await api(`/api/stories/${sA}/events`, {
  method: "POST",
  cookie: cookieB,
  body: { events: [{ description: "x" }] },
});
check("B writes events to A's story -> 403", bEventsA.status === 403, `got ${bEventsA.status}`);

const bDeletesA = await api(`/api/stories/${sA}`, { method: "DELETE", cookie: cookieB });
check("B deletes A's story -> 403", bDeletesA.status === 403, `got ${bDeletesA.status}`);

/* ------------------------------------------------------------------ */
/* 4. Strict request validation & mass assignment                      */
/* ------------------------------------------------------------------ */
section("Request validation (strict zod, no mass assignment)");

const massStory = await api("/api/stories", {
  method: "POST",
  cookie: sessionA,
  body: { title: "smuggle", userId: userAId, currentVersion: 999, status: "ACTIVE" },
});
check("story create with server fields -> 400", massStory.status === 400, `got ${massStory.status}`);
check(
  "400 names the unknown keys",
  JSON.stringify(massStory.json?.error || {}).includes("userId"),
  JSON.stringify(massStory.json?.error || "").slice(0, 200)
);

const emptyPatch = await api(`/api/stories/${sA}`, { method: "PATCH", cookie: sessionA, body: {} });
check("empty PATCH -> 400", emptyPatch.status === 400, `got ${emptyPatch.status}`);

const badJson = await api("/api/stories", { method: "POST", cookie: sessionA, body: "{not json" });
check("malformed JSON -> 400", badJson.status === 400 && errorCode(badJson) === "INVALID_JSON", `got ${badJson.status}`);

const wrongType = await api("/api/stories", {
  method: "POST",
  cookie: sessionA,
  body: "plain text",
  contentType: "text/plain",
});
check("non-JSON content type -> 415", wrongType.status === 415, `got ${wrongType.status}`);

const huge = await api("/api/stories", {
  method: "POST",
  cookie: sessionA,
  body: JSON.stringify({ title: "x".repeat(1_200_000) }),
});
check("1.2 MB body -> 413", huge.status === 413, `got ${huge.status}`);

/* ------------------------------------------------------------------ */
/* 5. Events: validation, confirmation, server-controlled fields       */
/* ------------------------------------------------------------------ */
section("Events & confirmation");

const smuggledEvent = await api(`/api/stories/${sA}/events`, {
  method: "POST",
  cookie: sessionA,
  body: { events: [{ description: "x", status: "USER_CONFIRMED", id: "attacker-id", createdBy: "USER" }] },
});
check("event with server fields -> 400", smuggledEvent.status === 400, `got ${smuggledEvent.status}`);

const noDescription = await api(`/api/stories/${sA}/events`, {
  method: "POST",
  cookie: sessionA,
  body: { events: [{ title: "no description" }] },
});
check("event without description -> 400", noDescription.status === 400, `got ${noDescription.status}`);

const eventsCreated = await api(`/api/stories/${sA}/events`, {
  method: "POST",
  cookie: sessionA,
  body: {
    events: [
      { origin: "AI", description: "Started daily inhaler after the check-up.", date: "2026-04-02", category: "MEDICATION" },
      { origin: "USER", description: "Wheeze when climbing stairs.", date: "2026-06-18", category: "SYMPTOM" },
    ],
  },
});
check("valid events -> 201", eventsCreated.status === 201, `got ${eventsCreated.status}: ${eventsCreated.text.slice(0, 160)}`);
check("created count = 2", eventsCreated.json?.data?.created === 2, JSON.stringify(eventsCreated.json?.data));

const eventList = await api(`/api/stories/${sA}/events`, { cookie: sessionA });
check("list events -> 200", eventList.status === 200 && Array.isArray(eventList.json?.data));
const eventIds = (eventList.json?.data || []).map((e) => e.id);
check("two events exist", eventIds.length === 2, `got ${eventIds.length}`);
const ev1 = eventIds[0];

const confirm1 = await api(`/api/stories/${sA}/events/${ev1}/confirm`, { method: "POST", cookie: sessionA });
check("confirm event -> 200", confirm1.status === 200, `got ${confirm1.status}`);
check("confirm sets USER_CONFIRMED", confirm1.json?.data?.status === "USER_CONFIRMED");
check("confirm sets confirmedByUser", confirm1.json?.data?.confirmedByUser === true);

const patchStatus = await api(`/api/stories/${sA}/events/${ev1}`, {
  method: "PATCH",
  cookie: sessionA,
  body: { status: "USER_REPORTED" },
});
check("PATCH status -> 400 (server-controlled)", patchStatus.status === 400, `got ${patchStatus.status}`);

const patchConfirm = await api(`/api/stories/${sA}/events/${ev1}`, {
  method: "PATCH",
  cookie: sessionA,
  body: { needsConfirmation: true },
});
check("PATCH needsConfirmation -> 400", patchConfirm.status === 400, `got ${patchConfirm.status}`);

const patchDesc = await api(`/api/stories/${sA}/events/${ev1}`, {
  method: "PATCH",
  cookie: sessionA,
  body: { description: "Started daily inhaler; dosage reviewed in April." },
});
check("PATCH description -> 200", patchDesc.status === 200, `got ${patchDesc.status}`);

/* ------------------------------------------------------------------ */
/* 6. Questions & follow-ups                                           */
/* ------------------------------------------------------------------ */
section("Questions & follow-ups");

const question = await api(`/api/stories/${sA}/questions`, {
  method: "POST",
  cookie: sessionA,
  body: { text: "Could the wheeze be related to the inhaler?" },
});
check("create question -> 201", question.status === 201, `got ${question.status}`);
const qId = question.json?.data?.id;

const badQuestion = await api(`/api/stories/${sA}/questions`, {
  method: "POST",
  cookie: sessionA,
  body: { text: "", source: "USER" },
});
check("empty question text -> 400", badQuestion.status === 400, `got ${badQuestion.status}`);

const badSource = await api(`/api/stories/${sA}/questions`, {
  method: "POST",
  cookie: sessionA,
  body: { text: "ok?", source: "ADMIN" },
});
check("invalid question source -> 400", badSource.status === 400, `got ${badSource.status}`);

const bPatchQ = await api(`/api/stories/${sA}/questions/${qId}`, {
  method: "PATCH",
  cookie: cookieB,
  body: { status: "REMOVED" },
});
check("B patches A's question -> 403", bPatchQ.status === 403, `got ${bPatchQ.status}`);

const badFollowUp = await api(`/api/stories/${sA}/follow-ups`, {
  method: "POST",
  cookie: sessionA,
  body: { type: "HACK", originalText: "something" },
});
check("invalid follow-up type -> 400", badFollowUp.status === 400, `got ${badFollowUp.status}`);

const followUp = await api(`/api/stories/${sA}/follow-ups`, {
  method: "POST",
  cookie: sessionA,
  body: {
    type: "APPOINTMENT",
    originalText: "Follow-up on 15 September 2026.",
    eventDate: "2026-09-15",
    eventDatePrecision: "EXACT",
    language: "en",
    items: [
      {
        type: "APPOINTMENT",
        text: "Follow-up 15 September 2026",
        sourceText: "Follow-up on 15 September 2026",
        sourceType: "FOLLOW_UP",
        confidence: "HIGH",
      },
    ],
  },
});
check("valid follow-up -> 201", followUp.status === 201, `got ${followUp.status}: ${followUp.text.slice(0, 160)}`);
check(
  "follow-up item row created",
  (followUp.json?.data?.items?.length ?? 0) === 1,
  JSON.stringify(followUp.json?.data?.items?.length)
);

/* ------------------------------------------------------------------ */
/* 7. File security                                                    */
/* ------------------------------------------------------------------ */
section("File security (validation, private storage, download)");

const uploadText = await api(`/api/stories/${sA}/documents`, {
  method: "POST",
  cookie: sessionA,
  body: { filename: "visit-notes.txt", mimeType: "text/plain", text: "Stage 11 upload test — visit notes." },
});
check("text upload -> 201", uploadText.status === 201, `got ${uploadText.status}: ${uploadText.text.slice(0, 200)}`);
const docId = uploadText.json?.data?.id;
const storageKey = uploadText.json?.data?.storageKey;
check(
  "server-generated storage key under users/",
  typeof storageKey === "string" && storageKey.startsWith("users/") && storageKey.includes(userAId),
  String(storageKey)
);
check(
  "sha-256 checksum stored",
  /^[0-9a-f]{64}$/.test(uploadText.json?.data?.checksum || ""),
  String(uploadText.json?.data?.checksum)
);

const fakePdf = await api(`/api/stories/${sA}/documents`, {
  method: "POST",
  cookie: sessionA,
  body: {
    filename: "report.pdf",
    mimeType: "application/pdf",
    content: Buffer.from("definitely not a pdf").toString("base64"),
  },
});
check("fake PDF (bad magic bytes) -> 400", fakePdf.status === 400, `got ${fakePdf.status}: ${fakePdf.text.slice(0, 160)}`);
check("invalid file code INVALID_FILE", errorCode(fakePdf) === "INVALID_FILE", errorCode(fakePdf));

const exe = await api(`/api/stories/${sA}/documents`, {
  method: "POST",
  cookie: sessionA,
  body: {
    filename: "payload.exe",
    mimeType: "application/octet-stream",
    content: Buffer.from("MZ\0\0").toString("base64"),
  },
});
check("disallowed extension -> 400", exe.status === 400, `got ${exe.status}`);

const mismatch = await api(`/api/stories/${sA}/documents`, {
  method: "POST",
  cookie: sessionA,
  body: {
    filename: "notes.txt",
    mimeType: "application/pdf",
    content: Buffer.from("%PDF-1.4 fake").toString("base64"),
  },
});
check("extension/MIME mismatch -> 400", mismatch.status === 400, `got ${mismatch.status}`);

const keyInjection = await api(`/api/stories/${sA}/documents`, {
  method: "POST",
  cookie: sessionA,
  body: {
    filename: "notes.txt",
    mimeType: "text/plain",
    text: "hi",
    storageKey: "users/victim/stories/victim/doc.txt",
    checksum: "0".repeat(64),
  },
});
check("client-supplied storageKey/checksum -> 400", keyInjection.status === 400, `got ${keyInjection.status}`);

const bothFields = await api(`/api/stories/${sA}/documents`, {
  method: "POST",
  cookie: sessionA,
  body: { filename: "notes.txt", mimeType: "text/plain", text: "hi", content: Buffer.from("x").toString("base64") },
});
check("content + text together -> 400", bothFields.status === 400, `got ${bothFields.status}`);

const download = await api(`/api/stories/${sA}/documents/${docId}/download`, { cookie: sessionA });
check("owner download -> 200", download.status === 200, `got ${download.status}`);
check("download content matches upload", download.text.includes("Stage 11 upload test"), download.text.slice(0, 80));
check(
  "Content-Disposition attachment",
  (download.headers.get("content-disposition") || "").startsWith("attachment;"),
  download.headers.get("content-disposition") || "(missing)"
);
check(
  "download Content-Type text/plain",
  download.headers.get("content-type") === "text/plain",
  download.headers.get("content-type") || ""
);
check("download is not cacheable", (download.headers.get("cache-control") || "").includes("no-store"));

const bDownload = await api(`/api/stories/${sA}/documents/${docId}/download`, { cookie: cookieB });
check("B download of A's file -> 403", bDownload.status === 403, `got ${bDownload.status}`);

const bReadDoc = await api(`/api/stories/${sB}/documents/${docId}`, { cookie: cookieB });
check("B reads A's doc via own story -> 404 (scoped)", bReadDoc.status === 404, `got ${bReadDoc.status}`);

const aReadDoc = await api(`/api/stories/${sA}/documents/${docId}`, { cookie: cookieB });
check("B reads A's doc via A's story -> 403", aReadDoc.status === 403, `got ${aReadDoc.status}`);

const deleteDoc = await api(`/api/stories/${sA}/documents/${docId}`, { method: "DELETE", cookie: sessionA });
check("delete document -> 200", deleteDoc.status === 200, `got ${deleteDoc.status}`);

const downloadAfterDelete = await api(`/api/stories/${sA}/documents/${docId}/download`, { cookie: sessionA });
check("download after delete -> 404", downloadAfterDelete.status === 404, `got ${downloadAfterDelete.status}`);

/* ------------------------------------------------------------------ */
/* 8. AI operations (validated + rate-limit bucket)                    */
/* ------------------------------------------------------------------ */
section("AI operations");

const organize = await api(`/api/stories/${sA}/organize`, {
  method: "POST",
  cookie: sessionA,
  body: { text: "Started aspirin 100mg in March after the cardiology visit, no issues so far." },
});
check("organize -> 200", organize.status === 200, `got ${organize.status}: ${organize.text.slice(0, 160)}`);

const organizeStrict = await api(`/api/stories/${sA}/organize`, {
  method: "POST",
  cookie: sessionA,
  body: { text: "hello", options: { anything: true } },
});
check("organize with unknown key -> 400", organizeStrict.status === 400, `got ${organizeStrict.status}`);

const preview = await api(`/api/stories/${sA}/preview`, {
  method: "POST",
  cookie: sessionA,
  body: { text: "Chest tightness in the evening for two weeks." },
});
check("preview -> 200", preview.status === 200, `got ${preview.status}`);

/* ------------------------------------------------------------------ */
/* 9. Communication                                                    */
/* ------------------------------------------------------------------ */
section("Communication");

const comm = await api(`/api/stories/${sA}/communication`, {
  method: "POST",
  cookie: sessionA,
  body: { tone: "Calm", simplifyLanguage: true },
});
check("create communication -> 201", comm.status === 201, `got ${comm.status}: ${comm.text.slice(0, 160)}`);
const commId = comm.json?.data?.id;
check(
  "sourceVersion defaulted by server",
  (comm.json?.data?.sourceVersion ?? 0) >= 1,
  String(comm.json?.data?.sourceVersion)
);

const commStrict = await api(`/api/stories/${sA}/communication`, {
  method: "POST",
  cookie: sessionA,
  body: { status: "SENT", finalDraft: "injected" },
});
check("communication with server fields -> 400", commStrict.status === 400, `got ${commStrict.status}`);

const bGenerate = await api(`/api/stories/${sA}/communication/generate`, {
  method: "POST",
  cookie: cookieB,
  body: { communicationId: commId },
});
check("B generates A's communication -> 403", bGenerate.status === 403, `got ${bGenerate.status}`);

const generate = await api(`/api/stories/${sA}/communication/generate`, {
  method: "POST",
  cookie: sessionA,
  body: { communicationId: commId },
});
check("owner generate -> 200", generate.status === 200, `got ${generate.status}: ${generate.text.slice(0, 160)}`);
check("draft returned", typeof generate.json?.data?.draft === "string" && generate.json.data.draft.length > 0);

/* ------------------------------------------------------------------ */
/* 10. Integrity report (transactions + versioning)                    */
/* ------------------------------------------------------------------ */
section("Integrity report");

const integrity = await api(`/api/stories/${sA}/integrity`, { cookie: sessionA });
check("integrity -> 200", integrity.status === 200, `got ${integrity.status}: ${integrity.text.slice(0, 200)}`);
check("8 checks reported", (integrity.json?.data?.checks?.length ?? 0) === 8, String(integrity.json?.data?.checks?.length));
check(
  "story integrity is 'pass' (version chain, ownership, storage)",
  integrity.json?.data?.status === "pass",
  JSON.stringify(
    (integrity.json?.data?.checks || []).filter((c) => c.status !== "pass").map((c) => `${c.id}: ${c.detail}`)
  )
);
const versionChain = (integrity.json?.data?.checks || []).find((c) => c.id === "version-chain");
check("version chain shows sequential rows", versionChain?.status === "pass", versionChain?.detail || "");

const bIntegrity = await api(`/api/stories/${sA}/integrity`, { cookie: cookieB });
check("B runs integrity on A's story -> 403", bIntegrity.status === 403, `got ${bIntegrity.status}`);

/* ------------------------------------------------------------------ */
/* 11. Session revocation                                              */
/* ------------------------------------------------------------------ */
section("Session revocation (logout)");

const loginA2 = await api("/api/auth/login", { method: "POST", body: { email: emailA, password: PASSWORD } });
check("second login -> 200", loginA2.status === 200, `got ${loginA2.status}`);
const sessionA2 = cookieOf(loginA2.setCookies);

const meBeforeLogout = await api("/api/auth/me", { cookie: sessionA2 });
check("second session valid before logout", meBeforeLogout.status === 200, `got ${meBeforeLogout.status}`);

const logout = await api("/api/auth/logout", { method: "POST", cookie: sessionA2 });
check("logout -> 200", logout.status === 200, `got ${logout.status}`);

const meAfterLogout = await api("/api/auth/me", { cookie: sessionA2 });
check("revoked session -> 401", meAfterLogout.status === 401, `got ${meAfterLogout.status}`);
check("401 code INVALID_SESSION", errorCode(meAfterLogout) === "INVALID_SESSION", errorCode(meAfterLogout));

const otherSession = await api("/api/auth/me", { cookie: sessionA });
check("other session still valid", otherSession.status === 200, `got ${otherSession.status}`);

const logoutNoCookie = await api("/api/auth/logout", { method: "POST" });
check("logout without cookie is idempotent -> 200", logoutNoCookie.status === 200, `got ${logoutNoCookie.status}`);

const reuseAfterLogout = await api(`/api/stories/${sA}`, { cookie: sessionA2 });
check("revoked cookie cannot read data -> 401", reuseAfterLogout.status === 401, `got ${reuseAfterLogout.status}`);

/* ------------------------------------------------------------------ */
/* 12. CORS posture                                                    */
/* ------------------------------------------------------------------ */
section("CORS posture");
const crossOrigin = await api("/api/stories", { cookie: sessionA, headers: { Origin: "https://evil.example" } });
check("cross-origin read allowed?", crossOrigin.status === 200, `got ${crossOrigin.status}`);
check(
  "no Access-Control-Allow-Origin header",
  !crossOrigin.headers.has("access-control-allow-origin"),
  crossOrigin.headers.get("access-control-allow-origin") || "(none — good)"
);

/* ------------------------------------------------------------------ */
/* 13. Rate limiting (LAST — poisons the login bucket for 5 minutes)  */
/* ------------------------------------------------------------------ */
section("Rate limiting");
const codes = [];
for (let i = 0; i < 12; i += 1) {
  const r = await api("/api/auth/login", {
    method: "POST",
    body: { email: `hammer-${rand()}@example.com`, password: PASSWORD },
  });
  codes.push(r.status);
  if (r.status === 429) {
    check("429 carries Retry-After", Number(r.headers.get("retry-after")) >= 1, r.headers.get("retry-after") || "(missing)");
    check("429 code RATE_LIMITED", errorCode(r) === "RATE_LIMITED", errorCode(r));
    break;
  }
}
check(
  "login bucket trips with 429",
  codes.includes(429),
  `statuses: ${codes.join(",")} — if none was 429, restart the dev server and rerun (buckets are in-memory)`
);

/* ------------------------------------------------------------------ */
/* 14. Static checks (secret scan, config posture)                     */
/* ------------------------------------------------------------------ */
section("Static checks");

const gitignore = readFileSync(path.join(ROOT, ".gitignore"), "utf8");
check(".gitignore ignores .env files", /^\.env\*$/m.test(gitignore));
check(".gitignore keeps .env.example", gitignore.includes("!.env.example"));
check(".gitignore ignores /storage/", gitignore.includes("/storage/"));

const envExamplePath = path.join(ROOT, ".env.example");
check(".env.example exists", existsSync(envExamplePath));
if (existsSync(envExamplePath)) {
  const envExample = readFileSync(envExamplePath, "utf8");
  const secretLine = envExample.split(/\r?\n/).find((l) => l.startsWith("AUTH_SECRET=")) || "";
  check(".env.example AUTH_SECRET is a placeholder", /AUTH_SECRET=""?/.test(secretLine), secretLine);
}

const nextConfig = readFileSync(path.join(ROOT, "next.config.ts"), "utf8");
check("next.config.ts defines CSP", nextConfig.includes("Content-Security-Policy"));
check("next.config.ts sets nosniff", nextConfig.includes("X-Content-Type-Options"));

const seedPath = path.join(ROOT, "prisma", "seed.mjs");
check(
  "seed exists and is localhost-guarded",
  existsSync(seedPath) && readFileSync(seedPath, "utf8").includes("Refusing to seed")
);
check(
  "seed registered in package.json",
  readFileSync(path.join(ROOT, "package.json"), "utf8").includes('"seed": "node prisma/seed.mjs"')
);

const SECRET_PATTERNS = [
  { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub token", re: /ghp_[A-Za-z0-9]{36}/ },
  { name: "OpenAI-style key", re: /sk-[A-Za-z0-9]{32,}/ },
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "Slack token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
];
const SCAN_DIRS = ["src", "prisma", "scripts"];
const SCAN_FILES = ["package.json", "next.config.ts", "README.md", ".env.example", ".gitignore"];
const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".prisma", ".example", ".yml", ".yaml"]);

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "storage") continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (SCAN_EXTS.has(path.extname(entry))) out.push(full);
  }
  return out;
}

const scanFiles = [];
for (const d of SCAN_DIRS) {
  const full = path.join(ROOT, d);
  if (existsSync(full)) walk(full, scanFiles);
}
for (const f of SCAN_FILES) {
  const full = path.join(ROOT, f);
  if (existsSync(full)) scanFiles.push(full);
}

let secretHits = 0;
for (const file of scanFiles) {
  const content = readFileSync(file, "utf8");
  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(content)) {
      secretHits += 1;
      console.log(`        secret scan hit: ${name} in ${path.relative(ROOT, file)}`);
    }
  }
}
check(`secret scan clean (${scanFiles.length} files)`, secretHits === 0, `${secretHits} hit(s)`);

const storageRoot = path.join(ROOT, "storage");
const publicDir = path.join(ROOT, "public");
check("storage/ is not inside public/", !storageRoot.startsWith(publicDir));
check(
  "schema has user_sessions table",
  readFileSync(path.join(ROOT, "prisma", "schema.prisma"), "utf8").includes('@@map("user_sessions")')
);

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */
console.log(`\n${"=".repeat(60)}`);
console.log(`Security tests: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
  console.log("\nHint: rate-limit buckets are in-memory; restart the dev server before rerunning.");
}
console.log("=".repeat(60));
process.exit(failed > 0 ? 1 : 0);
