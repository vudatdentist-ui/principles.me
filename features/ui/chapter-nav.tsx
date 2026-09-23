import type { ReactNode } from "react";
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
            <a href={chapter.href}>
              <span aria-hidden="true">{chapter.number}</span>
              {chapter.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
