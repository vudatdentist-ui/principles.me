import type { DecisionBrief } from "@/features/decision/contracts";
import styles from "./decision-ui.module.css";

export type EvidenceDrawerContentProps = {
  sources: DecisionBrief["sources"];
};

type EvidenceReference = DecisionBrief["sources"][number];

type SafeSourceLink = {
  href: string;
  label: string;
};

const SOURCE_TYPE_LABELS: Record<EvidenceReference["sourceType"], string> = {
  market: "Market data",
  ragflow: "Knowledge base",
  "user-context": "Your context",
  web: "Web source",
};

const EVIDENCE_DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function sourceTypeLabel(sourceType: EvidenceReference["sourceType"]): string {
  return SOURCE_TYPE_LABELS[sourceType];
}

function readableProvider(provider: string): string {
  return provider
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return EVIDENCE_DATE_FORMATTER.format(date);
}

function safeSourceLink(value: string | null): SafeSourceLink | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return {
      href: url.toString(),
      label: url.hostname.replace(/^www\./, ""),
    };
  } catch {
    return null;
  }
}

export function EvidenceDrawerContent({
  sources,
}: EvidenceDrawerContentProps) {
  if (sources.length === 0) {
    return <p className={styles.evidenceEmpty}>No evidence attached.</p>;
  }

  return (
    <div className={styles.evidence}>
      {sources.map((source) => {
        const sourceLink = safeSourceLink(source.url);

        return (
          <article className={styles.evidenceItem} key={source.key}>
            <header>
              <p className={styles.evidenceKey}>{source.key}</p>
              <h3 className={styles.evidenceTitle}>{source.title}</h3>
              <p className={styles.evidenceMeta}>
                {sourceTypeLabel(source.sourceType)} · {readableProvider(source.provider)}
              </p>
            </header>

            <dl className={styles.evidenceDates}>
              <div>
                <dt>Retrieved</dt>
                <dd>
                  <time dateTime={source.retrievedAt}>
                    {formatTimestamp(source.retrievedAt)} UTC
                  </time>
                </dd>
              </div>
              {source.publishedAt ? (
                <div>
                  <dt>Published</dt>
                  <dd>
                    <time dateTime={source.publishedAt}>
                      {formatTimestamp(source.publishedAt)} UTC
                    </time>
                  </dd>
                </div>
              ) : null}
              {source.observedAt ? (
                <div>
                  <dt>Observed</dt>
                  <dd>
                    <time dateTime={source.observedAt}>
                      {formatTimestamp(source.observedAt)} UTC
                    </time>
                  </dd>
                </div>
              ) : null}
            </dl>

            <p className={styles.evidenceExcerpt}>{source.text}</p>

            {sourceLink ? (
              <p className={styles.evidenceLinkRow}>
                <a
                  href={sourceLink.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {sourceLink.label}
                </a>
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
