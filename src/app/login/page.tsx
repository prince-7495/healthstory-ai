"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { AlertIcon, MailIcon, LockIcon, LogoMark } from "@/components/icons";
import styles from "./auth.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const callbackUrl = searchParams.get("callbackUrl") || "/my-story";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      router.push(callbackUrl);
      router.refresh();
    } else {
      setError(result.error || "Login failed");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <a href="/" className={styles.logo}>
            <LogoMark size={26} />
            HealthStory AI
          </a>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to continue your health story</p>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            <AlertIcon size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              <MailIcon size={18} className={styles.icon} />
              <span>Email</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              <LockIcon size={18} className={styles.icon} />
              <span>Password</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className={styles.footer}>
          Don't have an account? <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-loading">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}