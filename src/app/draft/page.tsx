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
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("board");

  const loadDraft = useCallback(async () => {
    const res = await fetch("/api/draft");
    const data = await res.json();
    setDraft(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadDraft(); }, [loadDraft]);

  async function makePick(teamId: string) {
    if (!draft || draft.completed || picking) return;
    setPicking(true);
    setError(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pick", teamId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Pick failed");
      } else {
        setDraft(data);
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setPicking(false);
    }
  }

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

  const pickedTeamIds = new Set(draft.picks.map((p) => p.teamId));
  const availableTeams = TEAMS.filter((t) => !pickedTeamIds.has(t.id));
  const currentParticipant = !draft.completed ? draft.draftOrder[draft.currentPick] : null;
  const currentColor = currentParticipant ? (PARTICIPANT_COLORS[currentParticipant] || "#ccc") : "#ccc";
  const sortedPicks = [...(draft.picks || [])].sort((a, b) => a.pickNumber - b.pickNumber);

  // Group available teams by group letter
  const teamsByGroup: Record<string, typeof TEAMS> = {};
  for (const t of availableTeams) {
    if (!teamsByGroup[t.group]) teamsByGroup[t.group] = [];
    teamsByGroup[t.group].push(t);
  }
  const groupLetters = Object.keys(teamsByGroup).sort();

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
        {isAdmin && (
          <button onClick={resetDraft} style={{ padding: "7px 14px", background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            Reset Draft
          </button>
        )}
      </div>

      {/* LIVE DRAFT UI */}
      {!draft.completed && (
        <>
          {/* On the clock banner */}
          <div style={{ background: `${currentColor}18`, border: `1px solid ${currentColor}55`, borderRadius: 10, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: currentColor, boxShadow: `0 0 10px ${currentColor}`, flexShrink: 0 }} />
            <div>
              <div className="font-condensed" style={{ color: "var(--muted)", fontSize: 12, letterSpacing: 1 }}>ON THE CLOCK — PICK {draft.currentPick + 1} OF 48</div>
              <div className="font-display" style={{ fontSize: 28, color: currentColor, lineHeight: 1.1 }}>{currentParticipant}</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{availableTeams.length} teams remaining</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{48 - draft.currentPick} picks left</div>
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Available teams grid */}
          <div className="card" style={{ padding: "16px", marginBottom: 24 }}>
            <h2 className="font-display" style={{ fontSize: 18, color: "var(--gold)", marginBottom: 14 }}>SELECT A TEAM</h2>
            {groupLetters.map((letter) => (
              <div key={letter} style={{ marginBottom: 12 }}>
                <div className="font-condensed" style={{ color: "var(--muted)", fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>GROUP {letter}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {teamsByGroup[letter].map((team) => (
                    <button
                      key={team.id}
                      onClick={() => makePick(team.id)}
                      disabled={picking}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 12px",
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${currentColor}44`,
                        borderRadius: 6,
                        cursor: picking ? "not-allowed" : "pointer",
                        opacity: picking ? 0.6 : 1,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { if (!picking) (e.currentTarget.style.background = `${currentColor}22`); }}
                      onMouseLeave={(e) => { (e.currentTarget.style.background = "rgba(255,255,255,0.04)"); }}
                    >
                      <Flag code={team.code} size={20} />
                      <span className="font-condensed" style={{ color: "var(--white)", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>{team.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Recent picks during draft */}
          {sortedPicks.length > 0 && (
            <div className="card" style={{ overflow: "hidden", marginBottom: 24 }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                <h3 className="font-display" style={{ fontSize: 16, color: "var(--gold)" }}>PICKS SO FAR</h3>
              </div>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {[...sortedPicks].reverse().map((pick) => {
                  const team = TEAM_BY_ID[pick.teamId];
                  const color = PARTICIPANT_COLORS[pick.participant] || "#666";
                  return (
                    <div key={pick.pickNumber} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span className="font-display" style={{ fontSize: 15, color: "var(--muted)", minWidth: 28 }}>#{pick.pickNumber}</span>
                      {team && <Flag code={team.code} size={20} />}
                      <span className="font-condensed" style={{ color: "var(--white)", fontWeight: 600, fontSize: 14, flex: 1 }}>{team?.name || pick.teamId}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                        <span className="font-condensed" style={{ color, fontSize: 13, fontWeight: 600 }}>{pick.participant}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* COMPLETED RECAP */}
      {draft.completed && (
        <>
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
                            <span className="font-display" style={{ fontSize: 18, color }}>{pick.pickNumber}</span>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              {team && <Flag code={team.code} size={24} />}
                              <span className="font-condensed" style={{ color: "var(--white)", fontWeight: 700, fontSize: 15 }}>{team?.name || pick.teamId}</span>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {Object.entries(draft.participants).map(([name, teamIds]) => {
                const color = PARTICIPANT_COLORS[name] || "#666";
                const picksForParticipant = draft.picks.filter((p) => p.participant === name).sort((a, b) => a.pickNumber - b.pickNumber);
                return (
                  <div key={name} className="card" style={{ overflow: "hidden", borderTop: `3px solid ${color}` }}>
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="font-display" style={{ fontSize: 20, color: "var(--white)" }}>{name}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{teamIds.length} teams</span>
                    </div>
                    <div style={{ padding: "8px 0" }}>
                      {picksForParticipant.map((pick) => {
                        const team = TEAM_BY_ID[pick.teamId];
                        if (!team) return null;
                        return (
                          <div key={pick.teamId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <Flag code={team.code} size={24} />
                            <span className="font-condensed" style={{ color: "var(--white)", fontWeight: 600, fontSize: 15, flex: 1 }}>{team.name}</span>
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>Group {team.group}</span>
                            <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 32, textAlign: "right" }}>#{pick.pickNumber}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
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
