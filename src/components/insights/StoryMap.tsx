"use client";

import { useEffect, useMemo, useState } from "react";
import { INSIGHTS_OPTIONS } from "@/lib/insights/options";
import { computeLayout, searchStoryMap, type GraphLayout } from "@/lib/insights/engine";
import { buildTopicClusters } from "@/lib/insights/insights";
import type {
  StoryGraph,
  StoryNode,
  StoryNodeStatus,
  StoryNodeType,
  StoryRelationshipEdge,
} from "@/lib/insights/types";
import type { StoryJournal } from "@/lib/journal/types";
import {
  DocumentIcon,
  GraphIcon,
  QuestionIcon,
  SearchIcon,
} from "../icons";
import NodeDetailPanel from "./NodeDetailPanel";
import styles from "./insights.module.css";

type Props = {
  journal: StoryJournal;
  graph: StoryGraph;
  isEmpty: boolean;
  focusNodeId?: string;
  focusToken?: number;
  onGoToEntry: () => void;
  onConfirmNode: (node: StoryNode) => void;
  onRemoveNode: (node: StoryNode) => void;
  onAddToConversation: (node: StoryNode) => void;
  notify: (message: string) => void;
};

const DEFAULT_TYPES: StoryNodeType[] = [
  "EVENT",
  "TOPIC",
  "FOLLOW_UP",
  "DOCUMENT",
  "QUESTION",
  "COMMUNICATION",
  "SNAPSHOT",
];

const PERIODS = [
  { id: "all", label: "All time" },
  { id: "30d", label: "Last month" },
  { id: "3m", label: "Last 3 months" },
] as const;

