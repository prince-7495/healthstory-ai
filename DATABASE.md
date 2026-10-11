# Database — HealthStory AI (Stage 11)

How the data layer is set up, migrated, seeded and verified.

## Engine & driver

| | |
| --- | --- |
| Engine | PostgreSQL 18 (dedicated project instance) |
| ORM | Prisma **5.18.0** (pinned — newer majors change config-file handling) |
| URL | `DATABASE_URL` in `.env` (see `.env.example`) |
| Client | `src/lib/db/client.ts` (singleton `PrismaClient`) |

The development instance used for this project runs locally with
`--auth=trust` on a non-default port and its data directory lives
outside the repository. Any PostgreSQL 14+ server works; nothing in
the code depends on the local setup.

## Migrations

History lives in `prisma/migrations/`, applied with Prisma Migrate:

| Migration | Contents |
| --- | --- |
| `0_init` | Baseline — the full Stage 1–10 schema, marked applied |
| `20261007153533_stage11_security` | `user_sessions`, `AuditLog.userId` optional + relation, `AIProcessingRecord.story` FK |
| `20261007154315_stage11_audit_actions` | New `AuditAction` enum values (`DOCUMENT_ACCESS`, `LOGIN_*`, `LOGOUT`, `ACCESS_DENIED`, `RATE_LIMIT_TRIGGERED`, `EVENT_DELETED`, `QUESTION_DELETED`) |

The baseline is marked applied with `prisma migrate resolve` so the
database reflects reality instead of replaying Stage 1–10 history
that predates the migration workflow. New schema changes always go
through `npx prisma migrate dev` — never `db push` on a shared
database.

```bash
npx prisma migrate status   # are all migrations applied?
npx prisma migrate dev      # create + apply a migration (dev)
npx prisma studio           # inspect data (npm run db:studio)
```

## Commands

| Command | Effect |
| --- | --- |
| `npm run db:generate` | Regenerate the Prisma Client (after schema edits) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | **Destructive** — drop database, re-apply all migrations, re-run the seed (asks for confirmation) |
| `npm run db:seed` | Seed the demo account + story (idempotent) |
| `npx prisma migrate status` | Migration status |

`prisma.seed` is registered in `package.json`, so `prisma migrate
reset` seeds automatically.

## Schema map

`prisma/schema.prisma` is the source of truth. Principal tables:

- **Identity** — `users`, `user_sessions` (revocable sessions; id =
  JWT `jti`), `auth_accounts`
- **Story** — `stories`, `story_events`, `topics` (+ event/topic
  links), `story_versions`, `story_snapshots`, `source_references`,
  `story_questions`, `follow_up_entries`, `follow_up_items`
- **Documents** — `documents` (metadata + `storageKey` + `checksum`;
  bytes live on disk, see below), `document_data`
- **Communication** — `communication_sessions`, `communication_translations`
- **Operations** — `audit_logs`, `ai_processing_records`

Relationships use explicit `onDelete` rules: owned children cascade
with their story/user; `audit_logs.userId` and
`story_questions.userId` are set-null so history survives account
changes; foreign keys are checked by the database (`@relation` on
every reference).

### Server-controlled columns

These are **never** taken from request payloads (enforced by strict
zod schemas and by deriving values server-side):

`stories.userId`, `stories.currentVersion`, `story_events.createdBy`,
`story_events.status`, `story_events.confirmedByUser`,
`documents.storageKey`, `documents.checksum`, all `*.createdAt` /
`*.updatedAt` timestamps, audit rows.

## Transactions & versioning

Multi-step writes are atomic via `prisma.$transaction`; the helper
`recordVersion(tx, …)` (`src/lib/db/versioning.ts`) bumps
`stories.currentVersion` **and** inserts the matching
`story_versions` row in the same transaction as the change.

Version bump points: story creation (v1), event create / edit /
confirm / delete, question text edit / delete, follow-up creation,
document upload / delete. Because the bump and the change share a
transaction, a committed version row is proof the change committed —
and a gap means the data was altered outside the application, which
is precisely what the integrity checker reports.

## Files vs. database

Document **bytes** are not stored in PostgreSQL. They live under the
git-ignored `storage/` directory (outside `public/`), addressed by
`documents.storageKey` (`users/{userId}/stories/{storyId}/{docId}.{ext}`,
always server-generated) and verified by `documents.checksum`
(sha-256 of the bytes). The row keeps everything else: filename,
mime type, size, extraction result, status, soft-delete timestamp.

`GET /api/stories/:id/integrity` re-hashes stored files and fails if
a live document's bytes are missing or don't match its checksum.

## Seed & reset

`prisma/seed.mjs`:

- **Refuses to run** unless `DATABASE_URL` targets `localhost` /
  `127.0.0.1` — a seed script must never touch a shared database.
- Idempotent: deletes the previous seed user (children cascade) and
  recreates a consistent demo dataset — 1 user, 1 story, 3 events in
  mixed states (AI-organized / user-confirmed / user-reported), 2
  questions, 1 follow-up with 2 item rows, 4 audit rows, version rows
  1–2 matching `currentVersion = 2`.
- The seeded story is deliberately integrity-clean: run
  `GET /api/stories/seed_story_demo/integrity` (as the demo user)
  and every check passes.

Demo login (development only): `demo@healthstory.local` /
`DemoStory123!`.

```bash
npm run db:seed    # seed only (database must be migrated)
npm run db:reset   # drop → migrate → seed (destructive)
```

## Verifying integrity

```bash
GET /api/stories/:id/integrity   # auth + ownership; 8 read-only checks
GET /api/security/status         # DB reachability + applied migration count
```

`npm run test:security` asserts the full report reads `pass` for a
story built entirely through the API.

## Backups & inspection

- `pg_dump` / `pg_restore` for logical backups (the instance is
  single-purpose, so file-level backup of its data directory also
  works).
- `npm run db:studio` for browsing; `psql` for ad-hoc queries.
- Application data is append-friendly: `audit_logs`,
  `story_versions` and `ai_processing_records` preserve history that
  the operational tables deliberately overwrite.
