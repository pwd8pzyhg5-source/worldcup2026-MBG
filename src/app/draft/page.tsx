"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Flag from "@/components/Flag";
import { TEAMS } from "../../../data/teams";

interface DraftState {
  completed: boolean;
  draftOrder: string[];
  currentPick: number;
  picks: Array<{ participant: string; teamId: string; pickNumber: number }>;
  participants: Record<string, string[]>;
}

const PARTICIPANT_COLORS: Record<string, string> = {
  Jordan: "#3b82f6",
  Sean: "#10b981",
  Jamie: "#f59e0b",
  Matt: "#ec4899",
  Rob: "#8b5cf6",
};

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

function DraftInner() {
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get("admin") === "true";

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [filterGroup, setFilterGroup] = useState<string>("All");
  const [search, setSearch] = useState("");

  const loadDraft = useCallback(async () => {
    const res = await fetch("/api/draft");
    const data = await res.json();
    setDraft(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  async function initDraft() {
    if (!confirm("Initialize draft? This will randomize pick order.")) return;
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "init", admin: "true" }),
    });
    const data = await res.json();
    setDraft(data);
  }

  async function resetDraft() {
    if (!confirm("Reset draft? All picks will be lost!")) return;
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", admin: "true" }),
    });
    const data = await res.json();
    setDraft(data);
  }

  async function pickTeam(teamId: string) {
    if (!draft || draft.completed || picking) return;
    setPicking(true);
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pick", teamId }),
    });
    const data = await res.json();
    setDraft(data);
    setPicking(false);
  }

  const pickedTeamIds = new Set(draft?.picks.map((p) => p.teamId) || []);
  const currentParticipant = draft && !draft.completed ? draft.draftOrder[draft.currentPick] : null;
  const currentColor = currentParticipant ? PARTICIPANT_COLORS[currentParticipant] : "var(--gold)";

  const filteredTeams = TEAMS.filter((t) => {
    if (filterGroup !== "All" && t.group !== filterGroup) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div style={{ color: "var(--muted)", textAlign: "center", padding: 80 }}>Loading draft...</div>;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 className="font-display" style={{ fontSize: 36, color: "var(--gold)" }}>DRAFT ROOM</h1>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8 }}>
            {!draft?.draftOrder.length && (
              <button onClick={initDraft} style={{ padding: "8px 16px", background: "var(--gold)", color: "#0a0e1a", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Initialize Draft
              </button>
            )}
            {draft?.draftOrder.length ? (
              <button onClick={resetDraft} style={{ padding: "8px 16px", background: "rgba(239,68,68,0.2)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Reset Draft
              </button>
            ) : null}
          </div>
        )}
      </div>

      {!draft?.draftOrder.length ? (
        <div style={{ textAlign: "center", padding: 80, color: "var(--muted)" }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>Draft not initialized yet.</p>
          {isAdmin ? <p>Click "Initialize Draft" to randomize pick order and begin.</p> : <p>Add <code>?admin=true</code> to the URL to initialize the draft.</p>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
          {/* Main: available teams */}
          <div>
            {/* Current pick banner */}
            {!draft.completed ? (
              <div style={{ padding: "16px 20px", borderRadius: 8, marginBottom: 20, border: `2px solid ${currentColor}`, background: `${currentColor}18`, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: currentColor }} />
                <div>
                  <span className="font-condensed" style={{ color: "var(--muted)", fontSize: 13 }}>Pick #{draft.currentPick + 1} of 48 · </span>
                  <span className="font-display" style={{ fontSize: 20, color: currentColor }}>{currentParticipant}'s pick</span>
                </div>
              </div>
            ) : (
              <div style={{ padding: "16px 20px", borderRadius: 8, marginBottom: 20, border: "2px solid var(--gold)", background: "rgba(201,168,76,0.1)", textAlign: "center" }}>
                <span className="font-display" style={{ fontSize: 24, color: "var(--gold)" }}>🏆 DRAFT COMPLETE</span>
              </div>
            )}

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <input
                placeholder="Search team..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 140, padding: "8px 12px", background: "var(--navy-card)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 6, color: "var(--white)", fontSize: 14, outline: "none" }}
              />
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {["All", ...GROUPS].map((g) => (
                  <button
                    key={g}
                    onClick={() => setFilterGroup(g)}
                    className="font-condensed"
                    style={{ padding: "6px 10px", borderRadius: 5, border: "1px solid", borderColor: filterGroup === g ? "var(--gold)" : "rgba(255,255,255,0.1)", background: filterGroup === g ? "rgba(201,168,76,0.15)" : "transparent", color: filterGroup === g ? "var(--gold)" : "var(--muted)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                  >
                    {g === "All" ? "All" : `G${g}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Teams grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {filteredTeams.map((team) => {
                const isPicked = pickedTeamIds.has(team.id);
                const ownerPick = draft.picks.find((p) => p.teamId === team.id);
                const ownerColor = ownerPick ? PARTICIPANT_COLORS[ownerPick.participant] : undefined;

                return (
                  <button
                    key={team.id}
                    onClick={() => !isPicked && !draft.completed && pickTeam(team.id)}
                    disabled={isPicked || draft.completed || picking}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "14px 10px",
                      borderRadius: 8,
                      border: isPicked ? `2px solid ${ownerColor || "#333"}` : "2px solid rgba(201,168,76,0.15)",
                      background: isPicked ? `${ownerColor || "#333"}18` : "var(--navy-card)",
                      cursor: isPicked || draft.completed ? "default" : "pointer",
                      opacity: isPicked ? 0.6 : 1,
                      transition: "all 0.15s",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => { if (!isPicked && !draft.completed) (e.currentTarget as HTMLButtonElement).style.borderColor = currentColor; }}
                    onMouseLeave={(e) => { if (!isPicked && !draft.completed) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(201,168,76,0.15)"; }}
                  >
                    {isPicked && ownerPick && (
                      <div style={{ position: "absolute", top: 4, right: 6, fontSize: 10, color: ownerColor, fontWeight: 700 }}>
                        {ownerPick.participant[0]} #{ownerPick.pickNumber}
                      </div>
                    )}
                    <Flag code={team.code} size={40} />
                    <div className="font-condensed" style={{ fontSize: 13, fontWeight: 700, color: isPicked ? "var(--muted)" : "var(--white)", textAlign: "center", lineHeight: 1.2 }}>
                      {team.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Group {team.group}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar: rosters */}
          <div style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 className="font-display" style={{ fontSize: 18, color: "var(--gold)" }}>ROSTERS</h3>
            {Object.entries(draft.participants).map(([name, teams]) => (
              <div key={name} className="card" style={{ padding: "12px 16px", borderLeft: `3px solid ${PARTICIPANT_COLORS[name]}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span className="font-condensed" style={{ fontWeight: 700, color: "var(--white)", fontSize: 15 }}>{name}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{teams.length} teams</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {teams.map((tid) => {
                    const team = TEAMS.find((t) => t.id === tid);
                    return team ? <Flag key={tid} code={team.code} size={20} title={team.name} /> : null;
                  })}
                  {teams.length === 0 && <span style={{ fontSize: 12, color: "var(--muted)" }}>No picks yet</span>}
                </div>
              </div>
            ))}

            {/* Pick order preview */}
            {!draft.completed && draft.draftOrder.length > 0 && (
              <div className="card" style={{ padding: "12px 16px" }}>
                <div className="font-condensed" style={{ color: "var(--muted)", fontSize: 12, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>UPCOMING PICKS</div>
                {draft.draftOrder.slice(draft.currentPick, draft.currentPick + 10).map((participant, i) => (
                  <div key={`${draft.currentPick + i}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                    <span style={{ fontSize: 11, color: "var(--muted)", width: 28 }}>#{draft.currentPick + i + 1}</span>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: PARTICIPANT_COLORS[participant], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: i === 0 ? "var(--white)" : "var(--muted)", fontWeight: i === 0 ? 700 : 400 }}>{participant}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DraftPage() {
  return (
    <Suspense fallback={<div style={{ color: "var(--muted)", textAlign: "center", padding: 80 }}>Loading draft...</div>}>
      <DraftInner />
    </Suspense>
  );
}
