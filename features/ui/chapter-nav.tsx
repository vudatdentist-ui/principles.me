import type { ReactNode } from "react";
import { SectionLink } from "./section-link";
import styles from "./chapter-nav.module.css";

export type ChapterLink = {
  href: `#${string}`;
  label: ReactNode;
  number: string;
};

export function ChapterNav({ label, chapters }: { label: string; chapters: ChapterLink[] }) {
  return (
    <nav aria-label={label} className={styles.nav}>
      <ol>
        {chapters.map((chapter) => (
          <li key={chapter.href}>
            <SectionLink href={chapter.href}>
              <span aria-hidden="true">{chapter.number}</span>
              {chapter.label}
            </SectionLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
