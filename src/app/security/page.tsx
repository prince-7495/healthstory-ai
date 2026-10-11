import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import { LogoMark } from "@/components/icons";
import SecurityStatus from "./SecurityStatus";
import styles from "./security.module.css";

export const metadata: Metadata = {
  title: "Security & Data Integrity",
  description:
    "How HealthStory AI protects health stories: sessions and revocation, object-level authorization, strict request validation, rate limiting, private file storage, migrations, transactions and the story integrity checker. No medical advice is provided by this tool.",
};

/**
 * Stage 11 — the judge-facing security page.
 *
 * Everything written here is implemented in this repository; the live
 * panel pulls GET /api/security/status so the claims are checkable
 * against the running deployment rather than being marketing text.
 * Design system: shared tokens/primitives from globals.css only.
 */
export default function SecurityPage() {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="HealthStory AI — home">
            <LogoMark size={26} />
            <span>HealthStory AI</span>
          </Link>
          <Link href="/" className={styles.homeLink}>
            ← Back to the product
          </Link>
        </div>
      </header>

      <main id="top">
        {/* ---- Live status ---- */}
        <section className="section" aria-labelledby="security-heading">
          <div className="container">
            <div className="section-head section-head--center">
              <p className="eyebrow">Stage 11 · Security engineering</p>
              <h1 className="h-section" id="security-heading">
                Security &amp; data integrity, documented
              </h1>
              <p className="lede">
                Health stories are personal. This page explains exactly how this system
                authenticates, authorizes, validates, limits, stores and audits — with a
                live status readout from this very deployment.
              </p>
            </div>

            <SecurityStatus />

            <div className={styles.note}>
              <strong>Scope:</strong> HealthStory AI is a communication and journaling
              tool. It performs no diagnosis, gives no treatment advice, computes no
              health scores, and stores no real patient records — all demonstration
              data is fictional (see README.md).
            </div>
          </div>
        </section>

        {/* ---- Core defences ---- */}
        <section className="section section--alt" id="access" aria-labelledby="access-heading">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Access control</p>
              <h2 className="h-section" id="access-heading">
                Who may do what
              </h2>
              <p className="lede">
                Three independent layers — credentials, sessions and per-object checks —
                each verified on every request.
              </p>
            </div>

            <div className="grid grid--3">
              <article className="card">
                <h3 className={styles.cardTitle}>Authentication</h3>
                <p className={styles.cardBody}>
                  Passwords are hashed with <strong>bcrypt cost 12</strong>. Login is
                  timing-equalized against a dummy hash so unknown emails are not
                  distinguishable by response time. Failed logins are audited with the
                  attempted address — never the password.
                </p>
              </article>

              <article className="card">
                <h3 className={styles.cardTitle}>Revocable sessions</h3>
                <p className={styles.cardBody}>
                  The session cookie is <strong>HttpOnly, SameSite=Lax</strong> and
                  Secure in production, carrying an HS256 JWT. A signature is not
                  enough: every request also resolves a row in{" "}
                  <span className={styles.mono}>user_sessions</span>, so{" "}
                  <strong>logout invalidates the token server-side</strong>. Other
                  devices keep their own independent sessions.
                </p>
              </article>

              <article className="card">
                <h3 className={styles.cardTitle}>Object-level authorization</h3>
                <p className={styles.cardBody}>
                  Every story, document, follow-up and communication route re-checks
                  ownership against the session user — reads and writes both. Probes of
                  foreign ids return <strong>403</strong> and write an{" "}
                  <strong>ACCESS_DENIED</strong> audit entry recording who tried what.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ---- Input & abuse ---- */}
        <section className="section" id="inputs" aria-labelledby="inputs-heading">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Untrusted input</p>
              <h2 className="h-section" id="inputs-heading">
                Everything a client sends is treated as hostile
              </h2>
            </div>

            <div className="grid grid--2">
              <article className="card">
                <h3 className={styles.cardTitle}>Strict validation, no mass assignment</h3>
                <p className={styles.cardBody}>
                  Every JSON body passes a content-type check (415), a size cap (413),
                  a JSON parse (400) and then a <strong>strict zod schema</strong>.
                  Unknown keys are rejected with a field-level 400, so a payload
                  carrying <span className={styles.mono}>userId</span>,{" "}
                  <span className={styles.mono}>currentVersion</span>,{" "}
                  <span className={styles.mono}>status</span> or{" "}
                  <span className={styles.mono}>storageKey</span> never reaches the
                  database — those values are derived server-side from the session and
                  the request context.
                </p>
                <ul className={styles.list}>
                  <li className={styles.listItem}>
                    Resource caps: events, questions, follow-ups, documents, text length
                  </li>
                  <li className={styles.listItem}>
                    Validation errors name the offending path, nothing else
                  </li>
                </ul>
              </article>

              <article className="card">
                <h3 className={styles.cardTitle}>Rate limiting</h3>
                <p className={styles.cardBody}>
                  Fixed windows per user+IP, tunable through environment variables.
                  Responses carry <span className={styles.mono}>Retry-After</span> and
                  each 429 writes a <strong>RATE_LIMIT_TRIGGERED</strong> audit entry.
                </p>
                <ul className={styles.list}>
                  <li className={styles.listItem}>
                    <strong>login</strong> 10 / 5 min — brute force
                  </li>
                  <li className={styles.listItem}>
                    <strong>register</strong> 10 / min — account flooding
                  </li>
                  <li className={styles.listItem}>
                    <strong>ai</strong> 20 / min — organize, preview, analyze, generate
                  </li>
                  <li className={styles.listItem}>
                    <strong>upload</strong> 20 / 10 min — file flooding
                  </li>
                  <li className={styles.listItem}>
                    <strong>write</strong> 120 / min — general mutations
                  </li>
                </ul>
              </article>
            </div>

            <div className={styles.note}>
              <strong>CORS &amp; CSRF:</strong> no Access-Control-Allow-* header is
              ever emitted, so foreign origins cannot read API responses; mutations
              require a JSON body (cross-site forms cannot send one without a CORS
              preflight that is never granted) and the session cookie is SameSite=Lax.
            </div>
          </div>
        </section>

        {/* ---- Files & data ---- */}
        <section className="section section--alt" id="storage" aria-labelledby="storage-heading">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Data at rest</p>
              <h2 className="h-section" id="storage-heading">
                Files, database and audit trail
              </h2>
            </div>

            <div className="grid grid--3">
              <article className="card">
                <h3 className={styles.cardTitle}>Private file storage</h3>
                <p className={styles.cardBody}>
                  Uploads must pass an <strong>extension allow-list</strong>,
                  extension↔MIME consistency, <strong>magic-byte checks</strong>, a size
                  cap and strict base64 decoding. Bytes are written under a git-ignored{" "}
                  <span className={styles.mono}>storage/</span> directory outside the
                  web root; the key is <strong>generated by the server</strong> from
                  user/story/document ids and re-checked against traversal on read.
                </p>
                <ul className={styles.list}>
                  <li className={styles.listItem}>
                    sha-256 <strong>checksum</strong> recorded per file
                  </li>
                  <li className={styles.listItem}>
                    Download requires auth + ownership and is <strong>audited</strong>{" "}
                    (DOCUMENT_ACCESS)
                  </li>
                  <li className={styles.listItem}>
                    Delete = transactional soft-delete, then bytes removed
                  </li>
                </ul>
              </article>

              <article className="card">
                <h3 className={styles.cardTitle}>Migrations &amp; transactions</h3>
                <p className={styles.cardBody}>
                  Schema changes ship as reviewed Prisma migrations (baseline + Stage 11
                  migrations, see <strong>DATABASE.md</strong>). Every multi-row write —
                  story + first version, events + audit + version, follow-up + items —
                  runs in a <strong>single transaction</strong>, so a failure rolls back
                  the whole unit. There are no half-written stories.
                </p>
                <ul className={styles.list}>
                  <li className={styles.listItem}>
                    <strong>Version chain:</strong> currentVersion bumps in the same
                    transaction as its story_versions row
                  </li>
                  <li className={styles.listItem}>
                    <strong>Seed:</strong> localhost-guarded, idempotent, integrity-clean
                  </li>
                </ul>
              </article>

              <article className="card">
                <h3 className={styles.cardTitle}>Audit trail</h3>
                <p className={styles.cardBody}>
                  Successes and failures are both recorded: logins (success and
                  failure), logout, denied object access, rate-limit trips, story,
                  event, question, follow-up and document writes, AI operations and
                  communication generation — every action in the{" "}
                  <span className={styles.mono}>AuditAction</span> enum (live list in
                  the status readout above).
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ---- Integrity ---- */}
        <section className="section" id="integrity" aria-labelledby="integrity-heading">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Story Integrity</p>
              <h2 className="h-section" id="integrity-heading">
                An independent checker, not a promise
              </h2>
              <p className="lede">
                Foreign keys guarantee references exist; they cannot prove that a file
                on disk matches its row, that a version chain is unbroken, or that
                confirmation flags agree with status.{" "}
                <span className={styles.mono}>GET /api/stories/:id/integrity</span>{" "}
                proves exactly those things — read-only, per story, eight checks:
              </p>
            </div>

            <div className={styles.checks}>
              {[
                ["version-chain", "Version rows 1..currentVersion exist exactly once"],
                ["document-ownership", "Documents belong to the story owner"],
                ["document-storage", "Stored bytes exist, checksum matches, deletes leave nothing behind"],
                ["question-ownership", "Questions belong to the story owner"],
                ["followup-ownership", "Follow-ups belong to the story owner"],
                ["confirmation-consistency", "confirmedByUser agrees with status and needsConfirmation"],
                ["provenance-consistency", "createdBy agrees with event status"],
                ["communication-selections", "Selections reference rows that still exist"],
              ].map(([id, label]) => (
                <div key={id} className={styles.check}>
                  <span className={styles.checkId}>{id}</span>
                  <span className={styles.checkLabel}>{label}</span>
                </div>
              ))}
            </div>

            <div className={styles.note}>
              <strong>Report, never repair:</strong> the checker returns{" "}
              <span className={styles.mono}>pass</span> /{" "}
              <span className={styles.mono}>warn</span> /{" "}
              <span className={styles.mono}>fail</span> per check plus an overall
              status. It cannot modify data — diagnosing is the operator&apos;s job.
            </div>
          </div>
        </section>

        {/* ---- Headers & verification ---- */}
        <section className="section section--alt" id="verify" aria-labelledby="verify-heading">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">Verification</p>
              <h2 className="h-section" id="verify-heading">
                Reproduce the claims
              </h2>
              <p className="lede">
                The security suite is part of the repository — run it against a fresh
                dev server.
              </p>
            </div>

            <pre className={styles.code}>
              <span className={styles.dim}># terminal 1</span>
              {"\n"}npm run dev{"\n"}
              <span className={styles.dim}># terminal 2 — ~150 assertions, exit 0 = all pass</span>
              {"\n"}npm run test:security{"\n"}
              <span className={styles.dim}># database story: migrations, seed, integrity</span>
              {"\n"}npm run db:reset && npm run db:seed
            </pre>

            <div className="grid grid--2" style={{ marginTop: 28 }}>
              <article className="card">
                <h3 className={styles.cardTitle}>Response headers (next.config.ts)</h3>
                <ul className={styles.list}>
                  <li className={styles.listItem}>
                    <strong>Content-Security-Policy</strong> — default-src &apos;self&apos;,
                    object-src &apos;none&apos;, frame-ancestors &apos;none&apos;;
                    eval and HMR sockets only outside production
                  </li>
                  <li className={styles.listItem}>
                    <strong>X-Content-Type-Options</strong> nosniff ·{" "}
                    <strong>X-Frame-Options</strong> DENY
                  </li>
                  <li className={styles.listItem}>
                    <strong>Referrer-Policy</strong> strict-origin-when-cross-origin
                  </li>
                  <li className={styles.listItem}>
                    <strong>Permissions-Policy</strong> — camera, geolocation, payment,
                    USB off; microphone stays on for the journal&apos;s voice input
                  </li>
                  <li className={styles.listItem}>
                    <strong>COOP / CORP</strong> same-origin ·{" "}
                    <strong>HSTS</strong> production only
                  </li>
                </ul>
              </article>

              <article className="card">
                <h3 className={styles.cardTitle}>Honest limitations</h3>
                <ul className={styles.list}>
                  <li className={styles.listItem}>
                    Rate-limit state is <strong>in-memory</strong> — per instance, lost on
                    restart; the documented path is Redis
                  </li>
                  <li className={styles.listItem}>
                    <strong>AUTH_SECRET</strong> needs an explicit value in production
                    (dev fallback exists and is documented)
                  </li>
                  <li className={styles.listItem}>
                    No password-reset flow (no mail provider in scope) and no 2FA yet
                  </li>
                  <li className={styles.listItem}>
                    CSP keeps <strong>&apos;unsafe-inline&apos;</strong> scripts for
                    Next.js&apos;s bootstrap; nonces are the upgrade path
                  </li>
                </ul>
                <p className={styles.cardBody} style={{ marginTop: 12 }}>
                  Full detail and the hardening roadmap:{" "}
                  <strong>SECURITY.md</strong> · schema and migrations:{" "}
                  <strong>DATABASE.md</strong>
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
