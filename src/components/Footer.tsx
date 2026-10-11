import { brand, footer } from "@/lib/content";
import { LogoMark } from "./icons";
import styles from "./footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.top}>
          <div className={styles.brandCol}>
            <a href="#top" className={styles.brand} aria-label={`${brand.name} — back to top`}>
              <LogoMark size={28} />
              <span>{brand.name}</span>
            </a>
            <p className={styles.tagline}>{footer.tagline}</p>
          </div>

          <nav className={styles.links} aria-label="Footer">
            {footer.links.map((link) => (
              <a key={link.label} href={link.href} className={styles.link}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <p className={styles.disclaimer}>{footer.disclaimer}</p>

        <div className={styles.bottom}>
          <p className={styles.builtFor}>{brand.builtFor}</p>
          <a href="#top" className={styles.topLink}>
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}