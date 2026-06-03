"use client";

import { useEffect, useState } from "react";

interface TopScorer {
  player: { id: number; name: string; nationality: string; photo: string };
  statistics: Array<{
    team: { id: number; name: string; logo: string };
    goals: { total: number; assists: number | null };
    cards: { yellow: number; red: number };
  }>;
}

export default function StatsPage() {
  const [scorers, setScorers] = useState<TopScorer[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/topscorers").then((r) => r.json()).then((d) => {
      setScorers(d.scorers || []);
      setLastUpdated(d.lastUpdated);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      <h1 className="font-display" style={{ fontSize: 36, color: "var(--gold)", marginBottom: 24 }}>STATS HUB</h1>

      {/* Top scorers */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 32 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🥇</span>
          <h2 className="font-display" style={{ fontSize: 22, color: "var(--gold)" }}>GOLDEN BOOT</h2>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading...</div>
        ) : scorers.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No data available yet. Stats will appear once the tournament begins.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                {["#", "Player", "Team", "Goals", "Assists", "YC", "RC"].map((h) => (
                  <th key={h} className="font-condensed" style={{ padding: "10px 16px", textAlign: h === "#" || h === "Goals" || h === "Assists" || h === "YC" || h === "RC" ? "center" : "left", color: "var(--muted)", fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>{h}</th>
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
                        <img src={s.player.photo} alt={s.player.name} width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
                      {stat?.cards?.yellow > 0 && (
                        <span style={{ background: "#eab308", borderRadius: 2, padding: "2px 6px", fontSize: 12, color: "#000", fontWeight: 700 }}>{stat.cards.yellow}</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {stat?.cards?.red > 0 && (
                        <span style={{ background: "#ef4444", borderRadius: 2, padding: "2px 6px", fontSize: 12, color: "#fff", fontWeight: 700 }}>{stat.cards.red}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {lastUpdated && <p style={{ color: "var(--muted)", fontSize: 12, textAlign: "right" }}>Updated: {new Date(lastUpdated).toLocaleTimeString()}</p>}
    </div>
  );
}
