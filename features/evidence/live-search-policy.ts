export type LiveSearchMode = "always" | "auto" | "off";

const FRESHNESS_PATTERN = new RegExp(
  [
    "\\btoday\\b",
    "\\bnow\\b",
    "\\bcurrent(?:ly)?\\b",
    "\\blatest\\b",
    "\\brecent(?:ly)?\\b",
    "\\bnews\\b",
    "\\bmarket\\b",
    "\\bprice\\b",
    "\\brate(?:s)?\\b",
    "\\bweather\\b",
    "\\bthis week\\b",
    "\\bthis month\\b",
    "hôm nay",
    "hiện tại",
    "hiện nay",
    "mới nhất",
    "gần đây",
    "tin tức",
    "thị trường",
    "giá ",
    "lãi suất",
    "tỷ giá",
    "thời tiết",
    "trực tuyến",
    "live",
    "realtime",
    "real-time",
    "\\b20\\d{2}\\b",
  ].join("|"),
  "iu"
);

export function liveSearchMode(
  value: string | undefined
): LiveSearchMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "always" || normalized === "off") {
    return normalized;
  }
  return "auto";
}

export function shouldUseLiveSearch(
  question: string,
  mode: LiveSearchMode
): boolean {
  if (mode === "off") {
    return false;
  }
  if (mode === "always") {
    return true;
  }
  return FRESHNESS_PATTERN.test(question);
}

export function publicSearchQuery(question: string): string {
  return question
    .trim()
    .split(/\s+/u)
    .slice(0, 50)
    .join(" ")
    .slice(0, 400)
    .trim();
}
