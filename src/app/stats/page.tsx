"use client";

import { useEffect, useState } from "react";
import Flag from "@/components/Flag";

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

type Tab = "goals" | "assists" | "cleansheets";

export default function StatsPage() {
  const [scorers, setScorers] = useState<TopScorer[]>([]);
  const [cleanSheets, setCleanSheets] = useState<CleanSheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("goals");

  useEffect(() => {
    fetch("/api/topscorers").then((r) => r.json()).then((d) => {
      setScorers(d.scorers || []);
      setCleanSheets(d.cleanSheets || []);
      setLastUpdated(d.lastUpdated);
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
  ];

  // Sort assist leaders from scorer data
  const assistLeaders = [...scorers].sort(
    (a, b) => (b.statistics[0]?.goals?.assists ?? 0) - (a.statistics[0]?.goals?.assists ?? 0)
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      <h1 className="font-display" style={{ fontSize: 36, color: "var(--gold)", marginBottom: 24 }}>STATS HUB</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid rgba(201,168,76,0.15)", paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="font-condensed"
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
              color: tab === t.key ? "var(--gold)" : "var(--muted)",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 0.5,
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: -1,
            }}
          >
            <span>{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading...</div>
        ) : tab === "goals" ? (
          scorers.length === 0 ? noData : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
          )
        ) : tab === "assists" ? (
          assistLeaders.length === 0 ? noData : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
