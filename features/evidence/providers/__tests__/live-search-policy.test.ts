import assert from "node:assert/strict";
import test from "node:test";
import {
  liveSearchMode,
  publicSearchQuery,
  shouldUseLiveSearch,
} from "../../live-search-policy";

test("live search mode defaults to auto", () => {
  assert.equal(liveSearchMode(undefined), "auto");
  assert.equal(liveSearchMode("invalid"), "auto");
  assert.equal(liveSearchMode("ALWAYS"), "always");
  assert.equal(liveSearchMode("off"), "off");
});

test("auto mode detects Vietnamese and English freshness questions", () => {
  assert.equal(
    shouldUseLiveSearch("Thị trường nha khoa hiện nay thế nào?", "auto"),
    true
  );
  assert.equal(shouldUseLiveSearch("What is the latest market news?", "auto"), true);
  assert.equal(shouldUseLiveSearch("Tóm tắt tài liệu nội bộ này", "auto"), false);
});

test("always and off override the heuristic", () => {
  assert.equal(shouldUseLiveSearch("Private policy question", "always"), true);
  assert.equal(shouldUseLiveSearch("latest news today", "off"), false);
});

test("public search queries are bounded for provider limits", () => {
  const question = Array.from({ length: 80 }, (_, index) => `word${index}`).join(" ");
  const query = publicSearchQuery(question);
  assert.ok(query.length <= 400);
  assert.ok(query.split(/\s+/u).length <= 50);
});
