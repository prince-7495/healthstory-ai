import type { Metadata } from "next";
import MyStoryClient from "./MyStoryClient";

export const metadata: Metadata = {
  title: "My Health Story",
  description:
    "Your longitudinal HealthStory journal — add updates over time, see what changed, and prepare clearer healthcare conversations. It does not provide a medical diagnosis.",
  robots: { index: false, follow: false },
};

/**
 * Stage 5 — the longitudinal HealthStory Journal.
 *
 * A server component that mounts the client journal. The journal is
 * stored on the user's own device (localStorage) so they can return and
 * continue their story. Nothing is sent to a server.
 */
export default function MyStoryPage() {
  return <MyStoryClient />;
}
