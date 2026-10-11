import { humanCentered } from "@/lib/content";
import Reveal from "./Reveal";
import { ArchiveIcon, ChatIcon, ReadIcon } from "./icons";
import styles from "./values.module.css";

const icons = { read: ReadIcon, archive: ArchiveIcon, chat: ChatIcon };

export default function HumanCenteredSection() {
  return (
    <section className="section section--alt" aria-labelledby="human-heading">
      <div className="container">
        <Reveal className="section-head section-head--center">
          <p className="eyebrow">{humanCentered.eyebrow}</p>
          <h2 className="h-section" id="human-heading">
            {humanCentered.heading}
          </h2>
          <p className="lede">{humanCentered.supporting}</p>
        </Reveal>

        <ul className="grid grid--3">
          {humanCentered.cards.map((card, i) => {
            const Icon = icons[card.icon];
            return (
              <Reveal as="li" key={card.title} delay={i * 90}>
                <article className={`card card--lift ${styles.humanCard}`}>
                  <span className="icon-box" aria-hidden="true">
                    <Icon size={21} />
                  </span>
                  <h3 className="h-card">{card.title}</h3>
                  <p className={styles.humanBody}>{card.description}</p>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}