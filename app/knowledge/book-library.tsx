"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/features/i18n/locale";
import type { ClientEvidenceReference } from "@/features/evidence/client-reference";
import styles from "@/features/practice/studio.module.css";

export function BookLibrary() {
  const { locale } = useI18n();
  const say = (vi: string, en: string) => (locale === "vi" ? vi : en);
  const router = useRouter();
  const [books, setBooks] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientEvidenceReference[] | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/library", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setBooks((await response.json()).books);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCatalogError(true);
      });
    return () => controller.abort();
  }, []);
  async function search() {
    setBusy(true);
    setFailed(false);
    setResults(null);
    try {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) throw new Error();
      setResults((await response.json()).references);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.page}>
      <h1>{say("Thư viện", "Library")}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label htmlFor="search-books">
          {say(
            "Bạn muốn tìm ý tưởng nào trong sách?",
            "Which idea would you like to find in the books?",
          )}
        </label>
        <input
          id="search-books"
          maxLength={1000}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={busy || !query.trim()}>
          {busy
            ? say("Đang tìm…", "Searching…")
            : say("Tìm trong sách", "Search books")}
        </button>
      </form>
      {failed && (
        <p role="alert">
          {say(
            "Chưa truy xuất được nguồn. Hãy thử lại.",
            "Could not retrieve sources. Please try again.",
          )}
        </p>
      )}
      {results && (
        <section>
          <h2>{say("Trích đoạn", "Passages")}</h2>
          {!results.length && (
            <p>
              {say(
                "Chưa tìm thấy đoạn phù hợp.",
                "No matching passages found.",
              )}
            </p>
          )}
          {results.map((hit) => (
            <article key={hit.key}>
              <strong>{hit.title}</strong>
              <blockquote>{hit.snippet}</blockquote>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem(
                    "practice-book-draft",
                    say(
                      "Tôi muốn thử áp dụng ý sau",
                      "I want to practise this idea",
                    ) +
                      " — " +
                      hit.title +
                      "\n" +
                      hit.snippet +
                      "\n",
                  );
                  router.push("/");
                }}
              >
                {say("Đưa vào tình huống tập", "Practise this idea")}
              </button>
            </article>
          ))}
        </section>
      )}
      <h2>{say("Sách trong thư viện", "Library books")}</h2>
      {catalogError ? (
        <p role="status">
          {say("Chưa tải được danh mục sách.", "Book catalog unavailable.")}
        </p>
      ) : books ? (
        <ul>
          {books.map((book) => (
            <li key={book}>{book}</li>
          ))}
        </ul>
      ) : (
        <p>{say("Đang tải…", "Loading…")}</p>
      )}
      <Link href="/ask">{say("Hỏi trợ lý", "Ask a question")}</Link>
    </section>
  );
}
