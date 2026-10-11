# Security — HealthStory AI (Stage 11)

This document describes the security engineering in this codebase:
what is implemented, how it works, how it is tested, and what the
known limitations are. Nothing here is theoretical — every claim maps
to code you can find at the path given in brackets.

HealthStory AI stores personal health information. It provides no
diagnosis, no treatment advice and no health scores; it is a
communication and journaling tool (see the safety notes in `README.md`).

---

## 1. Authentication

- **Password hashing** — bcrypt (cost factor 12) via `bcryptjs`
  (`src/lib/auth/*`, register/login routes). Passwords are never
  logged; the login audit records the attempted email only.
- **Timing equalization** — logging in with an unknown email still
  performs a bcrypt comparison against a lazily generated dummy hash,
  so account enumeration via response timing is not possible
  (`dummyHash` in the login route).
- **Session tokens** — JWT signed with HMAC-SHA256 (`jose`), 7-day
  lifetime, containing the user id, a session id (`jti`) and issue/
  expiry times. The signing secret is `AUTH_SECRET` (see
  `.env.example`; the code falls back to a development-only constant
  when unset — set an explicit value before any real deployment).
- **Cookie** — `healthstory_session`, `HttpOnly`, `SameSite=Lax`,
  `Path=/`, `Secure` when `NODE_ENV === "production"`. The cookie is
  not readable from JavaScript, which is what makes it resistant to
  XSS exfiltration of the token itself (`src/lib/auth/session.ts`).

### Server-side session revocation

A valid signature alone is not enough. Every authenticated request
resolves a row in `user_sessions` (the JWT `jti` is the row id) and
fails closed if the row is missing, revoked or expired:

- `POST /api/auth/logout` sets `revokedAt` on the row, then clears
  the cookie. Replaying the old cookie afterwards returns
  `401 INVALID_SESSION`.
- Each user may hold several independent sessions; logging out of one
  does not invalidate the others (the security test suite proves
  both halves of this).
- Expired rows are opportunistically cleaned up.

There is **no password reset flow** — Stage 11 does not invent one.
Deleting or changing an account out-of-band revokes access because
`getUserFromToken` also loads the user row (a missing user fails).

## 2. Authorization (object-level)

Every story-scoped route runs `requireAuth` and then an ownership
check before touching data (`src/lib/auth/middleware.ts`):

| Helper | Verifies |
| --- | --- |
| `requireStoryOwner(storyId, userId)` | story exists **and** belongs to the user |
| `requireDocumentOwner(docId, userId)` | document belongs to the user |
| `requireFollowUpOwner(id, userId)` | follow-up entry belongs to the user |
| `requireCommunicationOwner(id, userId)` | communication session belongs to the user |

Routes additionally re-scope queries (e.g. the document read/download
paths look up `where: { id, storyId, userId }`), so a document id can
never be paired with a story it does not belong to — a cross-tenant
write is rejected even if an ownership helper were bypassed. Document
analysis verifies `document.storyId === storyId` from the URL before
running.

Failed checks return `403 FORBIDDEN` **and write an `ACCESS_DENIED`
audit entry** (fire-and-forget) recording the action, the resource and
the actor — repeated probing of foreign ids is visible in the audit
trail.

## 3. Request validation

- All JSON bodies are parsed by `readJson` (`src/lib/api/validate.ts`),
  which enforces a content type (`415` otherwise), a byte cap
  (`413 PAYLOAD_TOO_LARGE`, 1 MB default for JSON, 6 MB for uploads),
  valid JSON (`400 INVALID_JSON`) and then a **strict zod schema**.
- Schemas live in `src/lib/api/schemas.ts` and are built with
  `strictObject` / `.strict()`: **unknown keys are rejected with a
  field-level 400**, which is the mass-assignment defence. A client
  that sends `userId`, `currentVersion`, `status`, `storageKey`,
  `checksum`, `id`, `createdBy`, `confirmedByUser`, … gets a 400 naming
  the offending key, and no such field is ever read from the payload.
- Server-controlled values are derived server-side: `userId` from the
  session, `storageKey`/`checksum` from the stored bytes,
  `provenance` from the validated `origin`, `sourceVersion` from the
  story's `currentVersion` when the client omits it.
- Resource caps (events, questions, follow-ups, documents, text
  length) live in `src/lib/security/limits.ts` and are checked before
  inserts, so a single request cannot flood a story.
