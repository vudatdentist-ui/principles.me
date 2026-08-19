"use client";

import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { WorkspaceShell } from "./workspace-shell";
import styles from "./decision-detail-v1.module.css";

type Detail = {
  decision: {
    context: string | null;
    councilAnalysis: string | null;
    evidence: unknown;
    principleCandidate: { id: string; statement: string; rationale: string; status: "pending" | "adopted" | "rejected" } | null;
    question: string;
    status: string;
  };
  judgments: Array<{ id: string; summary: string; rationale: string | null; confidencePercent: number | null; confidence: string | null }>;
  principles: Array<{ id: string; statement: string; description: string | null; relation: string }>;
  outcomes: Array<{ id: string; result: string; lessons: string | null; verdict: string }>;
};

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body;
}

export function DecisionDetailV1({ decisionId }: { decisionId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setDetail(await json<Detail>(`/api/decisions/${decisionId}`));
  }, [decisionId]);

  useEffect(() => { refresh().catch((e) => setError(e instanceof Error ? e.message : "Could not load decision.")); }, [refresh]);

  async function submitJudgment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      await json(`/api/decisions/${decisionId}/judgment`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ summary:String(form.get("summary") ?? "").trim(), rationale:String(form.get("rationale") ?? "").trim() || undefined, confidencePercent:Number(form.get("confidence") ?? 65) }) });
      event.currentTarget.reset(); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save judgment."); } finally { setBusy(false); }
  }

  async function submitPrinciple(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget);
    try {
      await json(`/api/decisions/${decisionId}/principles`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ statement:String(form.get("statement") ?? "").trim(), description:String(form.get("description") ?? "").trim() || undefined }) });
      event.currentTarget.reset(); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save principle."); } finally { setBusy(false); }
  }

  async function adoptCandidate() {
    const candidate = detail?.decision.principleCandidate; if (!candidate) return;
    setBusy(true); setError("");
    try {
      await json(`/api/decisions/${decisionId}/principles`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ candidateId:candidate.id, statement:candidate.statement, description:candidate.rationale }) });
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not adopt candidate."); } finally { setBusy(false); }
  }

  async function submitOutcome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget);
    try {
      await json(`/api/decisions/${decisionId}/outcome`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ result:String(form.get("result") ?? "").trim(), lessons:String(form.get("lessons") ?? "").trim() || undefined, verdict:String(form.get("verdict") ?? "too_early") }) });
      event.currentTarget.reset(); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save outcome."); } finally { setBusy(false); }
  }

  if (!detail) return <WorkspaceShell active="decisions" title="Decisions"><div className={styles.state}>{error || "Loading…"}</div></WorkspaceShell>;
  const evidence = Array.isArray(detail.decision.evidence) ? detail.decision.evidence.filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object") : [];

  return (
    <WorkspaceShell active="decisions" title="Decisions">
      <div className={styles.page}>
        <a className={styles.back} href="/decisions"><ArrowLeft size={14}/> Decisions</a>
        <header className={styles.header}><div><span className={styles.meta}>{detail.decision.status}</span><h1>{detail.decision.question}</h1></div><a className={styles.ask} href="/ask">Ask</a></header>
        {error ? <p className={styles.error}>{error}</p> : null}

        <section className={styles.section}><h2>Context</h2><p>{detail.decision.context || "—"}</p></section>
        {detail.decision.councilAnalysis || evidence.length ? <section className={styles.section}><h2>Analysis</h2>{detail.decision.councilAnalysis ? <p className={styles.pre}>{detail.decision.councilAnalysis}</p> : null}{evidence.length ? <details><summary>Sources · {evidence.length}</summary><div className={styles.sources}>{evidence.map((item,index)=><div key={String(item.key ?? index)}><strong>{String(item.title ?? `Source ${index+1}`)}</strong>{item.text ? <p>{String(item.text).slice(0,700)}</p> : null}</div>)}</div></details> : null}</section> : null}

        <section className={styles.section}><div className={styles.sectionHead}><h2>Judgment</h2><span>{detail.judgments.length}</span></div>{detail.judgments.map((j)=><div className={styles.row} key={j.id}><strong>{j.summary}</strong>{j.rationale ? <p>{j.rationale}</p> : null}<span>{j.confidencePercent !== null ? `${j.confidencePercent}%` : j.confidence ?? "—"}</span></div>)}<form className={styles.form} onSubmit={submitJudgment}><textarea name="summary" placeholder="What did you decide?" required/><textarea name="rationale" placeholder="Rationale"/><label>Confidence <input name="confidence" type="number" min="0" max="100" defaultValue="65"/></label><button disabled={busy}>Save judgment</button></form></section>

        <section className={styles.section}><div className={styles.sectionHead}><h2>Principles</h2><span>{detail.principles.length}</span></div>{detail.principles.map((p)=><div className={styles.row} key={p.id}><strong>{p.statement}</strong>{p.description ? <p>{p.description}</p> : null}</div>)}{detail.decision.principleCandidate?.status === "pending" ? <div className={styles.candidate}><span>Candidate</span><strong>{detail.decision.principleCandidate.statement}</strong><button disabled={busy} onClick={adoptCandidate}>Adopt</button></div> : null}<form className={styles.form} onSubmit={submitPrinciple}><input name="statement" placeholder="Principle" required/><textarea name="description" placeholder="Why it matters"/><button disabled={busy}>Keep principle</button></form></section>

        <section className={styles.section}><div className={styles.sectionHead}><h2>Outcome</h2><span>{detail.outcomes.length}</span></div>{detail.outcomes.map((o)=><div className={styles.row} key={o.id}><strong>{o.result}</strong>{o.lessons ? <p>{o.lessons}</p> : null}<span>{o.verdict.replace("_"," ")}</span></div>)}<form className={styles.form} onSubmit={submitOutcome}><textarea name="result" placeholder="What happened?" required/><textarea name="lessons" placeholder="What did you learn?"/><select name="verdict" defaultValue="too_early"><option value="positive">Positive</option><option value="mixed">Mixed</option><option value="negative">Negative</option><option value="too_early">Too early</option></select><button disabled={busy}>Save outcome</button></form></section>
      </div>
    </WorkspaceShell>
  );
}
