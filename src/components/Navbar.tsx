"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { brand, nav } from "@/lib/content";
import { CloseIcon, LogoMark, MenuIcon, ArrowRightIcon } from "./icons";
import styles from "./navbar.module.css";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Compact the bar once the hero starts leaving.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll + allow Escape to close while the menu is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className={styles.wrap} data-scrolled={scrolled || undefined}>
      <div className={styles.inner}>
        <a href="#top" className={styles.brand} aria-label={`${brand.name} — home`}>
          <LogoMark size={30} />
          <span className={styles.brandText}>{brand.name}</span>
        </a>

        <nav className={styles.links} aria-label="Primary">
          {nav.links.map((l) =>
            l.href.startsWith("/") ? (
              <Link key={l.href} href={l.href} className={styles.link}>
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href} className={styles.link}>
                {l.label}
              </a>
            ),
          )}
        </nav>

        <div className={styles.actions}>
          <Link href="/workspace" className={`btn btn--primary ${styles.cta}`} aria-label={nav.cta}>
            <span className={styles.ctaFull}>{nav.cta}</span>
            <span className={styles.ctaShort} aria-hidden="true">Start</span>
            <ArrowRightIcon size={17} className="btn__arrow" />
          </Link>

          <button
            type="button"
            className={styles.burger}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={styles.mobile}
        data-open={open || undefined}
        hidden={!open}
      >
        <nav className={styles.mobileLinks} aria-label="Primary mobile">
          {nav.links.map((l, i) =>
            l.href.startsWith("/") ? (
              <Link
                key={l.href}
                href={l.href}
                className={styles.mobileLink}
                style={{ transitionDelay: open ? `${60 + i * 45}ms` : "0ms" }}
                onClick={() => setOpen(false)}
              >
                <span className={styles.mobileIndex}>0{i + 1}</span>
                {l.label}
                <ArrowRightIcon size={17} />
              </Link>
            ) : (
              <a
                key={l.href}
                href={l.href}
                className={styles.mobileLink}
                style={{ transitionDelay: open ? `${60 + i * 45}ms` : "0ms" }}
                onClick={() => setOpen(false)}
              >
                <span className={styles.mobileIndex}>0{i + 1}</span>
                {l.label}
                <ArrowRightIcon size={17} />
              </a>
            ),
          )}
        </nav>
        <Link
          href="/workspace"
          className={`btn btn--primary ${styles.mobileCta}`}
          onClick={() => setOpen(false)}
        >
          {nav.cta}
          <ArrowRightIcon size={17} className="btn__arrow" />
        </Link>
        <p className={styles.mobileNote}>
          Informational and communication tool — not a substitute for
          professional medical care.
        </p>
      </div>
    </header>
  );
}
