"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Direction of the entrance motion. */
  from?: "up" | "left" | "right" | "scale";
  /** Stagger in milliseconds. */
  delay?: number;
  as?: ElementType;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
};

/**
 * Reveal — one shared IntersectionObserver drives every entrance
 * animation on the page. Elements start hidden (see `[data-reveal]`
 * in globals.css) and are unhidden once, the first time they enter
 * the viewport. Users with `prefers-reduced-motion` never see the
 * animation at all because CSS overrides it.
 */
let observer: IntersectionObserver | null = null;
const registry = new WeakMap<Element, () => void>();

function getObserver() {
  if (observer || typeof window === "undefined") return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        registry.get(entry.target)?.();
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
  );
  return observer;
}

export default function Reveal({
  children,
  from = "up",
  delay = 0,
  as: Tag = "div",
  className,
  id,
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    const obs = getObserver();
    if (!node || !obs) return;

    if (typeof IntersectionObserver === "undefined") {
      node.classList.add("is-in");
      return;
    }

    registry.set(node, () => registry.delete(node));
    obs.observe(node);

    return () => {
      obs.unobserve(node);
      registry.delete(node);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      id={id}
      className={className}
      data-reveal={from}
      style={{ ...style, "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}