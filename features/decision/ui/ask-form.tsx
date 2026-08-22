"use client";

import {
  useCallback,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/features/ui-v2/button";
import { Textarea } from "@/features/ui-v2/textarea";
import styles from "./decision-ui.module.css";

export type AskFormProps = {
  disabled?: boolean;
  error?: string;
  onQuestionChange: (question: string) => void;
  onSubmit: (question: string) => void;
  question: string;
  submitLabel?: string;
};

export function AskForm({
  disabled = false,
  error,
  onQuestionChange,
  onSubmit,
  question,
  submitLabel = "Decide",
}: AskFormProps) {
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedQuestion = question.trim();
      if (trimmedQuestion.length < 3 || disabled) {
        return;
      }
      onSubmit(trimmedQuestion);
    },
    [disabled, onSubmit, question]
  );

  const handleQuestionChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      onQuestionChange(event.currentTarget.value);
    },
    [onQuestionChange]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    },
    []
  );

  return (
    <form
      aria-busy={disabled}
      className={styles.askForm}
      onSubmit={handleSubmit}
    >
      <Textarea
        className={styles.questionInput}
        disabled={disabled}
        error={error}
        hint="Tap Decide to submit. On a keyboard, Ctrl/⌘ + Enter also works."
        label="Decision question"
        maxLength={4000}
        minLength={3}
        name="question"
        onChange={handleQuestionChange}
        onKeyDown={handleKeyDown}
        placeholder="What decision are you trying to make?"
        required
        rows={5}
        value={question}
      />
      <div className={styles.askActions}>
        <Button
          disabled={disabled || question.trim().length < 3}
          type="submit"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
