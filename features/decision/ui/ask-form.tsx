"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { Button } from "@/features/ui-v2/button";
import { Textarea } from "@/features/ui-v2/textarea";

export type AskFormProps = {
  disabled?: boolean;
  error?: string;
  onQuestionChange: (question: string) => void;
  onSubmit: (question: string) => void | Promise<void>;
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
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 3 || disabled) {
      return;
    }
    void onSubmit(trimmedQuestion);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) {
      return;
    }
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <form
      aria-busy={disabled}
      className="v2-decision-ask-form"
      onSubmit={handleSubmit}
    >
      <Textarea
        disabled={disabled}
        error={error}
        hint="Use Enter for a new line. Press Ctrl/⌘ + Enter to submit."
        label="Decision question"
        maxLength={4000}
        minLength={3}
        name="question"
        onChange={(event) => onQuestionChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder="What decision are you trying to make?"
        required
        rows={5}
        value={question}
      />
      <div className="v2-decision-ask-form__actions">
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
