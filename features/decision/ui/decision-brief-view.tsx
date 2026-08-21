"use client";

import { useCallback } from "react";
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
import styles from "./decision-ui.module.css";

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
  const handleAccept = useCallback(() => {
    invokeDecisionBriefAction("accept", brief, { onAccept, onAdjust });
  }, [brief, onAccept, onAdjust]);
  const handleAdjust = useCallback(() => {
    invokeDecisionBriefAction("adjust", brief, { onAccept, onAdjust });
  }, [brief, onAccept, onAdjust]);

  return (
    <Surface className={styles.brief} variant="plain">
      <header className={styles.briefHeader}>
        <p className="v2-type-eyebrow">Decision brief</p>
        <h2 className={styles.recommendation}>{brief.recommendation}</h2>
        <p className={styles.confidence}>
          <strong>{confidenceLabel(brief.confidence.level)}.</strong>{" "}
          {brief.confidence.explanation}
        </p>
      </header>

      <Divider />

      <section aria-labelledby="decision-reasons-heading">
        <h3 className={styles.sectionTitle} id="decision-reasons-heading">
          Why
        </h3>
        <ol className={styles.reasons}>
          {reasons.map((reason) => (
            <li className={styles.reason} key={reason.id}>
              <p className={styles.reasonText}>{reason.text}</p>
              <p className={styles.reasonMeta}>
                <span>{reasonKindLabel(reason.kind)}</span>
                {reason.kind === "fact" && reason.citationKeys.length > 0 ? (
                  <span>Citations: {reason.citationKeys.join(" · ")}</span>
                ) : null}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.briefSplit}>
        <section aria-labelledby="decision-countercase-heading">
          <h3 className={styles.sectionTitle} id="decision-countercase-heading">
            What could make this wrong
          </h3>
          <p>{brief.counterCase}</p>
        </section>
        <section aria-labelledby="decision-next-action-heading">
          <h3 className={styles.sectionTitle} id="decision-next-action-heading">
            Next action
          </h3>
          <p>{brief.nextAction}</p>
        </section>
      </div>

      {brief.unknowns.length > 0 ? (
        <section aria-labelledby="decision-unknowns-heading">
          <h3 className={styles.sectionTitle} id="decision-unknowns-heading">
            Unknowns
          </h3>
          <ul className={styles.unknowns}>
            {brief.unknowns.map((unknown) => (
              <li key={unknown}>{unknown}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="decision-review-heading">
        <h3 className={styles.sectionTitle} id="decision-review-heading">
          Review when
        </h3>
        <p>{brief.review.trigger}</p>
      </section>

      <Divider />

      <div className={styles.briefActions}>
        <Button onClick={handleAccept}>Accept</Button>
        <Button onClick={handleAdjust} variant="secondary">
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

      <p className={styles.validity}>
        Valid as of <time dateTime={brief.validAsOf}>{brief.validAsOf}</time>
      </p>
    </Surface>
  );
}
