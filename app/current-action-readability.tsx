"use client";

import { useEffect } from "react";

const currentActionSelector = 'section[aria-label="Current action"]';
const textareaSelector = `${currentActionSelector} textarea`;

function fitTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
  textarea.style.overflowY = "hidden";
}

function fitAllCurrentActionTextareas() {
  document.querySelectorAll<HTMLTextAreaElement>(textareaSelector).forEach(fitTextarea);
}

export function CurrentActionReadability() {
  useEffect(() => {
    const scheduleFit = () => {
      window.requestAnimationFrame(fitAllCurrentActionTextareas);
    };

    const handleInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement)) return;
      if (!target.closest(currentActionSelector)) return;
      fitTextarea(target);
    };

    fitAllCurrentActionTextareas();
    document.addEventListener("input", handleInput);
    window.addEventListener("resize", scheduleFit);

    const observer = new MutationObserver(scheduleFit);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.removeEventListener("input", handleInput);
      window.removeEventListener("resize", scheduleFit);
    };
  }, []);

  return null;
}
