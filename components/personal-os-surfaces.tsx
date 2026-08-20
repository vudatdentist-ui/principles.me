import { ArrowRight } from "lucide-react";
import styles from "./personal-os-surfaces.module.css";

export type TodayActiveItem = {
  href?: string;
  id: string;
  title: string;
};

export type TodayReviewSummary = {
  due: number;
  href?: string;
};

export type TodaySurfaceData = {
  active?: TodayActiveItem[];
  reviews?: TodayReviewSummary;
};

export function TodaySurface({ data }: { data?: TodaySurfaceData }) {
  const activeItems = data?.active;
  const reviewSummary = data?.reviews;

  return (
    <div className={styles.surface}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>ACTIVE</span>
          <span>{activeItems ? activeItems.length : "—"}</span>
        </div>
        {activeItems?.length ? (
          <div className={styles.rows}>
            {activeItems.map((item) => (
              <a
                className={styles.row}
                href={item.href || "/goals"}
                key={item.id}
              >
                <span>{item.title}</span>
                <ArrowRight aria-hidden="true" size={15} />
              </a>
            ))}
          </div>
        ) : (
          <a className={styles.row} href="/goals">
            <span>Goals</span>
            <ArrowRight aria-hidden="true" size={15} />
          </a>
        )}
      </section>

      <section className={styles.section}>
        <a className={styles.prompt} href="/journal">
          <span>What happened?</span>
          <ArrowRight aria-hidden="true" size={18} />
        </a>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>REVIEWS</span>
          <span>{reviewSummary ? reviewSummary.due : "—"}</span>
        </div>
        <a className={styles.row} href={reviewSummary?.href || "/decisions"}>
          <span>Decisions</span>
          <ArrowRight aria-hidden="true" size={15} />
        </a>
      </section>
    </div>
  );
}

export function FeaturePlaceholder({
  actionHref,
  actionLabel,
  label,
}: {
  actionHref: string;
  actionLabel: string;
  label: string;
}) {
  return (
    <div className={styles.featurePlaceholder}>
      <div className={styles.sectionHeader}>
        <span>{label.toUpperCase()}</span>
        <span>—</span>
      </div>
      <a className={styles.row} href={actionHref}>
        <span>{actionLabel}</span>
        <ArrowRight aria-hidden="true" size={15} />
      </a>
    </div>
  );
}
