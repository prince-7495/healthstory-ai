"use client";

import { useState } from "react";
import { INSIGHTS_OPTIONS } from "@/lib/insights/options";
import type { StoryNode } from "@/lib/insights/types";
import {
  ArrowRightIcon,
  ChatIcon,
  CheckIcon,
  CloseIcon,
  DocumentIcon,
  EyeIcon,
  TrashIcon,
} from "../icons";
import styles from "./insights.module.css";

type Props = {
  node: StoryNode;
  connected: StoryNode[];
  onConfirm: (node: StoryNode) => void;
  onRemove: (node: StoryNode) => void;
  onAddToConversation: (node: StoryNode) => void;
  onClose: () => void;
};

/**
 * NodeDetailPanel — What / When / Source / Related topics / Connected
 * events / Confirmation status / Original wording, plus actions.
 */
export default function NodeDetailPanel({
  node,
  connected,
  onConfirm,
  onRemove,
  onAddToConversation,
  onClose,
}: Props) {
  const [showSource, setShowSource] = useState(false);
  const o = INSIGHTS_OPTIONS;
  const typeLabel = o.nodeTypes[node.type];
  const statusLabel = o.map.statuses[node.status] ?? node.status;

  const topics = connected.filter((n) => n.type === "TOPIC");
  const events = connected.filter((n) => n.type === "EVENT");
  const documents = connected.filter((n) => n.type === "DOCUMENT");
  const followUps = connected.filter((n) => n.type === "FOLLOW_UP");
  const questions = connected.filter((n) => n.type === "QUESTION");

  return (
    <div className={styles.panel} aria-live="polite">
      <div className={styles.panelHead}>
        <h3 className={styles.panelTitle}>{o.details.heading}</h3>
        <span className={styles.tag} data-tag>
          {typeLabel}
        </span>
        <span className={styles.statusChip} data-status={node.status}>
          {statusLabel}
        </span>
        <button type="button" className={styles.linkBtn} onClick={onClose} aria-label="Close details">
          <CloseIcon size={14} />
        </button>
      </div>
      <div className={styles.panelBody}>
        <p className={styles.detailTitle}>{node.title}</p>
        <dl className={styles.detailKv} style={{ marginTop: 10 }}>
          <dt>{o.details.what}</dt>
          <dd>{node.description || "—"}</dd>
          <dt>{o.details.when}</dt>
          <dd>
            {node.date ? node.date : node.datePrecision === "APPROXIMATE" ? "Approximate date" : "Not provided"}
          </dd>
          <dt>{o.details.source}</dt>
          <dd>{node.sourceLabel ?? "HealthStory"}</dd>
          <dt>{o.details.confirmation}</dt>
          <dd>{node.status === "USER_CONFIRMED" ? o.details.confirmed : o.details.notConfirmed}</dd>
        </dl>

        {topics.length > 0 ? (
          <p className={styles.sub} style={{ marginTop: 12 }}>
            <strong className={styles.key} style={{ display: "inline", marginRight: 6 }}>
              {o.details.relatedTopics}
            </strong>
            {topics.map((t) => t.title).join(", ")}
          </p>
        ) : null}
        {events.length > 0 ? (
          <p className={styles.sub} style={{ marginTop: 8 }}>
            <strong className={styles.key} style={{ display: "inline", marginRight: 6 }}>
              {o.details.connectedEvents}
            </strong>
            {events.map((e) => e.title).join(", ")}
          </p>
        ) : null}

        {node.originalText ? (
          <div style={{ marginTop: 12 }}>
            <button type="button" className={styles.linkBtn} onClick={() => setShowSource((s) => !s)}>
              <EyeIcon size={13} />
              {showSource ? o.details.hideSource : o.details.viewSource}
            </button>
            {showSource ? (
              <div className={styles.quoteBox} style={{ marginTop: 8 }}>
                <span className={styles.key}>{o.details.originalWording}</span>
                <p style={{ margin: "6px 0 0", fontStyle: "italic" }}>“{node.originalText}”</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {node.type === "DOCUMENT" && node.pageNumber ? (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--hs-border)" }}>
            <span className={styles.key}>{o.details.supportingSource}</span>
            <p style={{ margin: "6px 0 0" }}>{node.title} — {o.details.pagePrefix.replace("{page}", String(node.pageNumber))}</p>
          </div>
        ) : null}

        <div className={styles.row} style={{ marginTop: 14 }}>
          {node.status !== "USER_CONFIRMED" ? (
            <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`} onClick={() => onConfirm(node)}>
              <CheckIcon size={13} />
              {o.details.confirm}
            </button>
          ) : null}
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => onAddToConversation(node)}>
            <ChatIcon size={13} />
            {o.details.addToConversation}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`} onClick={() => onRemove(node)}>
            <TrashIcon size={13} />
            {o.details.remove}
          </button>
        </div>

        {documents.length + followUps.length + questions.length > 0 ? (
          <p className={styles.note}>
            <DocumentIcon size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            {documents.length > 0 ? `${documents.length} supporting document${documents.length > 1 ? "s" : ""} · ` : ""}
            {followUps.length > 0 ? `${followUps.length} follow-up${followUps.length > 1 ? "s" : ""} · ` : ""}
            {questions.length} question{questions.length === 1 ? "" : "s"}
            <ArrowRightIcon size={12} style={{ verticalAlign: "-2px", marginLeft: 4 }} />
          </p>
        ) : null}
      </div>
    </div>
  );
}