- Validation failures return `400 VALIDATION_ERROR` with a `details`
  array of `{ path, message }` — precise, but never echoing secrets.

## 4. Rate limiting

In-memory fixed windows (`src/lib/security/rateLimit.ts`), keyed by
authenticated user id + client IP (or IP alone for pre-auth endpoints):

| Bucket | Limit | Window | Applied to |
| --- | --- | --- | --- |
| `login` | 10 | 5 min | login attempts |
| `register` | 10 | 1 min | registrations |
| `ai` | 20 | 1 min | organize / preview / analyze / generate |
| `upload` | 20 | 10 min | document uploads |
| `write` | 120 | 1 min | all other mutations |

All are tunable via `RATE_*` environment variables (`.env.example`).
A `429` response carries `Retry-After` and writes a
`RATE_LIMIT_TRIGGERED` audit entry.

**Known limitation:** the store is per-process. Behind multiple
instances or a serverless platform the limits multiply, and a restart
clears them. The mitigation path is to move the same `check()` logic
onto Redis (or platform rate limiting) — the interface
(`enforceRateLimit(request, { bucket, … })`) is a single choke point
designed for that swap. This limitation is documented rather than
hidden.

## 5. File security

Uploads are validated in `src/lib/security/files.ts` and the document
routes:

1. **Extension allow-list** — `.pdf`, `.png`, `.jpg`, `.jpeg`, `.txt`
   only; anything else is `400 INVALID_FILE`.
2. **Extension ↔ MIME consistency** — `notes.txt` with
   `application/pdf` is rejected.
3. **Magic bytes** — the actual content must match the claimed type
   (`%PDF-` for PDFs, PNG/JPEG signatures, decodable UTF-8 text for
   `.txt`). Renaming an executable to `.pdf` fails here.
4. **Size cap** — 4 MB per file, on top of the 6 MB request cap.
5. **Base64 strictness** — content must round-trip as valid base64.
6. **Private storage** — bytes are written under `storage/`
   (git-ignored, **outside `public/`**), never at a web-servable path.
   The storage key is **generated by the server** as
   `users/{userId}/stories/{storyId}/{docId}.{ext}`; client-supplied
   `storageKey`/`checksum` fields are rejected by the schema, and
   `resolveStoragePath()` re-checks for path traversal on every read.
7. **Checksums** — sha-256 of the stored bytes is recorded per
   document; the integrity checker re-hashes and compares.
8. **Authenticated download** — `GET …/documents/{id}/download`
   requires auth + ownership, re-scopes the lookup, writes a
   `DOCUMENT_ACCESS` audit entry, sends an allow-listed
   `Content-Type`, an attachment `Content-Disposition` with a
   sanitized filename, and `Cache-Control: private, no-store`.
9. **Deletion** — soft-delete (`status = DELETED`) in a transaction
   with an audit entry and a version bump, then the bytes are removed
   after commit; `originalText` and `analysis` are cleared from the
   row.

## 6. Database integrity

- **Migrations** — Prisma Migrate; history in `prisma/migrations`
  (`DATABASE.md` describes the baseline + Stage 11 migrations).
- **Transactions** — every multi-row write is wrapped in
  `prisma.$transaction` (story + first version, events + audit +
  version, follow-up + nested items + audit + version, document row +
  audit + version, communication update + audit). A failure rolls the
  whole unit back; there are no partially written stories.
- **Version chain** — `stories.currentVersion` is bumped in the same
  transaction that inserts the matching `story_versions` row
  (`src/lib/db/versioning.ts`). Gaps or duplicates can therefore only
  appear if data is modified outside the application — which is
  exactly what the integrity checker looks for.
- **Integrity checker** — `src/lib/db/integrity.ts`, exposed as
  `GET /api/stories/:id/integrity` (auth + ownership, read-only).
  Eight checks, each reporting `pass`/`warn`/`fail` with detail:

  | Check | Catches |
  | --- | --- |
  | `version-chain` | missing/duplicate version rows vs `currentVersion` |
  | `document-ownership` | documents not owned by the story owner |
  | `document-storage` | missing files, checksum mismatch, deleted docs still holding bytes |
  | `question-ownership` | questions with a foreign (or lost) owner |
  | `followup-ownership` | follow-ups with a foreign owner |
  | `confirmation-consistency` | `confirmedByUser` disagreeing with `status`/`needsConfirmation` |
  | `provenance-consistency` | `createdBy` disagreeing with event status |
  | `communication-selections` | selections referencing deleted rows |

  The report's overall status is the worst check status. The checker
  never modifies data.

