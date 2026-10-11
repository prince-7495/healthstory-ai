import type { Metadata } from "next";
import HealthStoryApp from "@/components/workspace/HealthStoryApp";

export const metadata: Metadata = {
  title: "Your Health Story",
  description:
    "Tell your health story in your own words. HealthStory AI organizes what you write into a structured timeline you can understand and discuss with a healthcare professional. It does not provide a medical diagnosis.",
  robots: { index: false, follow: false },
};

/**
 * Stage 2 — the Health Story Workspace.
 *
 * A server component that does nothing but mount the client workspace.
 * All state lives in memory in the browser and is never persisted: no
 * localStorage, no cookies, no analytics on this route, so nothing about
 * a user's health is written to disk by this page.
 */
export default function WorkspacePage() {
  return <HealthStoryApp />;
}