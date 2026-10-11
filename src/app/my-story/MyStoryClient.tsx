"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { AlertIcon, LockIcon, SparkIcon, ListIcon, ArrowRightIcon } from "@/components/icons";
import styles from "./my-story.module.css";

interface StoryItem {
  id: string;
  title: string;
  language: string;
  status: string;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    events: number;
    documents: number;
    followUps: number;
    questions: number;
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return formatDate(iso);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT:       { label: "Draft",     cls: styles.badgeDraft },
    ACTIVE:      { label: "Active",    cls: styles.badgeActive },
    ARCHIVED:    { label: "Archived",  cls: styles.badgeArchived },
    COMPLETED:   { label: "Complete",  cls: styles.badgeComplete },
  };
  const { label, cls } = map[status] ?? { label: status, cls: styles.badgeDraft };
  return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

export default function MyStoryClient() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [stories, setStories]         = useState<StoryItem[]>([]);
  const [fetching, setFetching]       = useState(false);
  const [fetchError, setFetchError]   = useState<string | null>(null);

  const loadStories = useCallback(async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const res  = await fetch("/api/stories", { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setStories(json.data);
      } else {
        setFetchError(json.error?.message ?? "Could not load stories.");
      }
    } catch {
      setFetchError("Network error — please try again.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/my-story")}`);
    }
    if (!loading && user) {
      loadStories();
    }
  }, [user, loading, router, loadStories]);

  // ── Loading auth ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.loading} role="status" aria-label="Loading">
        <div className={styles.spinner} />
        <p>Loading your health story…</p>
      </div>
    );
  }

  // ── Not authenticated ─────────────────────────────────────────────────────
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

  // ── Authenticated — story history page ───────────────────────────────────
  return (
    <div className={styles.page}>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <SparkIcon size={22} className={styles.pageIcon} />
          <div>
            <h1 className={styles.pageTitle}>My Health Story</h1>
            <p className={styles.pageSubtitle}>A timeline of the information you&apos;ve chosen to record.</p>
          </div>
        </div>
        <Link href="/workspace" className={styles.newBtn}>
          + New Story
        </Link>
      </div>

      {/* Tabs / meta row */}
      <div className={styles.metaRow}>
        <span className={styles.metaTag}>
          <SparkIcon size={12} /> HealthStory Journal
        </span>
        <span className={`${styles.metaTag} ${styles.metaTagDemo}`}>
          Fictional demonstration data
        </span>
        <span className={styles.metaTag}>
          🔒 Private
        </span>
        <span className={styles.metaCount}>
          {stories.length} {stories.length === 1 ? "story" : "stories"}
        </span>
      </div>

      {/* Stories list */}
      <div className={styles.storyList}>
        {fetching && (
          <div className={styles.fetchingRow}>
            <div className={styles.spinnerSm} />
            <span>Loading your stories…</span>
          </div>
        )}

        {fetchError && !fetching && (
          <div className={styles.errorRow}>
            <AlertIcon size={18} />
            <span>{fetchError}</span>
            <button onClick={loadStories} className={styles.retryBtn}>Retry</button>
          </div>
        )}

        {!fetching && !fetchError && stories.length === 0 && (
          <div className={styles.emptyState}>
            <ListIcon size={40} className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>No stories yet</h2>
            <p className={styles.emptyMsg}>
              Start your first HealthStory — it only takes a few minutes.
            </p>
            <Link href="/workspace" className={styles.cta}>
              Start your story
            </Link>
          </div>
        )}

        {!fetching && stories.map((story, i) => (
          <div key={story.id} className={`${styles.storyCard} ${i === 0 ? styles.storyCardCurrent : ""}`}>
            <div className={styles.storyCardLeft}>
              <div className={styles.storyCardTitleRow}>
                <span className={styles.storyCardTitle}>{story.title || "Untitled story"}</span>
                {i === 0 && <span className={styles.currentBadge}>Current</span>}
                <StatusBadge status={story.status} />
              </div>
              <div className={styles.storyCardMeta}>
                <span>Version {story.currentVersion}</span>
                <span className={styles.dot}>·</span>
                <span>{story.language?.toUpperCase() ?? "EN"}</span>
                <span className={styles.dot}>·</span>
                <span>Updated {timeAgo(story.updatedAt)}</span>
                <span className={styles.dot}>·</span>
                <span>Created {formatDate(story.createdAt)}</span>
              </div>
              <div className={styles.storyCardCounts}>
                {story._count.events > 0 && (
                  <span className={styles.countChip}>{story._count.events} event{story._count.events !== 1 ? "s" : ""}</span>
                )}
                {story._count.documents > 0 && (
                  <span className={styles.countChip}>{story._count.documents} doc{story._count.documents !== 1 ? "s" : ""}</span>
                )}
                {story._count.questions > 0 && (
                  <span className={styles.countChip}>{story._count.questions} question{story._count.questions !== 1 ? "s" : ""}</span>
                )}
                {story._count.followUps > 0 && (
                  <span className={styles.countChip}>{story._count.followUps} follow-up{story._count.followUps !== 1 ? "s" : ""}</span>
                )}
              </div>
            </div>
            <div className={styles.storyCardRight}>
              <Link href="/workspace" className={styles.openBtn}>
                Open <ArrowRightIcon size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      {stories.length > 0 && (
        <p className={styles.footerNote}>
          Your health story is private and stored securely. It is never shared without your action.
        </p>
      )}
    </div>
  );
}