- **Referential integrity** — foreign keys with explicit `onDelete`
  behaviour (cascade for owned children, set-null only where the
  schema documents it); the orphan cases that foreign keys cannot
  express (ownership, files, chains) are what the checker covers.
- **Seeding** — `prisma/seed.mjs` builds a self-consistent demo story
  and **refuses to run unless `DATABASE_URL` points at localhost**.
  `npm run db:reset` (destructive, confirms before dropping) reapplies
  migrations and re-seeds.

## 7. Audit trail

`audit_logs` records who did what to which resource
(`src/app/api/**` write paths and the middleware):

`STORY_CREATED`, `USER_EDIT`, `EVENT_CREATED`, `EVENT_CONFIRMED`,
`EVENT_DELETED`, `QUESTION_CREATED`, `QUESTION_DELETED`,
`FOLLOW_UP_ADDED`, `DOCUMENT_IMPORTED`, `DOCUMENT_EDITED`,
`DOCUMENT_DELETED`, `DOCUMENT_ACCESS`, `AI_ORGANIZATION`,
`COMMUNICATION_GENERATED`, `LOGIN_SUCCESS`, `LOGIN_FAILURE`,
`LOGOUT`, `ACCESS_DENIED`, `RATE_LIMIT_TRIGGERED` — the authoritative
list is the `AuditAction` enum in `prisma/schema.prisma`, and
`GET /api/security/status` returns it live.

Failures are audited as deliberately as successes: failed logins
record the attempted email (never the password), denied object access
records the resource that was probed, and 429s record the bucket.

## 8. Transport & browser hardening

Configured for all responses in `next.config.ts`:

- `Content-Security-Policy` — `default-src 'self'`; `object-src
  'none'`, `base-uri 'self'`, `form-action 'self'`,
  `frame-ancestors 'none'`. The script `src` allows `'unsafe-inline'`
  (Next.js hydration bootstrap) and — **in development only** —
  `'unsafe-eval'` and the HMR websocket; production drops both and
  keeps `connect-src 'self'`. No third-party origins are allowed
  anywhere: the app loads no CDNs, fonts or telemetry.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (+ CSP `frame-ancestors`) — clickjacking
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — camera, geolocation, payment, USB and
  display-capture disabled. **`microphone` is intentionally left
  enabled** because the journal's voice input uses the browser
  SpeechRecognition API; disabling it would break a shipped feature.
- `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Resource-Policy: same-origin`
- `Strict-Transport-Security` — production only (sending HSTS from a
  plain-HTTP dev server would be meaningless).

**CORS:** no `Access-Control-Allow-*` headers are ever emitted, so
foreign origins cannot read API responses in a browser. **CSRF:**
state-changing endpoints require a JSON body (a cross-site form post
cannot send `Content-Type: application/json` without CORS preflight,
which is never granted) and the session cookie is `SameSite=Lax`,
which blocks cross-site POSTs carrying it entirely.

## 9. Testing

```bash
npm run dev            # terminal 1 — fresh start resets rate windows
npm run test:security  # terminal 2
```

`scripts/security-tests.mjs` (~150 assertions, no test framework)
exercises: 401/403/409/400/413/415 codes, forged and revoked
sessions, cross-user IDOR on stories/events/questions/documents
(including the cross-story document scoping), mass-assignment attempts
on six different endpoints, magic-byte/MIME/extension file attacks,
server-generated storage keys, authenticated download + audit,
deletion cascades, the integrity report on a freshly built story,
security headers, CORS posture, rate limiting (429 + `Retry-After`,
run last because it exhausts the login bucket), and a static secret
scan over the repository.

Buckets are in-memory: restart the dev server before rerunning the
suite. Exit code 0 means everything passed.

## 10. Known limitations / hardening roadmap

1. Rate limiting is per-instance (§4) — move to Redis for multi-node.
2. `AUTH_SECRET` falls back to a dev constant when unset — the app
   should refuse to boot in production without an explicit secret.
3. No password reset / email verification flows (no mail provider in
   scope; registering with an email you control is the model).
4. No 2FA, no account lockout (rate limiting mitigates brute force).
5. The CSP keeps `'unsafe-inline'` for scripts because of Next.js's
   inline bootstrap; adopting nonces would allow removing it.
6. Uploaded files are stored on local disk; object storage with
   server-side encryption is the scale-out path.
