"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useI18n } from "@/features/i18n/locale";
import { isMyTurn, type Command, type Organization, type Room } from "./contracts";
import styles from "./practice.module.css";

export function Practice({ organizations, rooms }: { organizations: Organization[]; rooms: Room[] }) {
  const { locale } = useI18n();
  const say = (vi: string, en: string) => locale === "vi" ? vi : en;
  const router = useRouter();
  const [selected, select] = useState<string | null>(null);
  const [handle, setHandle] = useState(organizations[0]?.handle);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(0);
  const [sending, setSending] = useState(false);
  const [refreshing, transition] = useTransition();
  const lock = useRef(false);
  const organization = organizations.find(o => o.handle === handle) ?? organizations[0];
  const room = rooms.find(r => r.id === selected) ?? rooms[0];
  const showForm = creating || !room;
  useEffect(() => {
    function refresh() { if (document.visibilityState === "visible") router.refresh(); }
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [router]);

  async function submit(input: Command) {
    if (lock.current || refreshing) return;
    lock.current = true;
    setSending(true);
    setError(0);
    try {
      const response = await fetch("/api/team-practice", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (response.status === 401) { router.replace("/"); return; }
      if (!response.ok) { setError(response.status); return; }
      const { id } = await response.json();
      select(id);
      setCreating(false);
    } catch { setError(500); }
    finally {
      transition(() => router.refresh());
      lock.current = false;
      setSending(false);
    }
  }

  const proposal = say("Người đề xuất", "Proposer");
  const reviewer = say("Người phản biện", "Reviewer");
  const roles = [proposal, reviewer, reviewer, proposal];
  const prompts = [
    say("Bạn đề xuất cách xử lý nào? Vì sao?", "What would you do, and why?"),
    say("Giả định nào cần kiểm chứng trước khi hành động?", "Which assumption would you test before acting?"),
    say("Trong vai phản biện, bạn thấy rủi ro nào khác?", "As the reviewer, what other risk do you see?"),
    say("Bạn sẽ điều chỉnh đề xuất thế nào sau khi nghe phản biện?", "How would you revise the proposal after hearing the concerns?"),
  ];
  const busy = sending || refreshing;
  return <section className={styles.page} aria-labelledby="practice-title">
    <Link href="/organization">{say("Tổ chức", "Organization")}</Link>
    <h1 id="practice-title">{say("Luyện tập cùng đồng đội", "Team practice")}</h1>
    <p>{say("Hai người cùng xử lý một tình huống, lần lượt đề xuất, phản biện rồi đổi vai. Chỉ hai người tham gia xem được nội dung.", "Work through one scenario together. Take turns proposing and reviewing, then switch roles. Only the two participants can read the session.")}</p>
    {error > 0 && <p role="alert">{error === 409 ? say("Lượt đã thay đổi. Hãy xem lại phiên tập.", "The turn changed. Review the updated session.") : say("Chưa thể lưu. Hãy kiểm tra lại và thử lại.", "Could not save. Check the session and try again.")}</p>}
    {!organization ? <p>{say("Hãy tạo hoặc tham gia một tổ chức để bắt đầu.", "Create or join an organization to begin.")}</p> : <>
      {rooms.length > 0 && <div className={styles.controls}>
        <label>{say("Phiên của bạn", "Your sessions")}<select value={showForm ? "" : room.id} onChange={e => { select(e.target.value); setCreating(false); setError(0); }}>
          {showForm && <option value="" disabled>{say("Chọn phiên", "Select session")}</option>}
          {rooms.map(r => <option key={r.id} value={r.id}>{r.organization} · {r.other} · {r.scenario.slice(0, 55)}</option>)}
        </select></label>
        {!showForm && <button type="button" onClick={() => { setCreating(true); setError(0); }}>{say("Tạo phiên mới", "New session")}</button>}
      </div>}
      {showForm ? <form className={styles.panel} onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void submit({ kind: "create", handle: organization.handle, partner: String(data.get("partner")), scenario: String(data.get("scenario")) });
      }}>
        <h2>{say("Bắt đầu một tình huống", "Start a scenario")}</h2>
        <label>{say("Tổ chức luyện tập", "Practice organization")}<select value={organization.handle} onChange={e => setHandle(e.target.value)}>
          {organizations.map(o => <option key={o.handle} value={o.handle}>{o.name}</option>)}
        </select></label>
        {organization.partners.length ? <>
          <label>{say("Đồng đội", "Practice partner")}<select key={organization.handle} name="partner" required>{organization.partners.map(email => <option key={email}>{email}</option>)}</select></label>
          <label>{say("Tình huống chung", "Shared scenario")}<textarea name="scenario" required maxLength={1200} rows={3} placeholder={say("Ví dụ: Nhóm có nên lùi ngày ra mắt để kiểm tra một giả định?", "For example, should the team delay launch to test an assumption?")} /></label>
          <button disabled={busy} type="submit">{say("Bắt đầu luyện tập", "Start practice")}</button>
        </> : <p>{say("Cần thêm một thành viên trong tổ chức để luyện tập cùng bạn.", "You need another organization member to practice with.")}</p>}
      </form> : <article className={styles.panel}>
        <small>{room.organization} · {room.other}</small>
        <h2>{say("Tình huống chung", "Shared scenario")}</h2><p className={styles.entry}>{room.scenario}</p>
        <ol className={styles.history}>{room.replies.map((reply, i) => <li key={roles[i] + i}>
          <strong>{roles[i]} · {(i % 2 === 0) === room.first ? say("Bạn", "You") : room.other}</strong>
          <p className={styles.entry}>{reply}</p></li>)}</ol>
        {room.revision === 5 ? <h3>{say("Đã hoàn thành cả hai vai", "Both rounds complete")}</h3> : room.revision === 2 ?
          <button type="button" disabled={busy} onClick={() => void submit({ kind: "switch", id: room.id, revision: 2 })}>{say("Đổi vai", "Switch roles")}</button>
          : isMyTurn(room.revision, room.first) ?
          <form key={room.id + room.revision} onSubmit={e => {
            e.preventDefault();
            void submit({ kind: "reply", id: room.id, revision: room.revision, text: String(new FormData(e.currentTarget).get("reply")) });
          }}>
            <h3>{say("Đến lượt bạn", "Your turn")} · {roles[room.replies.length]}</h3>
            <label>{prompts[room.replies.length]}<textarea name="reply" required rows={3} maxLength={2000}/></label>
            <button type="submit" disabled={busy}>{say("Gửi lượt trả lời", "Submit turn")}</button>
          </form> : <p role="status">{say("Đang chờ lượt của", "Waiting for")} {room.other}</p>}
      </article>}
    </>}
  </section>;
}
