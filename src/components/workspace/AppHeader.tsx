"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { brand } from "@/lib/content";
import { ArrowRightIcon, LogoMark, SparkIcon, ListIcon, ChevronDownIcon } from "../icons";
import { WORKSPACE } from "@/lib/health/options";
import styles from "./workspace.module.css";

interface StoryItem {
  id: string;
  title: string;
  status: string;
  currentVersion: number;
  updatedAt: string;
  _count: { events: number; documents: number; questions: number; followUps: number };
}

function timeAgo(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * AppHeader — the workspace chrome.
 *
 * Deliberately calmer than the landing navbar: the user is inside the
 * product now, so the job of this bar is orientation (where am I, what
 * stage am I at, how do I get out), not persuasion.
 *
 * The "Stories" dropdown lets users glance at / switch between past stories
 * without leaving the workspace.
 */
export default function AppHeader() {
  const [open, setOpen]         = useState(false);
  const [stories, setStories]   = useState<StoryItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const menuRef                 = useRef<HTMLDivElement>(null);

  // Fetch stories when the dropdown opens (once per mount)
  const fetchStories = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/stories", { credentials: "include" });
      const json = await res.json();
      if (json.success) setStories(json.data.slice(0, 6));
    } catch { /* silently ignore — user may not be logged in */ }
    finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [loaded]);

  const toggle = () => {
    setOpen((v) => !v);
    if (!open) fetchStories();
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerInner}`}>
        <Link href="/" className={styles.brand} aria-label={`${brand.name} — home`}>
          <LogoMark size={28} />
          <span className={styles.brandText}>{brand.name}</span>
        </Link>

        <div className={styles.headerTitle}>
          <span className={styles.headerLabel}>{brand.name}</span>
          <span className={styles.headerSub}>{WORKSPACE.headerLabel}</span>
        </div>

        <div className={styles.headerRight}>
          {/* ── Stories dropdown ────────────────────────────────── */}
          <div className={styles.storiesMenu} ref={menuRef}>
            <button
              type="button"
              className={`${styles.backLink} ${styles.storiesBtn}`}
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label="View past stories"
            >
              <ListIcon size={15} />
              My Stories
              <ChevronDownIcon
                size={13}
                style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}
              />
            </button>

            {open && (
              <div className={styles.storiesDropdown} role="menu">
                <div className={styles.storiesDropdownHead}>
                  <span className={styles.storiesDropdownTitle}>Past & Current Stories</span>
                  <Link
                    href="/my-story"
                    className={styles.storiesViewAll}
                    onClick={() => setOpen(false)}
                  >
                    View all →
                  </Link>
                </div>

                {loading && (
                  <div className={styles.storiesDropdownLoading}>
                    <div className={styles.storiesSpinner} />
                    <span>Loading…</span>
                  </div>
                )}

                {!loading && stories.length === 0 && (
                  <div className={styles.storiesDropdownEmpty}>
                    <SparkIcon size={18} style={{ opacity: 0.35 }} />
                    <p>No stories yet.</p>
                    <Link
                      href="/workspace"
                      className={styles.storiesStartBtn}
                      onClick={() => setOpen(false)}
                    >
                      Start your story
                    </Link>
                  </div>
                )}

                {!loading && stories.length > 0 && (
                  <ul className={styles.storiesDropdownList} role="none">
                    {stories.map((s, i) => (
                      <li key={s.id} role="none">
                        <Link
                          href="/workspace"
                          className={`${styles.storiesDropdownItem} ${i === 0 ? styles.storiesDropdownItemCurrent : ""}`}
                          role="menuitem"
                          onClick={() => setOpen(false)}
                        >
                          <div className={styles.storiesDropdownItemLeft}>
                            <span className={styles.storiesDropdownItemTitle}>
                              {s.title || "Untitled story"}
                              {i === 0 && <span className={styles.storiesDropdownItemNew}>Current</span>}
                            </span>
                            <span className={styles.storiesDropdownItemMeta}>
                              v{s.currentVersion} · {s._count.events} events · {timeAgo(s.updatedAt)}
                            </span>
                          </div>
                          <ArrowRightIcon size={13} className={styles.storiesDropdownItemArrow} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <div className={styles.storiesDropdownFoot}>
                  <Link
                    href="/my-story"
                    className={styles.storiesDropdownFootLink}
                    onClick={() => setOpen(false)}
                  >
                    Full story history →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ── My Story link ────────────────────────────────────── */}
          <Link href="/my-story" className={styles.backLink}>
            <SparkIcon size={15} />
            My Story
          </Link>

          {/* ── Back to site ─────────────────────────────────────── */}
          <Link href="/" className={styles.backLink}>
            <ArrowRightIcon size={16} className={styles.backArrow} />
            {WORKSPACE.backToSite}
          </Link>
        </div>
      </div>
    </header>
  );
}
