"use client";
import { useEffect, useState, useRef } from "react";
import { useI18n } from "@/features/i18n/locale";
import { conversation, type PracticeCase, type Turn } from "./model";
import styles from "./studio.module.css";

async function request<T>(url: string, body?: object): Promise<T> {
  const response = await fetch(
    url,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

export default function PracticeStudio() {
  const { locale } = useI18n();
  const say = (vi: string, en: string) => (locale === "vi" ? vi : en);
  const [cases, setCases] = useState<PracticeCase[]>([]);
  const [current, choose] = useState<PracticeCase | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [end, setEnd] = useState<string | null>(null);
  const [draft, edit] = useState("");
  const [reply, respond] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    const excerpt = sessionStorage.getItem("practice-book-draft");
    if (excerpt) {
      edit(excerpt);
      sessionStorage.removeItem("practice-book-draft");
    }
    request<{ cases: PracticeCase[] }>("/api/practice")
      .then((data) => {
        if (active)
          setCases((prev) => [
            ...prev,
            ...data.cases.filter(
              (item) => !prev.some((existing) => existing.id === item.id),
            ),
          ]);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    setSaved(false);
    try {
      await work();
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function play(
    note: PracticeCase,
    parentId: string | null,
    answer: string | null,
  ) {
    const { turn } = await request<{ turn: Turn }>("/api/practice", {
      kind: "turn",
      id: crypto.randomUUID(),
      caseId: note.id,
      parentId,
      reply: answer,
      locale,
    });
    setTurns((prev) =>
      prev.some((item) => item.id === turn.id) ? prev : [...prev, turn],
    );
    setEnd(turn.id);
    respond("");
  }
  async function begin(rehearse: boolean) {
    const { note } = await request<{ note: PracticeCase }>("/api/practice", {
      kind: "note",
      id: crypto.randomUUID(),
      situation: draft,
    });
    setCases((prev) => [note, ...prev]);
    edit("");
    setSaved(true);
    if (rehearse) {
      choose(note);
      setTurns([]);
      setEnd(null);
      respond("");
      await play(note, null, null);
    }
  }
  async function open(note: PracticeCase) {
    const { turns: items } = await request<{ turns: Turn[] }>(
      "/api/practice?case=" + note.id,
    );
    choose(note);
    setTurns(items);
    setEnd(items.at(-1)?.id ?? null);
    respond("");
  }
  const path = conversation(turns, end);
  const samples = [
    say(
      "Đồng đội của tôi vừa trễ hẹn lần thứ hai.",
      "My teammate has missed a second deadline.",
    ),
    say(
      "Tôi cần nói với khách hàng rằng tôi đã tính sai.",
      "I need to tell a client I made a mistake.",
    ),
  ];
  return (
    <section className={styles.page}>
      <h1>{say("Phòng tập tình huống", "Situation studio")}</h1>
      {error && (
        <p role="alert">
          {say(
            "Chưa hoàn tất. Bạn có thể thử lại.",
            "Could not finish. Please try again.",
          )}
        </p>
      )}
      {saved && (
        <p role="status">
          {say("Đã lưu tình huống riêng tư.", "Private scenario saved.")}
        </p>
      )}
      <fieldset disabled={busy} aria-busy={busy}>
        {!current ? (
          <>
            <label htmlFor="scenario">
              {say(
                "Bạn muốn tập nói điều gì?",
                "What would you like to practise saying?",
              )}
            </label>
            <textarea
              id="scenario"
              maxLength={2000}
              rows={4}
              value={draft}
              onChange={(e) => edit(e.target.value)}
            />
            <div className={styles.actions}>
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={() => run(() => begin(true))}
              >
                {say("Vào vai ngay", "Start rehearsal")}
              </button>
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={() => run(() => begin(false))}
              >
                {say("Ghi nhanh", "Save for later")}
              </button>
            </div>
            <h2>{say("Thử một tình huống", "Try a scenario")}</h2>
            {samples.map((sample) => (
              <button
                type="button"
                className={styles.row}
                key={sample}
                onClick={() => edit(sample)}
              >
                {sample}
              </button>
            ))}
            <h2>{say("Tình huống của bạn", "Your scenarios")}</h2>
            {cases.length ? (
              cases.map((note) => (
                <button
                  type="button"
                  key={note.id}
                  className={styles.row}
                  onClick={() => run(() => open(note))}
                >
                  {note.situation}
                </button>
              ))
            ) : (
              <p>
                {say(
                  "Các tình huống đã lưu sẽ xuất hiện tại đây.",
                  "Your saved scenarios will appear here.",
                )}
              </p>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                choose(null);
                setSaved(false);
              }}
            >
              {say("Về phòng tập", "Back to studio")}
            </button>
            <h2>{current.situation}</h2>
            {path.map((turn) => (
              <article key={turn.id}>
                {turn.reply && (
                  <p>
                    <b>{say("Bạn", "You")}</b> · {turn.reply}
                  </p>
                )}
                <blockquote>{turn.counterpart}</blockquote>
                {turn.parentId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEnd(turn.parentId);
                      respond(turn.reply ?? "");
                    }}
                  >
                    {say("Tập lại lượt này", "Retry this turn")}
                  </button>
                )}
              </article>
            ))}
            {end ? (
              <>
                {turns.some((t) => t.parentId === end) && (
                  <section>
                    <h3>{say("So sánh các lần trả lời", "Compare replies")}</h3>
                    <div className={styles.compare}>
                      {turns
                        .filter((t) => t.parentId === end)
                        .map((t) => (
                          <article key={t.id}>
                            <p>{t.reply}</p>
                            <blockquote>{t.counterpart}</blockquote>
                            <button
                              type="button"
                              onClick={() => {
                                setEnd(t.id);
                                respond("");
                              }}
                            >
                              {say("Tiếp tục lượt này", "Continue here")}
                            </button>
                          </article>
                        ))}
                    </div>
                  </section>
                )}
                <label htmlFor="reply">
                  {say("Bạn sẽ nói gì?", "What would you say?")}
                </label>
                <textarea
                  id="reply"
                  rows={3}
                  maxLength={2000}
                  value={reply}
                  onChange={(e) => respond(e.target.value)}
                />
                <button
                  type="button"
                  disabled={!reply.trim()}
                  onClick={() => run(() => play(current, end, reply))}
                >
                  {say("Trả lời", "Reply")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => run(() => play(current, null, null))}
              >
                {say("Bắt đầu tập", "Begin rehearsal")}
              </button>
            )}
          </>
        )}
      </fieldset>
    </section>
  );
}
