"use client";

import { useEffect, useState } from "react";
import styles from "./security.module.css";

/**
 * Stage 11 — live security posture panel.
 *
 * Fetches GET /api/security/status (facts only: configuration and
 * reachability, never counts or user data) and renders it. If the
 * endpoint is unreachable the panel says so honestly instead of
 * pretending everything is fine.
 */

interface StatusPayload {
  generatedAt: string;
  authentication: {
    strategy: string;
    revokesOnLogout: boolean;
    passwordHashing: string;
    cookie: { name: string; httpOnly: boolean; sameSite: string; secure: boolean; maxAgeSeconds: number };
  };
  authorization: { model: string; deniedAccessAudited: boolean };
  requestValidation: {
    library: string;
    mode: string;
    maxJsonBytes: number;
    maxUploadBytes: number;
    resourceLimits: Record<string, number>;
  };
  rateLimiting: { implementation: string; buckets: Record<string, { limit: number; windowMs: number }> };
  files: {
    storage: string;
    serverGeneratedKeys: boolean;
    validation: string[];
    allowedTypes: string[];
    download: string;
  };
  database: { provider: string; reachable: boolean; appliedMigrations: number; migrationsDirectory: string };
  headers: { configuredIn: string; list: string[] };
  auditTrail: { actions: string[]; recorded: string[] };
  integrity: { endpoint: string; checks: Array<{ id: string; label: string }> };
}

const fmtWindow = (ms: number): string => {
  if (ms % 60000 === 0) {
    const min = ms / 60000;
    return min === 60 ? "1 h" : `${min} min`;
  }
  return `${Math.round(ms / 1000)} s`;
};

const fmtBytes = (n: number): string => `${Math.round(n / 1024)} KB`;

export default function SecurityStatus() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/security/status", { headers: { Accept: "application/json" } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { success: boolean; data: StatusPayload };
        if (!cancelled) {
          if (json.success) setData(json.data);
          else setError("unexpected response shape");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message || e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>Live security status</span>
        </div>
        <p className={styles.panelNote}>
          The status endpoint could not be reached ({error}). The static description
          below reflects the code in this repository; start the dev server to see live
          values.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>Live security status</span>
          <span className={styles.liveTag}>Loading…</span>
        </div>
        <p className={styles.panelNote}>Querying GET /api/security/status …</p>
      </div>
    );
  }

  const buckets = Object.entries(data.rateLimiting.buckets);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelTitle}>Live security status</span>
        <span className={styles.liveTag}>GET /api/security/status</span>
      </div>
      <p className={styles.panelNote}>
        Fetched from this deployment at {new Date(data.generatedAt).toLocaleTimeString()} — configuration
        and reachability only, no user data.
      </p>

      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Database</span>
          <span className={styles.rowValue}>
            <span className={`${styles.state} ${data.database.reachable ? styles.stateOk : styles.stateErr}`}>
              {data.database.reachable ? "reachable" : "unreachable"}
            </span>
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Migrations applied</span>
          <span className={`${styles.rowValue} ${styles.mono}`}>
            {data.database.reachable ? `${data.database.appliedMigrations} in ${data.database.migrationsDirectory}` : "—"}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Password hashing</span>
          <span className={styles.rowValue}>{data.authentication.passwordHashing}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Session cookie</span>
          <span className={`${styles.rowValue} ${styles.mono}`}>
            {data.authentication.cookie.name} · {data.authentication.cookie.httpOnly ? "HttpOnly" : "JS-readable"} ·{" "}
            SameSite={data.authentication.cookie.sameSite}
            {data.authentication.cookie.secure ? " · Secure" : ""}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Logout revokes sessions</span>
          <span className={styles.rowValue}>
            <span className={`${styles.state} ${data.authentication.revokesOnLogout ? styles.stateOk : styles.stateErr}`}>
              {data.authentication.revokesOnLogout ? "server-side" : "no"}
            </span>
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Request validation</span>
          <span className={styles.rowValue}>{data.requestValidation.mode}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>JSON / upload caps</span>
          <span className={`${styles.rowValue} ${styles.mono}`}>
            {fmtBytes(data.requestValidation.maxJsonBytes)} / {fmtBytes(data.requestValidation.maxUploadBytes)}
          </span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>File storage</span>
          <span className={styles.rowValue}>{data.files.storage}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Allowed file types</span>
          <span className={`${styles.rowValue} ${styles.mono}`}>{data.files.allowedTypes.join(" ")}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Audit actions defined</span>
          <span className={`${styles.rowValue} ${styles.mono}`}>{data.auditTrail.actions.length}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Response headers</span>
          <span className={`${styles.rowValue} ${styles.mono}`}>{data.headers.list.join(", ")}</span>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Rate-limit bucket</th>
              <th>Requests</th>
              <th>Window</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map(([name, b]) => (
              <tr key={name}>
                <td className={styles.mono}>{name}</td>
                <td>{b.limit}</td>
                <td>{fmtWindow(b.windowMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.checks}>
        {data.integrity.checks.map((c) => (
          <div key={c.id} className={styles.check}>
            <span className={styles.checkId}>{c.id}</span>
            <span className={styles.checkLabel}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
