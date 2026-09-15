"use client";

import { useEffect } from "react";

const currentActionSelector = 'section[aria-label="Current action"]';
const textareaSelector = `${currentActionSelector} textarea`;

function fitTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
  textarea.style.overflowY = "hidden";
}

function normalizeNarrativeSemantics() {
  const newGoalScene = document.querySelector<HTMLElement>(
    'section[aria-labelledby="new-goal-title"]'
  );
  if (newGoalScene) newGoalScene.setAttribute("aria-label", "Current action");

  const dreamHeading = document.querySelector<HTMLElement>(
    'section[aria-label="Current action"] section[aria-label="Dream and reality"] article:first-child strong'
  );
  if (dreamHeading) {
    dreamHeading.setAttribute("role", "heading");
    dreamHeading.setAttribute("aria-level", "3");
  }

  const fiveStepsHeading = document.getElementById("five-steps-title");
  if (fiveStepsHeading) fiveStepsHeading.setAttribute("aria-label", "5 Steps");
}

function refreshNarrativeSurface() {
  normalizeNarrativeSemantics();
  document.querySelectorAll<HTMLTextAreaElement>(textareaSelector).forEach(fitTextarea);
}

export function CurrentActionReadability() {
  useEffect(() => {
    const scheduleRefresh = () => {
      window.requestAnimationFrame(refreshNarrativeSurface);
    };

    const handleInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement)) return;
      if (!target.closest(currentActionSelector)) return;
      fitTextarea(target);
    };

    refreshNarrativeSurface();
    document.addEventListener("input", handleInput);
    window.addEventListener("resize", scheduleRefresh);

    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.removeEventListener("input", handleInput);
      window.removeEventListener("resize", scheduleRefresh);
    };
  }, []);

  return null;
}
