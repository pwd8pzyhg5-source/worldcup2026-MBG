"use client";

import { useEffect, useState } from "react";
import Flag from "@/components/Flag";
import { TEAMS, TEAM_BY_ID } from "../../../data/teams";

interface StandingEntry {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

const PARTICIPANT_COLORS: Record<string, string> = {
  Jordan: "#3b82f6",
  Sean: "#10b981",
  Jamie: "#f59e0b",
  Matt: "#ec4899",
  Rob: "#8b5cf6",
};

export default function BracketPage() {
  const [groupStandings, setGroupStandings] = useState<StandingEntry[][]>([]);
  const [draft, setDraft] = useState<{ participants: Record<string, string[]>; completed: boolean }>({ participants: {}, completed: false });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/standings").then((r) => r.json()),
      fetch("/api/draft").then((r) => r.json()),
    ]).then(([standingsData, draftData]) => {
      setGroupStandings(standingsData.standings || []);
      setLastUpdated(standingsData.lastUpdated);
      setDraft(draftData);
      setLoading(false);
    });
  }, []);

  // Build teamId -> participant map from draft
  const teamOwner: Record<string, string> = {};
  for (const [name, teams] of Object.entries(draft.participants || {})) {
    for (const teamId of teams) teamOwner[teamId] = name;
  }

  // Group teams by group letter from our local data
  const groups: Record<string, typeof TEAMS> = {};
  for (const team of TEAMS) {
    if (!groups[team.group]) groups[team.group] = [];
    groups[team.group].push(team);
  }

  const groupLetters = Object.keys(groups).sort();

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      {/* Banner */}
      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 24, height: 160 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/wc-ball-vancouver.png" alt="World Cup Ball Vancouver" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(10,14,26,0.9) 0%, rgba(10,14,26,0.4) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px" }}>
          <h1 className="font-display" style={{ fontSize: 36, color: "var(--gold)" }}>GROUP STAGE</h1>
          <p style={{ color: "rgba(240,244,255,0.7)", fontSize: 13 }}>Team colours indicate which participant owns them.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>Loading...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {groupLetters.map((letter) => {
            const teamsInGroup = groups[letter];
            // Try to find API standings for this group
            const apiGroup = groupStandings.find((g) => g[0]?.group === `Group ${letter}`);

            return (
              <div key={letter} className="card" style={{ overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.05)" }}>
                  <span className="font-display" style={{ color: "var(--gold)", fontSize: 18 }}>GROUP {letter}</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Team", "P", "W", "D", "L", "GD", "Pts"].map((h) => (
                        <th key={h} className="font-condensed" style={{ padding: "6px 8px", textAlign: h === "Team" ? "left" : "center", color: "var(--muted)", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(apiGroup || teamsInGroup.map((t) => ({ rank: 0, team: { id: t.apiId || 0, name: t.name, logo: "" }, points: 0, goalsDiff: 0, group: `Group ${letter}`, all: { played: 0, win: 0, draw: 0, lose: 0, goals: { for: 0, against: 0 } } }))).map((entry, i) => {
                      const team = teamsInGroup[i] || TEAMS.find((t) => t.apiId === entry.team.id);
                      if (!team) return null;
                      const owner = teamOwner[team.id];
                      const ownerColor = owner ? PARTICIPANT_COLORS[owner] : undefined;

                      return (
                        <tr key={team.id} style={{ borderBottom: i < teamsInGroup.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                          <td style={{ padding: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {ownerColor && <div style={{ width: 3, height: 20, borderRadius: 2, background: ownerColor, flexShrink: 0 }} />}
                              <Flag code={team.code} size={16} />
                              <span className="font-condensed" style={{ fontSize: 14, color: "var(--white)", fontWeight: 600 }}>
                                {team.name}
                              </span>
                              {owner && <span style={{ fontSize: 11, color: ownerColor, marginLeft: 2 }}>{owner[0]}</span>}
                            </div>
                          </td>
                          {[entry.all.played, entry.all.win, entry.all.draw, entry.all.lose, entry.goalsDiff >= 0 ? `+${entry.goalsDiff}` : entry.goalsDiff, entry.points].map((val, j) => (
                            <td key={j} style={{ padding: "8px", textAlign: "center", fontSize: 13, color: j === 5 ? "var(--gold)" : "var(--muted)", fontWeight: j === 5 ? 700 : 400 }}>{val}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {lastUpdated && <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 16, textAlign: "right" }}>Updated: {new Date(lastUpdated).toLocaleTimeString()}</p>}
    </div>
  );
}
