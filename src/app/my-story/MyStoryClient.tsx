"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { AlertIcon, LockIcon } from "@/components/icons";
import styles from "./my-story.module.css";

export default function MyStoryClient() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/my-story")}`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className={styles.loading} role="status" aria-label="Loading">
        <div className={styles.spinner} />
        <p>Loading your health story…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.locked}>
        <LockIcon size={48} className={styles.lockIcon} />
        <h1 className={styles.title}>Sign in required</h1>
        <p className={styles.message}>
          Your health story is private. Please sign in to access it.
        </p>
        <a href={`/login?callbackUrl=${encodeURIComponent("/my-story")}`} className={styles.cta}>
          Sign in to continue
        </a>
      </div>
    );
  }

  // This won't render since we redirect, but TypeScript needs it
  return null;
}