"use client";

import { useId, useState } from "react";
import type { HealthEvent } from "@/lib/health/types";
import { makeId } from "@/lib/health/types";
import { PlusIcon } from "../icons";
import EventCard, { createBlankEvent } from "./EventCard";
import styles from "./workspace.module.css";

type Props = {
  events: HealthEvent[];
  onChange: (events: HealthEvent[]) => void;
};

/**
 * EventManager — an optional list of dated events.
 *
 * The list exists because some people think in events ("the appointment
 * in March", "the week I changed that medication") rather than in
 * paragraphs. Both routes end up in the same story and neither is
 * required, which is why this sits below the story input rather than
 * asking for it up front.
 */
export default function EventManager({ events, onChange }: Props) {
  const headingId = useId();
  const [editingId, setEditingId] = useState<string | null>(null);

  function update(id: string, next: HealthEvent) {
    onChange(events.map((e) => (e.id === id ? next : e)));
  }

  function remove(id: string) {
    onChange(events.filter((e) => e.id !== id));
    setEditingId((current) => (current === id ? null : current));
  }

  function duplicate(event: HealthEvent) {
    const copy: HealthEvent = { ...event, id: makeId("event") };
    const at = events.findIndex((e) => e.id === event.id);
    const next = [...events];
    next.splice(at + 1, 0, copy);
    onChange(next);
  }

  function move(id: string, direction: -1 | 1) {
    const at = events.findIndex((e) => e.id === id);
    const to = at + direction;
    if (at < 0 || to < 0 || to >= events.length) return;
    const next = [...events];
    const [item] = next.splice(at, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function add() {
    const event = createBlankEvent();
    onChange([...events, event]);
    setEditingId(event.id);
  }

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <div className={styles.panelBody}>
        <div className={styles.eventsHead}>
          <div>
            <h2 className={styles.panelTitle} id={headingId}>
              Health events
            </h2>
            <p className={styles.panelNote}>
              Optional. Add anything that happened on a particular day &mdash; an
              appointment, a test, or a change in treatment.
            </p>
          </div>

          <button type="button" className={styles.addBtn} onClick={add}>
            <PlusIcon size={16} />
            + Add another event
          </button>
        </div>

        {events.length === 0 ? (
          <p className={styles.structAbsent} style={{ marginTop: 0 }}>
            No events added. Your written story is enough on its own &mdash; add
            events only if it helps you.
          </p>
        ) : (
          <ol className={styles.eventList}>
            {events.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                index={i}
                total={events.length}
                editing={editingId === event.id}
                onEditingChange={(next) => setEditingId(next ? event.id : null)}
                onSave={(next) => update(event.id, next)}
                onRemove={() => remove(event.id)}
                onDuplicate={() => duplicate(event)}
                onMove={(dir) => move(event.id, dir)}
              />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}