import type { DecisionBrief } from "@/features/decision/contracts";

export type EvidenceDrawerContentProps = {
  sources: DecisionBrief["sources"];
};

type EvidenceReference = DecisionBrief["sources"][number];

function sourceTypeLabel(sourceType: EvidenceReference["sourceType"]): string {
  switch (sourceType) {
    case "ragflow":
      return "Knowledge base";
    case "web":
      return "Web source";
    case "market":
      return "Market data";
    case "user-context":
      return "Your context";
  }
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

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Open source";
  }
}

export function EvidenceDrawerContent({
  sources,
}: EvidenceDrawerContentProps) {
  if (sources.length === 0) {
    return <p className="v2-decision-evidence__empty">No evidence attached.</p>;
  }

  return (
    <div className="v2-decision-evidence">
      {sources.map((source) => (
        <article className="v2-decision-evidence__item" key={source.key}>
          <header>
            <p className="v2-decision-evidence__key">{source.key}</p>
            <h3 className="v2-decision-evidence__title">{source.title}</h3>
            <p className="v2-decision-evidence__meta">
              {sourceTypeLabel(source.sourceType)} · {readableProvider(source.provider)}
            </p>
          </header>

          <dl className="v2-decision-evidence__dates">
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

          <p className="v2-decision-evidence__excerpt">{source.text}</p>

          {source.url ? (
            <p className="v2-decision-evidence__link-row">
              <a href={source.url} rel="noreferrer" target="_blank">
                {sourceHost(source.url)}
              </a>
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
