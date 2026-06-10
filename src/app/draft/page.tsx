"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Flag from "@/components/Flag";
import { TEAMS, TEAM_BY_ID } from "../../../data/teams";

interface DraftState {
  completed: boolean;
  draftOrder: string[];
  currentPick: number;
  picks: Array<{ participant: string; teamId: string; pickNumber: number }>;
  participants: Record<string, string[]>;
}

const PARTICIPANT_COLORS: Record<string, string> = {
  Gordo: "#3b82f6",
  Shun: "#10b981",
  "Dr. Rick": "#f59e0b",
  "Sexy Tecsy": "#ec4899",
  "Lazy Bones": "#8b5cf6",
  "Bradical Bray Bray": "#f97316",
};

type View = "board" | "rosters";

function DraftInner() {
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get("admin") === "true";

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("board");

  const loadDraft = useCallback(async () => {
    const res = await fetch("/api/draft");
    const data = await res.json();
    setDraft(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadDraft(); }, [loadDraft]);

  async function resetDraft() {
    if (!confirm("Reset draft? All picks will be lost!")) return;
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", admin: "true" }),
    });
    setDraft(await res.json());
  }

  if (loading) return <div style={{ color: "var(--muted)", textAlign: "center", padding: 80 }}>Loading...</div>;
  if (!draft) return null;

  const sortedPicks = [...(draft.picks || [])].sort((a, b) => a.pickNumber - b.pickNumber);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 12px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 32, color: "var(--gold)", lineHeight: 1 }}>DRAFT BOARD</h1>
          {draft.completed && (
            <p className="font-condensed" style={{ color: "#10b981", fontSize: 14, marginTop: 4 }}>✓ Draft complete — all 48 teams picked</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isAdmin && (
            <button onClick={resetDraft} style={{ padding: "7px 14px", background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "var(--navy-card)", borderRadius: 8, padding: 4, border: "1px solid rgba(201,168,76,0.1)", width: "fit-content" }}>
        {(["board", "rosters"] as View[]).map((v) => (
          <button key={v} onClick={() => setView(v)} className="font-condensed"
            style={{ padding: "7px 20px", borderRadius: 6, border: "none", background: view === v ? "rgba(201,168,76,0.15)" : "transparent", color: view === v ? "var(--gold)" : "var(--muted)", fontWeight: 700, fontSize: 14, cursor: "pointer", letterSpacing: 0.5 }}>
            {v === "board" ? "📋 Pick Order" : "🏳️ Rosters"}
          </button>
        ))}
      </div>

      {view === "board" ? (
        /* PICK ORDER VIEW */
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
                {["Pick", "Team", "Manager", "Group"].map((h) => (
                  <th key={h} className="font-condensed" style={{ padding: "10px 14px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedPicks.map((pick, i) => {
                const team = TEAM_BY_ID[pick.teamId];
                const color = PARTICIPANT_COLORS[pick.participant] || "#666";
                const isRoundStart = i === 0 || draft.draftOrder[i] !== draft.draftOrder[i - 1];
                const round = Math.floor(i / 6) + 1;
                const prevRound = i > 0 ? Math.floor((i - 1) / 6) + 1 : 0;
                const showRound = round !== prevRound;

                return (
                  <>
                    {showRound && (
                      <tr key={`round-${round}`}>
                        <td colSpan={4} style={{ padding: "6px 14px", background: "rgba(201,168,76,0.05)", borderTop: i > 0 ? "1px solid rgba(201,168,76,0.1)" : "none", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                          <span className="font-display" style={{ fontSize: 12, color: "var(--gold)", letterSpacing: 2 }}>ROUND {round}</span>
                        </td>
                      </tr>
                    )}
                    <tr key={pick.pickNumber} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "10px 14px", width: 52 }}>
                        <span className="font-display" style={{ fontSize: 18, color: color }}>{pick.pickNumber}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {team && <Flag code={team.code} size={24} />}
                          <span className="font-condensed" style={{ color: "var(--white)", fontWeight: 700, fontSize: 15 }}>
                            {team?.name || pick.teamId}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                          <span className="font-condensed" style={{ color, fontWeight: 600, fontSize: 14 }}>{pick.participant}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ color: "var(--muted)", fontSize: 13 }}>Group {team?.group}</span>
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ROSTERS VIEW */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {Object.entries(draft.participants).map(([name, teamIds]) => {
            const color = PARTICIPANT_COLORS[name] || "#666";
            return (
              <div key={name} className="card" style={{ overflow: "hidden", borderTop: `3px solid ${color}` }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="font-display" style={{ fontSize: 20, color: "var(--white)" }}>{name}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{teamIds.length} teams</span>
                </div>
                <div style={{ padding: "8px 0" }}>
                  {teamIds.map((tid) => {
                    const team = TEAM_BY_ID[tid];
                    const pick = draft.picks.find((p) => p.teamId === tid);
                    if (!team) return null;
                    return (
                      <div key={tid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <Flag code={team.code} size={24} />
                        <span className="font-condensed" style={{ color: "var(--white)", fontWeight: 600, fontSize: 15, flex: 1 }}>{team.name}</span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>Group {team.group}</span>
                        {pick && <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 32, textAlign: "right" }}>#{pick.pickNumber}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DraftPage() {
  return (
    <Suspense fallback={<div style={{ color: "var(--muted)", textAlign: "center", padding: 80 }}>Loading...</div>}>
      <DraftInner />
    </Suspense>
  );
}
