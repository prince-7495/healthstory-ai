import { privacy } from "@/lib/content";
import Reveal from "./Reveal";
import { EyeIcon, LockIcon, UserIcon } from "./icons";
import styles from "./values.module.css";

const icons = { user: UserIcon, lock: LockIcon, eye: EyeIcon };

export default function PrivacySection() {
  return (
    <section className="section section--alt" id="privacy" aria-labelledby="privacy-heading">
      <div className="container">
        <Reveal className="section-head section-head--center">
          <p className="eyebrow">{privacy.eyebrow}</p>
          <h2 className="h-section" id="privacy-heading">
            {privacy.heading}
          </h2>
          <p className="lede">{privacy.supporting}</p>
        </Reveal>

        <ul className="grid grid--3">
          {privacy.principles.map((p, i) => {
            const Icon = icons[Object.keys(icons)[i] as keyof typeof icons];
            return (
              <Reveal as="li" key={p.title} delay={i * 90}>
                <article className={`card ${styles.privacyCard}`}>
                  <span className={styles.privacyIcon} aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <h3 className="h-card">{p.title}</h3>
                  <p className={styles.privacyBody}>{p.description}</p>
                </article>
              </Reveal>
            );
          })}
        </ul>

        <Reveal delay={120}>
          <p className={styles.privacyNote}>
            <LockIcon size={16} />
            <span>{privacy.note}</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}