"use client";

import { useState } from "react";
import { INSIGHTS_OPTIONS } from "@/lib/insights/options";
import type { InventoryItem, TopicCluster } from "@/lib/insights/insights";
import type { StoryFeedItem } from "@/lib/insights/types";
import type { StoryNode } from "@/lib/insights/types";
import { ArchiveIcon, CheckIcon, ClipboardIcon, EyeIcon, ListIcon, ShieldIcon, SparkIcon } from "../icons";
import styles from "./insights.module.css";

type Props = {
  clusters: TopicCluster[];
  inventory: InventoryItem[];
  feed: StoryFeedItem[];
  openQuestionCount: number;
  onSelectNode: (node: StoryNode) => void;
};

function whenLabel(iso: string): string {
  const d = new Date(iso.length >= 10 ? iso.slice(0, 10) : iso);
  if (Number.isNaN(d.getTime())) return "—";
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  if (fmt(d) === fmt(today)) return "Today";
  if (fmt(d) === fmt(yesterday)) return "Yesterday";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const memberLabel: Record<string, { label: string; icon: React.ReactNode }> = {
  EVENT: { label: "Event", icon: <ClipboardIcon size={12} /> },
  FOLLOW_UP: { label: "Follow-up", icon: <ArchiveIcon size={12} /> },
  DOCUMENT: { label: "Document", icon: <EyeIcon size={12} /> },
  QUESTION: { label: "Question", icon: <ListIcon size={12} /> },
};

/**
 * EvidenceExplorer — the accessible, list-based alternative to the graph.
 * Every relationship is reachable through text.
 */
export default function EvidenceExplorer({
  clusters,
  inventory,
  feed,
  openQuestionCount,
  onSelectNode,
}: Props) {
  const o = INSIGHTS_OPTIONS;
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (id: string) => setOpenKey((k) => (k === id ? null : id));

  return (
    <div className={styles.layout} style={{ gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)" }}>
      <div className={styles.col}>
        <section className={styles.panel} aria-labelledby="evidence-topics">
          <div className={styles.panelHead}>
            <ListIcon size={16} />
            <h3 className={styles.panelTitle} id="evidence-topics">{o.evidence.perTopicHeading}</h3>
          </div>
          <div className={styles.panelBody}>
            {clusters.length === 0 ? (
              <p className={styles.sub}>{o.evidence.noTopics}</p>
            ) : (
              <div className={styles.clusterList}>
                {clusters.map((c) => {
                  const members = [
                    ...c.events.map((n) => ({ node: n, type: "EVENT" as const })),
                    ...c.followUps.map((n) => ({ node: n, type: "FOLLOW_UP" as const })),
                    ...c.documents.map((n) => ({ node: n, type: "DOCUMENT" as const })),
                    ...c.questions.map((n) => ({ node: n, type: "QUESTION" as const })),
                  ];
                  const countLine = [
                    c.events.length ? `${c.events.length} recorded entr${c.events.length === 1 ? "y" : "ies"}` : null,
                    c.documents.length ? `${c.documents.length} document${c.documents.length > 1 ? "s" : ""}` : null,
                    c.followUps.length ? `${c.followUps.length} follow-up${c.followUps.length > 1 ? "s" : ""}` : null,
                    c.questions.length ? `${c.questions.length} question${c.questions.length > 1 ? "s" : ""}` : null,
                  ]
                    .filter((x): x is string => Boolean(x))
                    .join(" · ");
                  return (
                    <div key={c.topicNode.id} className={styles.clusterRow}>
                      <button type="button" className={styles.clusterHead} onClick={() => toggle(c.topicNode.id)} aria-expanded={openKey === c.topicNode.id}>
                        <span style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                          <span className={styles.clusterName}>{c.topicNode.title}</span>
                          <span className={styles.clusterCountsLine}>{countLine}</span>
                        </span>
                        <span className={styles.clusterExpand}>
                          {openKey === c.topicNode.id ? "−" : "+"}
                        </span>
                      </button>
                      {openKey === c.topicNode.id ? (
                        <div className={styles.clusterMembers}>
                          {members.map((m) => (
                            <button
                              key={`${m.node.id}_${m.type}`}
                              type="button"
                              className={styles.memberRow}
                              style={{ textAlign: "left", cursor: "pointer" }}
                              onClick={() => onSelectNode(m.node)}
                            >
                              <span className={styles.memberType}>
                                {memberLabel[m.type]?.icon ?? null} {memberLabel[m.type]?.label ?? m.type}
                              </span>
                              <span className={styles.memberText}>{m.node.title}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            <p className={styles.note} style={{ marginTop: 12 }}>
              {o.evidence.sub}
            </p>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="evidence-inventory">
          <div className={styles.panelHead}>
            <CheckIcon size={16} />
            <h3 className={styles.panelTitle} id="evidence-inventory">{o.evidence.invent}</h3>
          </div>
          <div className={styles.panelBody}>
            {inventory.map((item) => (
              <div key={item.label} className={styles.inventoryRow}>
                <span>{item.label}</span>
                <span className={styles.inventoryCount}>{item.count}</span>
              </div>
            ))}
            <p className={styles.note} style={{ marginTop: 12 }}>
              This is an inventory of what you have chosen to record — it is not a statement about your health.
            </p>
          </div>
        </section>
      </div>

      <div className={styles.col}>
        <section className={styles.panel} aria-labelledby="evidence-activity">
          <div className={styles.panelHead}>
            <SparkIcon size={16} />
            <h3 className={styles.panelTitle} id="evidence-activity">{o.activity.heading}</h3>
            <span className={styles.panelCount}>{openQuestionCount} open</span>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.feed}>
              {feed.length === 0 ? (
                <p className={styles.sub}>{o.activity.empty}</p>
              ) : (
                feed.slice(0, 14).map((item) => (
                  <div key={item.id} className={styles.feedItem}>
                    <span className={styles.feedWhen}>{whenLabel(item.at)}</span>
                    <span className={styles.feedBody}>
                      <span className={styles.feedHead}>
                        {item.headline}
                        <span className={styles.verbTag} data-verb={item.verb}>
                          {o.activity.verbs[item.verb]}
                        </span>
                      </span>
                      {item.detail ? <span className={styles.feedDetail}>{item.detail}</span> : null}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="evidence-trust">
          <div className={styles.panelHead}>
            <ShieldIcon size={16} />
            <h3 className={styles.panelTitle} id="evidence-trust">{o.trust.heading}</h3>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.trustFlow}>
              {o.trust.flow.map((step, i) => (
                <span key={step}>
                  <span className={styles.trustStep}>
                    <span className={styles.trustStepNum}>{i + 1}</span>
                    {step}
                  </span>
                  {i < o.trust.flow.length - 1 ? <span className={styles.trustArrow}>↓</span> : null}
                </span>
              ))}
            </div>
            <hr className={styles.trustLine} />
            <p className={styles.sub}>
              <strong>{o.trust.sourceFirst}</strong>
            </p>
            <p className={styles.trustPrinciple}>{o.trust.evidenceExplain}</p>
            <p className={styles.trustPrinciple}>{o.trust.humansVerify}</p>
            <p className={styles.trustPrinciple}>{o.trust.usersControl}</p>
            <p className={styles.trustPrinciple} style={{ color: "var(--brand-700)", fontWeight: 700 }}>
              {o.trust.final}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}