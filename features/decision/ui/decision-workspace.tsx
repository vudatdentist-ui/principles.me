"use client";

import { useCallback } from "react";
import type { DecisionBrief } from "@/features/decision/contracts";
import { Button } from "@/features/ui-v2/button";
import { Drawer } from "@/features/ui-v2/drawer";
import { StatusText } from "@/features/ui-v2/status-text";
import { AskForm } from "./ask-form";
import { DecisionBriefView } from "./decision-brief-view";
import {
  decisionErrorDisplayMessage,
  type DecisionUiState,
} from "./decision-ui-state";
import styles from "./decision-ui.module.css";
import { EvidenceDrawerContent } from "./evidence-drawer-content";

export type DecisionWorkspaceProps = {
  onAccept?: (brief: DecisionBrief) => void;
  onAdjust?: (brief: DecisionBrief) => void;
  onEvidenceOpenChange: (open: boolean) => void;
  onQuestionChange: (question: string) => void;
  onRetry?: () => void;
  onSubmit: (question: string) => void;
  question: string;
  state: DecisionUiState;
};

export function DecisionWorkspace({
  onAccept,
  onAdjust,
  onEvidenceOpenChange,
  onQuestionChange,
  onRetry,
  onSubmit,
  question,
  state,
}: DecisionWorkspaceProps) {
  const isSubmitting = state.phase === "submitting";
  const handleViewEvidence = useCallback(() => {
    onEvidenceOpenChange(true);
  }, [onEvidenceOpenChange]);

  return (
    <div className={`${styles.workspace} v2-theme`} data-phase={state.phase}>
      <header className={styles.header}>
        <p className="v2-type-eyebrow">Decision workspace</p>
        <h1 className={styles.title}>What are you deciding?</h1>
        <p className={styles.lede}>
          Ask one decision question. The result stays concise, inspectable, and
          ready to act on.
        </p>
      </header>

      <AskForm
        disabled={isSubmitting}
        onQuestionChange={onQuestionChange}
        onSubmit={onSubmit}
        question={question}
      />

      {isSubmitting ? (
        <div className={styles.statusRegion}>
          <StatusText aria-atomic="true" aria-live="polite" tone="muted">
            {state.status ?? "Preparing your decision brief."}
          </StatusText>
        </div>
      ) : null}

      {state.phase === "error" && state.error ? (
        <section
          aria-labelledby="decision-error-heading"
          className={styles.errorRegion}
        >
          <h2 className="v2-type-heading" id="decision-error-heading">
            Decision brief unavailable
          </h2>
          <StatusText role="alert">
            {decisionErrorDisplayMessage(state.error)}
          </StatusText>
          {state.error.retryable && onRetry ? (
            <div className={styles.retryAction}>
              <Button onClick={onRetry} variant="secondary">
                Try again
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {state.brief ? (
        <DecisionBriefView
          brief={state.brief}
          onAccept={onAccept}
          onAdjust={onAdjust}
          onViewEvidence={handleViewEvidence}
        />
      ) : null}

      <Drawer
        description="Normalized sources behind this decision brief."
        onOpenChange={onEvidenceOpenChange}
        open={state.evidenceOpen && state.evidence.length > 0}
        title="Evidence"
      >
        <EvidenceDrawerContent sources={state.evidence} />
      </Drawer>
    </div>
  );
}
