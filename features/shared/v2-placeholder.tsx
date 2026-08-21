import Link from "next/link";
import styles from "./v2-placeholder.module.css";

type PlaceholderLink = {
  href: string;
  label: string;
};

type V2PlaceholderProps = {
  description: string;
  eyebrow: string;
  links?: PlaceholderLink[];
  title: string;
};

export function V2Placeholder({
  description,
  eyebrow,
  links = [],
  title,
}: V2PlaceholderProps) {
  return (
    <section aria-labelledby="v2-placeholder-title" className={styles.root}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 id="v2-placeholder-title">{title}</h1>
      <p className={styles.description}>{description}</p>
      {links.length ? (
        <nav aria-label="V2 foundation routes" className={styles.links}>
          {links.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </section>
  );
}