function nodeIcon(type: StoryNodeType, size = 13) {
  if (type === "DOCUMENT") return <DocumentIcon size={size} />;
  if (type === "QUESTION") return <QuestionIcon size={size} />;
  return null;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function inPeriod(date: string | undefined, period: "all" | "30d" | "3m", now: number): boolean {
  if (period === "all") return true;
  if (!date) return true;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return true;
  const days = period === "30d" ? 30 : 90;
  return now - t <= days * 86400000;
}

function edgeLabel(type: StoryRelationshipEdge["type"]): string {
  return INSIGHTS_OPTIONS.relationshipTypes[type];
}

/** Small line icon per node type that fits inside an SVG node. */
function svgNodeIcon(type: StoryNodeType): string | null {
  switch (type) {
    case "EVENT": return "✳";
    case "TOPIC": return "❖";
    case "FOLLOW_UP": return "↻";
    case "DOCUMENT": return "▤";
    case "QUESTION": return "?";
    case "COMMUNICATION": return "¶";
    case "SNAPSHOT": return "◈";
    default: return "•";
  }
}

export default function StoryMap({
  journal,
  graph,
  isEmpty,
  focusNodeId,
  focusToken,
  onGoToEntry,
  onConfirmNode,
  onRemoveNode,
  onAddToConversation,
  notify,
}: Props) {
  const o = INSIGHTS_OPTIONS;
  const [mode, setMode] = useState<"map" | "timeline">("map");
  const [zoom, setZoom] = useState(0.86);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const [activeTypes, setActiveTypes] = useState<StoryNodeType[]>(DEFAULT_TYPES);
  const [activeStatuses, setActiveStatuses] = useState<StoryNodeStatus[]>([]);
  const [period, setPeriod] = useState<"all" | "30d" | "3m">("all");
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRelId, setSelectedRelId] = useState<string | null>(null);

  const [now] = useState(() => Date.now());
  const layout: GraphLayout = useMemo(() => computeLayout(graph), [graph]);
  const clusters = useMemo(() => buildTopicClusters(graph), [graph]);
  const results = useMemo(() => searchStoryMap(journal, graph, query), [journal, graph, query]);

  /* Focus a node from outside (evidence explorer “view evidence”) once. */
  useEffect(() => {
    if (!focusNodeId) return;
    const t = window.setTimeout(() => {
      setSelectedId(focusNodeId);
      setSelectedRelId(null);
      setMode("map");
    }, 0);
    return () => window.clearTimeout(t);
  }, [focusNodeId, focusToken]);

  const toggleType = (t: StoryNodeType) => {
    setActiveTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };
  const toggleStatus = (s: StoryNodeStatus) => {
    setActiveStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const visible = useMemo(() => {
    return graph.nodes.filter((n) => {
      if (activeTypes.length && !activeTypes.includes(n.type)) return false;
      if (activeStatuses.length && !activeStatuses.includes(n.status)) return false;
      if (!inPeriod(n.date, period, now)) return false;
      return true;
    });
  }, [graph, activeTypes, activeStatuses, period, now]);

  const visibleIds = useMemo(() => new Set(visible.map((n) => n.id)), [visible]);
  const visibleRels = useMemo(
    () => graph.relationships.filter((r) => visibleIds.has(r.fromNodeId) && visibleIds.has(r.toNodeId)),
    [graph, visibleIds],
  );

  const selectedNode = selectedId ? graph.nodes.find((n) => n.id === selectedId) ?? null : null;
  const selectedRel = selectedRelId ? graph.relationships.find((r) => r.id === selectedRelId) ?? null : null;

  const connectedOf = (nodeId: string): StoryNode[] => {
    const ids = new Set<string>();
    for (const r of graph.relationships) {
      if (r.fromNodeId === nodeId) ids.add(r.toNodeId);
      if (r.toNodeId === nodeId) ids.add(r.fromNodeId);
    }
    return graph.nodes.filter((n) => ids.has(n.id));
  };

  const handleSearchSelect = (nodeId: string) => {
    setSelectedId(nodeId);
    setSelectedRelId(null);
    setShowResults(false);
    setQuery("");
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setDrag({ x: e.clientX, y: e.clientY, px: pan.x, py: pan.y });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setPan({ x: drag.px + (e.clientX - drag.x) * (1 / zoom), y: drag.py + (e.clientY - drag.y) * (1 / zoom) });
  };
  const endDrag = () => setDrag(null);

  const visibleBounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of visible) {
      const p = layout.positions[n.id];
      if (!p) continue;
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + 176); maxY = Math.max(maxY, p.y + 58);
    }
    if (minX === Infinity) return { x: 0, y: 0, w: 400, h: 200 };
    return { x: Math.max(0, minX - 24), y: Math.max(0, minY - 24), w: maxX - minX + 48, h: maxY - minY + 48 };
  }, [visible, layout]);

  const centerView = () => {
    setPan({
      x: -visibleBounds.x * zoom + (visibleBounds.w * (1 - zoom)) / 2,
      y: -visibleBounds.y * zoom + (visibleBounds.h * (1 - zoom)) / 2,
    });
  };

  const timelineItems = [...visible]
    .sort((a, b) => {
      const da = a.date ?? "9999"; const db = b.date ?? "9999";
      if (da !== db) return da < db ? 1 : -1;
      return a.title < b.title ? 1 : -1;
    });

  if (isEmpty) {
    return (
      <section className={styles.panel}>
        <div className={styles.emptyHint}>
          <GraphIcon size={30} style={{ color: "var(--brand-500)", margin: "0 auto 12px", display: "block" }} />
          <h3 className={styles.emptyTitle}>{o.map.emptyTitle}</h3>
          <p className={styles.emptyBody}>{o.map.emptyBody}</p>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginTop: 18 }} onClick={onGoToEntry}>
            {o.map.emptyCta}
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className={styles.mapShell}>
      <div className={styles.mapToolbar}>
        <div className={styles.search}>
          <SearchIcon size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder={o.map.searchPlaceholder}
            aria-label={o.map.searchPlaceholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            onBlur={() => window.setTimeout(() => setShowResults(false), 180)}
          />
          {showResults && query.trim() ? (
            <div className={styles.searchResults}>
              {results.length === 0 ? (
                <div className={styles.sub} style={{ padding: 10 }}>No matches in your story.</div>
              ) : (
                results.map((r) => (
                  <button
                    key={`${r.nodeId}_${r.snippet}`}
                    type="button"
                    className={styles.searchResultItem}
                    onMouseDown={() => handleSearchSelect(r.nodeId)}
                  >
                    <div className={styles.searchResultTitle}>{r.title}</div>
                    <div className={styles.searchResultMeta}>
                      {o.nodeTypes[r.kind]} · {r.snippet}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div className={styles.mapControls} role="group" aria-label={o.map.filterHeading}>
          <span className={styles.key} style={{ margin: 0 }}>{o.map.filterHeading}</span>
          {(["EVENT", "TOPIC", "FOLLOW_UP", "DOCUMENT", "QUESTION"] as StoryNodeType[]).map((t) => (
            <button key={t} type="button" onClick={() => toggleType(t)} data-active={activeTypes.includes(t)} className={styles.tab}>
              {o.nodeTypes[t]}
            </button>
          ))}
          {DEFAULT_TYPES.slice(5).map((t) => (
            <button key={t} type="button" onClick={() => toggleType(t)} data-active={activeTypes.includes(t)} className={styles.tab}>
              {o.nodeTypes[t]}
            </button>
          ))}
        </div>

        <div className={styles.mapControls} role="group" aria-label={o.map.statusHeading}>
          <span className={styles.key} style={{ margin: 0 }}>{o.map.statusHeading}</span>
          {(["USER_CONFIRMED", "USER_RECORDED", "AI_ORGANIZED", "NEEDS_REVIEW"] as StoryNodeStatus[]).map((s) => (
            <button key={s} type="button" onClick={() => toggleStatus(s)} data-active={activeStatuses.includes(s)} className={styles.tab}>
              {o.map.statuses[s]}
            </button>
          ))}
        </div>

        <div className={styles.mapControls} role="group" aria-label="Time">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPeriod(p.id)} data-active={period === p.id} className={styles.tab}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.mapControls}>
        <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => setMode("map")} data-active={mode === "map"}>
          {o.map.mapView}
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => setMode("timeline")} data-active={mode === "timeline"}>
          {o.map.timelineView}
        </button>
        <span style={{ flex: 1 }} />
        <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => setZoom((z) => Math.min(1.6, z + 0.12))}>＋ {o.map.zoomIn}</button>
        <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => setZoom((z) => Math.max(0.55, z - 0.12))}>－ {o.map.zoomOut}</button>
        <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={centerView}>{o.map.center}</button>
        <button type="button" className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} onClick={() => { setZoom(0.86); setPan({ x: 0, y: 0 }); }}>{o.map.reset}</button>
      </div>

      <p className={styles.sub}>{o.map.sub} · {o.map.searchHint}</p>

      {mode === "timeline" ? (
        <section className={styles.panel}>
          <div className={styles.panelBody}>
            <div className={styles.timeline}>
              {timelineItems.length === 0 ? (
                <p className={styles.sub}>{o.map.noSelectionHint}</p>
              ) : (
                timelineItems.map((n) => {
                  const links = visibleRels.filter((r) => r.fromNodeId === n.id || r.toNodeId === n.id);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={styles.timelineItem}
                      style={{ textAlign: "left" }}
                      onClick={() => { setSelectedId(n.id); setSelectedRelId(null); }}
                    >
                      <span className={styles.timelineDate}>{n.date ?? "Date unknown"}</span>
                      <span className={styles.timelineBody}>
                        <span className={styles.timelineTitle}>
                          {nodeIcon(n.type)} {n.title}
                        </span>
                        <span className={styles.timelineMeta}>
                          <span className={styles.type}> {o.nodeTypes[n.type]} · {o.map.statuses[n.status]}</span>
                        </span>
                        {links.length > 0 ? (
                          <span className={styles.timelineReasons}>
                            {links.slice(0, 3).map((r) => (
                              <span key={r.id} style={{ display: "block" }}>— {r.reason}</span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>
      ) : (
        <div className={styles.mapCanvas} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag}>
          <svg
            className={styles.glass}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            role="img"
            aria-label="HealthStory knowledge map"
            style={{ cursor: drag ? "grabbing" : "grab" }}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {visibleRels.map((r) => {
                const a = layout.positions[r.fromNodeId];
                const b = layout.positions[r.toNodeId];
                if (!a || !b) return null;
                const selected = selectedRelId === r.id;
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2 + 8;
                return (
                  <g key={r.id}>
                    <line className={styles.edgeHit} x1={a.x + 88} y1={a.y + 29} x2={b.x + 88} y2={b.y + 29} onClick={() => { setSelectedRelId(r.id); setSelectedId(null); }} />
                    <line className={`${styles.edgeLine}${selected ? ` ${styles.edgeSel}` : ""}`} x1={a.x + 88} y1={a.y + 29} x2={b.x + 88} y2={b.y + 29} />
                    <text className={styles.edgeLabel} x={mx} y={my} textAnchor="middle">{edgeLabel(r.type)}</text>
                  </g>
                );
              })}

              {visible.map((n) => {
                const p = layout.positions[n.id];
                if (!p) return null;
                const title = truncate(n.title, 26);
                const meta = n.date ?? o.map.statuses[n.status];
                return (
                  <g
                    key={n.id}
                    className={styles.nodeGroup}
                    data-status={n.status}
                    data-selected={selectedId === n.id}
                    onClick={() => { setSelectedId(n.id); setSelectedRelId(null); }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${o.nodeTypes[n.type]}: ${n.title}`}
                    onKeyDown={(e) => { if (e.key === "Enter") { setSelectedId(n.id); setSelectedRelId(null); } }}
                  >
                    <rect className={styles.nodeBox} width={176} height={58} rx={12} />
                    <text className={styles.nodeIcon} x={13} y={24} fontSize={14}>{svgNodeIcon(n.type)}</text>
                    <text className={styles.nodeTitle} x={30} y={21}>{title}</text>
                    <text className={styles.nodeMeta} x={30} y={38}>{truncate(meta, 22)}</text>
                    <text className={styles.nodeStatusLabel} x={13} y={51}>{o.map.statuses[n.status].toUpperCase()}</text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}

      {/* Mobile-friendly Story Map Cards (replaces the SVG graph on small screens) */}
      <div className={styles.mobileCards}>
        {clusters.length === 0 ? (
          <p className={styles.sub}>{o.evidence.noTopics}</p>
        ) : (
          clusters.map((c) => (
            <div key={c.topicNode.id} className={styles.clusterCard}>
              <div className={styles.clusterTitle}>{c.topicNode.title}</div>
              <div className={styles.clusterCounts}>
                {c.events.length} entr{c.events.length === 1 ? "y" : "ies"}
                {c.documents.length ? ` · ${c.documents.length} document${c.documents.length > 1 ? "s" : ""}` : ""}
                {c.followUps.length ? ` · ${c.followUps.length} follow-up${c.followUps.length > 1 ? "s" : ""}` : ""}
              </div>
              <div className={styles.clusterFlow}>
                {[...c.events, ...c.documents, ...c.followUps].slice(0, 5).map((n, i, arr) => (
                  <span key={n.id} className={styles.clusterFlowItem}>
                    <span className={styles.clusterFlowDot} />
                    {truncate(n.title, 34)}
                    {i < arr.length - 1 ? <span className={styles.clusterFlowArrow}>↓</span> : null}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
                  onClick={() => { setSelectedId(c.topicNode.id); setSelectedRelId(null); }}
                >
                  {o.map.exploreConnections}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedRel ? (
        <div className={styles.whyConnected} role="status">
          <p className={styles.whyConnectedTitle}>
            <GraphIcon size={15} />
            {o.map.whyConnected}
          </p>
          <p className={styles.whyConnectedBody}>{selectedRel.reason}</p>
          <div className={styles.whyConnectedMeta}>
            <span>{edgeLabel(selectedRel.type)}</span>
            <span>Relationship confidence: {o.confidences[selectedRel.confidence]}</span>
            <span>{selectedRel.createdBy === "USER" ? "Linked by you" : "AI identified"}</span>
          </div>
        </div>
      ) : null}

      {selectedNode ? (
        <NodeDetailPanel
          node={selectedNode}
          connected={connectedOf(selectedNode.id)}
          onConfirm={(n) => { setSelectedId(null); onConfirmNode(n); }}
          onRemove={(n) => { setSelectedId(null); onRemoveNode(n); }}
          onAddToConversation={(n) => { onAddToConversation(n); notify(`${o.nodeTypes[n.type]} added to conversation selection.`); }}
          onClose={() => setSelectedId(null)}
        />
      ) : (
        <p className={styles.sub}>{o.map.clickEdgeHint}</p>
      )}

      <div className={styles.legend} role="list" aria-label={o.map.legendLabel}>
        {(["USER_CONFIRMED", "USER_RECORDED", "AI_ORGANIZED", "USER_EDITED", "NEEDS_REVIEW"] as StoryNodeStatus[]).map((s) => (
          <span key={s} className={styles.legendItem} role="listitem">
            <span className={styles.legendSwatch} data-status={s} />
            {o.map.statuses[s]}
          </span>
        ))}
      </div>
    </div>
  );
}