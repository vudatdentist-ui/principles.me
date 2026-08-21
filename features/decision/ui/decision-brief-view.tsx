import type { DecisionBrief } from "@/features/decision/contracts";
import { Button } from "@/features/ui-v2/button";
import { Divider } from "@/features/ui-v2/divider";
import { Surface } from "@/features/ui-v2/surface";
import {
  confidenceLabel,
  invokeDecisionBriefAction,
  reasonKindLabel,
  visibleDecisionReasons,
} from "./decision-ui-state";

export type DecisionBriefViewProps = {
  brief: DecisionBrief;
  onAccept?: (brief: DecisionBrief) => void;
  onAdjust?: (brief: DecisionBrief) => void;
  onViewEvidence?: () => void;
};

export function DecisionBriefView({
  brief,
  onAccept,
  onAdjust,
  onViewEvidence,
}: DecisionBriefViewProps) {
  const reasons = visibleDecisionReasons(brief);

  return (
    <Surface className="v2-decision-brief" variant="plain">
      <header className="v2-decision-brief__header">
        <p className="v2-type-eyebrow">Decision brief</p>
        <h2 className="v2-decision-brief__recommendation">
          {brief.recommendation}
        </h2>
        <p className="v2-decision-brief__confidence">
          <strong>{confidenceLabel(brief.confidence.level)}.</strong>{" "}
          {brief.confidence.explanation}
        </p>
      </header>

      <Divider />

      <section aria-labelledby="decision-reasons-heading">
        <h3 className="v2-decision-brief__section-title" id="decision-reasons-heading">
          Why
        </h3>
        <ol className="v2-decision-reasons">
          {reasons.map((reason) => (
            <li className="v2-decision-reason" key={reason.id}>
              <p className="v2-decision-reason__text">{reason.text}</p>
              <p className="v2-decision-reason__meta">
                <span>{reasonKindLabel(reason.kind)}</span>
                {reason.kind === "fact" && reason.citationKeys.length > 0 ? (
                  <span aria-label={`Citations ${reason.citationKeys.join(", ")}`}>
                    {reason.citationKeys.join(" · ")}
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div className="v2-decision-brief__split">
        <section aria-labelledby="decision-countercase-heading">
          <h3
            className="v2-decision-brief__section-title"
            id="decision-countercase-heading"
          >
            What could make this wrong
          </h3>
          <p>{brief.counterCase}</p>
        </section>
        <section aria-labelledby="decision-next-action-heading">
          <h3
            className="v2-decision-brief__section-title"
            id="decision-next-action-heading"
          >
            Next action
          </h3>
          <p>{brief.nextAction}</p>
        </section>
      </div>

      {brief.unknowns.length > 0 ? (
        <section aria-labelledby="decision-unknowns-heading">
          <h3
            className="v2-decision-brief__section-title"
            id="decision-unknowns-heading"
          >
            Unknowns
          </h3>
          <ul className="v2-decision-unknowns">
            {brief.unknowns.map((unknown) => (
              <li key={unknown}>{unknown}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="decision-review-heading">
        <h3 className="v2-decision-brief__section-title" id="decision-review-heading">
          Review when
        </h3>
        <p>{brief.review.trigger}</p>
      </section>

      <Divider />

      <div className="v2-decision-brief__actions">
        <Button
          onClick={() =>
            invokeDecisionBriefAction("accept", brief, { onAccept, onAdjust })
          }
        >
          Accept
        </Button>
        <Button
          onClick={() =>
            invokeDecisionBriefAction("adjust", brief, { onAccept, onAdjust })
          }
          variant="secondary"
        >
          Adjust
        </Button>
        <Button
          disabled={brief.sources.length === 0}
          onClick={onViewEvidence}
          variant="quiet"
        >
          View evidence
        </Button>
      </div>

      <p className="v2-decision-brief__validity">
        Valid as of <time dateTime={brief.validAsOf}>{brief.validAsOf}</time>
      </p>
    </Surface>
  );
}
