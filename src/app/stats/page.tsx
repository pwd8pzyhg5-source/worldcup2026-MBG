"use client";

import { useEffect, useState } from "react";
import Flag from "@/components/Flag";
import { TEAM_BY_ID } from "../../../data/teams";

interface TopScorer {
  player: { id: number; name: string; nationality: string; photo: string };
  statistics: Array<{
    team: { id: number; name: string; logo: string };
    goals: { total: number; assists: number | null };
    cards: { yellow: number; red: number };
  }>;
}

interface CleanSheetEntry {
  teamId: string;
  teamName: string;
  teamCode: string;
  count: number;
}

interface TeamPoints {
  teamId: string;
  total: number;
  breakdown: {
    upsetWins: number;
    upsetDraws: number;
    [key: string]: number;
  };
}

interface ParticipantStanding {
  name: string;
  teams: string[];
  totalPoints: number;
  teamPoints: TeamPoints[];
}

interface UpsetEntry {
  teamId: string;
  participant: string;
  upsetWins: number;
  upsetDraws: number;
  bonusPoints: number;
}

type Tab = "goals" | "assists" | "cleansheets" | "upsets";

const PARTICIPANT_COLORS: Record<string, string> = {
  Gordo: "#3b82f6",
  Shun: "#10b981",
  "Dr. Rick": "#f59e0b",
  "Sexy Tecsy": "#ec4899",
  "Lazy Bones": "#8b5cf6",
  "Bradical Bray": "#f97316",
};

