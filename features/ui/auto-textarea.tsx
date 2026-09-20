"use client";

import {
  type TextareaHTMLAttributes,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

function fit(element: HTMLTextAreaElement) {
  if (!element.clientWidth) return;
  const style = getComputedStyle(element);
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight + Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth)}px`;
}

/** Own resizing at the input, including controlled updates and reopened disclosures. */
export function AutoTextarea({
  value,
  onInput,
  style,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (ref.current) fit(ref.current);
  });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      fit(element);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <textarea
      {...props}
      ref={ref}
      value={value}
      style={{ ...style, overflowY: "hidden" }}
      onInput={(event) => {
        fit(event.currentTarget);
        onInput?.(event);
      }}
    />
  );
}
