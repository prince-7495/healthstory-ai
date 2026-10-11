import { problem } from "@/lib/content";
import Reveal from "./Reveal";
import { ChatIcon, DocumentIcon, PulseIcon, TimelineIcon } from "./icons";
import styles from "./problem.module.css";

const icons = {
  pulse: PulseIcon,
  timeline: TimelineIcon,
  document: DocumentIcon,
  chat: ChatIcon,
};

export default function ProblemSection() {
  return (
    <section className="section" id="problem" aria-labelledby="problem-heading">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">{problem.eyebrow}</p>
          <h2 className="h-section" id="problem-heading">
            {problem.heading}
          </h2>
          <p className="lede">{problem.supporting}</p>
        </Reveal>

        <ul className={`grid grid--4 ${styles.cards}`}>
          {problem.cards.map((card, i) => {
            const Icon = icons[card.icon];
            return (
              <Reveal as="li" key={card.title} delay={i * 80}>
                <article className={`card card--lift ${styles.card}`}>
                  <span className="icon-box" aria-hidden="true">
                    <Icon size={21} />
                  </span>
                  <h3 className="h-card">{card.title}</h3>
                  <p className={`body ${styles.cardBody}`}>{card.description}</p>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}