export default function StatsPage() {
  const [scorers, setScorers] = useState<TopScorer[]>([]);
  const [cleanSheets, setCleanSheets] = useState<CleanSheetEntry[]>([]);
  const [upsets, setUpsets] = useState<UpsetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("goals");

  useEffect(() => {
    Promise.all([
      fetch("/api/topscorers").then((r) => r.json()),
      fetch("/api/points").then((r) => r.json()),
    ]).then(([scorerData, pointsData]) => {
      setScorers(scorerData.scorers || []);
      setCleanSheets(scorerData.cleanSheets || []);
      setLastUpdated(scorerData.lastUpdated);

      // Build upset leaderboard from points breakdown
      const upsetsMap: UpsetEntry[] = [];
      for (const standing of (pointsData.standings || []) as ParticipantStanding[]) {
        for (const tp of standing.teamPoints) {
          const wins = tp.breakdown.upsetWins ?? 0;
          const draws = tp.breakdown.upsetDraws ?? 0;
          if (wins > 0 || draws > 0) {
            upsetsMap.push({
              teamId: tp.teamId,
              participant: standing.name,
              upsetWins: wins,
              upsetDraws: draws,
              bonusPoints: wins * 2 + draws * 0.5,
            });
          }
        }
      }
      upsetsMap.sort((a, b) => b.bonusPoints - a.bonusPoints);
      setUpsets(upsetsMap);
      setLoading(false);
    });
  }, []);

  const noData = (
    <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
      No data available yet — stats will appear once the tournament begins on June 11.
    </div>
  );

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: "goals", label: "Golden Boot", emoji: "⚽" },
    { key: "assists", label: "Assist Leaders", emoji: "🎯" },
    { key: "cleansheets", label: "Clean Sheets", emoji: "🧤" },
    { key: "upsets", label: "Upsets", emoji: "🔥" },
  ];

  // Sort assist leaders from scorer data
  const assistLeaders = [...scorers].sort(
    (a, b) => (b.statistics[0]?.goals?.assists ?? 0) - (a.statistics[0]?.goals?.assists ?? 0)
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      <h1 className="font-display" style={{ fontSize: 36, color: "var(--gold)", marginBottom: 24 }}>STATS HUB</h1>

      {/* Tabs */}
      <div style={{ overflowX: "auto", marginBottom: 24, borderBottom: "1px solid rgba(201,168,76,0.15)" }}>
        <div style={{ display: "flex", gap: 0, minWidth: "max-content" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="font-condensed"
              style={{
                padding: "10px 18px",
                background: "transparent",
                border: "none",
                borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
                color: tab === t.key ? "var(--gold)" : "var(--muted)",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: 0.5,
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: -1,
                whiteSpace: "nowrap",
              }}
            >
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading...</div>
        ) : tab === "goals" ? (
          scorers.length === 0 ? noData : (
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                  {["#", "Player", "Team", "Goals", "Assists", "YC", "RC"].map((h) => (
                    <th key={h} className="font-condensed" style={{ padding: "10px 16px", textAlign: ["#","Goals","Assists","YC","RC"].includes(h) ? "center" : "left", color: "var(--muted)", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scorers.slice(0, 20).map((s, i) => {
                  const stat = s.statistics[0];
                  return (
                    <tr key={s.player.id} style={{ borderBottom: i < 19 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: i < 3 ? "var(--gold)" : "var(--muted)", fontWeight: 700, fontSize: 14 }}>{i + 1}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.player.photo} alt="" width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          <div>
                            <div className="font-condensed" style={{ color: "var(--white)", fontWeight: 600, fontSize: 15 }}>{s.player.name}</div>
                            <div style={{ color: "var(--muted)", fontSize: 12 }}>{s.player.nationality}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: 13 }}>{stat?.team?.name || "—"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span className="font-display" style={{ fontSize: 22, color: "var(--gold)" }}>{stat?.goals?.total ?? 0}</span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>{stat?.goals?.assists ?? 0}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {(stat?.cards?.yellow ?? 0) > 0 && <span style={{ background: "#eab308", borderRadius: 2, padding: "2px 6px", fontSize: 12, color: "#000", fontWeight: 700 }}>{stat.cards.yellow}</span>}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {(stat?.cards?.red ?? 0) > 0 && <span style={{ background: "#ef4444", borderRadius: 2, padding: "2px 6px", fontSize: 12, color: "#fff", fontWeight: 700 }}>{stat.cards.red}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )
        ) : tab === "assists" ? (
          assistLeaders.length === 0 ? noData : (
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                  {["#", "Player", "Team", "Assists", "Goals"].map((h) => (
                    <th key={h} className="font-condensed" style={{ padding: "10px 16px", textAlign: ["#","Assists","Goals"].includes(h) ? "center" : "left", color: "var(--muted)", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assistLeaders.slice(0, 20).map((s, i) => {
                  const stat = s.statistics[0];
                  const assists = stat?.goals?.assists ?? 0;
                  if (assists === 0 && i > 0) return null;
                  return (
                    <tr key={s.player.id} style={{ borderBottom: i < 19 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: i < 3 ? "var(--gold)" : "var(--muted)", fontWeight: 700, fontSize: 14 }}>{i + 1}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.player.photo} alt="" width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          <div>
                            <div className="font-condensed" style={{ color: "var(--white)", fontWeight: 600, fontSize: 15 }}>{s.player.name}</div>
                            <div style={{ color: "var(--muted)", fontSize: 12 }}>{s.player.nationality}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: 13 }}>{stat?.team?.name || "—"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span className="font-display" style={{ fontSize: 22, color: "#3b82f6" }}>{assists}</span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>{stat?.goals?.total ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )
        ) : tab === "upsets" ? (
          upsets.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              No upsets yet — watch this space once the tournament begins June 11.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                  {["#", "Team", "Manager", "W", "D", "Bonus Pts"].map((h) => (
                    <th key={h} className="font-condensed" style={{ padding: "10px 16px", textAlign: ["#","W","D","Bonus Pts"].includes(h) ? "center" : "left", color: "var(--muted)", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upsets.map((entry, i) => {
                  const team = TEAM_BY_ID[entry.teamId];
                  const color = PARTICIPANT_COLORS[entry.participant] || "#666";
                  return (
                    <tr key={entry.teamId} style={{ borderBottom: i < upsets.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: i < 3 ? "var(--gold)" : "var(--muted)", fontWeight: 700, fontSize: 14 }}>{i + 1}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {team && <Flag code={team.code} size={24} />}
                          <span className="font-condensed" style={{ color: "var(--white)", fontWeight: 600, fontSize: 15 }}>{team?.name || entry.teamId}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                          <span className="font-condensed" style={{ color, fontSize: 14, fontWeight: 600 }}>{entry.participant}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span className="font-display" style={{ fontSize: 20, color: "#f97316" }}>{entry.upsetWins}</span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span className="font-display" style={{ fontSize: 20, color: "#eab308" }}>{entry.upsetDraws}</span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span className="font-display" style={{ fontSize: 22, color: "var(--gold)" }}>+{entry.bonusPoints}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : (
          // Clean sheets
          cleanSheets.length === 0 ? noData : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                  {["#", "Team", "Clean Sheets"].map((h) => (
                    <th key={h} className="font-condensed" style={{ padding: "10px 16px", textAlign: h === "Clean Sheets" ? "center" : "left", color: "var(--muted)", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cleanSheets.slice(0, 20).map((entry, i) => (
                  <tr key={entry.teamId} style={{ borderBottom: i < cleanSheets.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: i < 3 ? "var(--gold)" : "var(--muted)", fontWeight: 700, fontSize: 14 }}>{i + 1}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Flag code={entry.teamCode} size={28} />
                        <span className="font-condensed" style={{ color: "var(--white)", fontWeight: 600, fontSize: 16 }}>{entry.teamName}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span className="font-display" style={{ fontSize: 22, color: "#10b981" }}>{entry.count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {lastUpdated && <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 12, textAlign: "right" }}>Updated: {new Date(lastUpdated).toLocaleTimeString()}</p>}
    </div>
  );
}
