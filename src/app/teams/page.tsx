"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PARTICIPANTS = ["Gordo", "Shun", "Dr. Rick", "Sexy Tecsy", "Lazy Bones"];

const COLORS: Record<string, string> = {
  Jordan: "#3b82f6",
  Sean: "#10b981",
  Jamie: "#f59e0b",
  Matt: "#ec4899",
  Rob: "#8b5cf6",
};

export default function TeamsPage() {
  const [standings, setStandings] = useState<Array<{ name: string; teams: string[]; totalPoints: number }>>([]);

  useEffect(() => {
    fetch("/api/points").then((r) => r.json()).then((d) => setStandings(d.standings || []));
  }, []);

  const sorted = PARTICIPANTS.map((name) => {
    const s = standings.find((x) => x.name === name);
    return { name, totalPoints: s?.totalPoints ?? 0, teams: s?.teams ?? [] };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      <h1 className="font-display" style={{ fontSize: 36, color: "var(--gold)", marginBottom: 24 }}>PARTICIPANTS</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {sorted.map((p) => (
          <Link key={p.name} href={`/teams/${p.name.toLowerCase()}`} style={{ textDecoration: "none" }}>
            <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 12, borderTop: `3px solid ${COLORS[p.name]}`, transition: "all 0.15s", cursor: "pointer" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = COLORS[p.name]; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
            >
              <div className="font-display" style={{ fontSize: 28, color: "var(--white)" }}>{p.name}</div>
              <div>
                <span className="font-display" style={{ fontSize: 40, color: COLORS[p.name] }}>{p.totalPoints}</span>
                <span style={{ color: "var(--muted)", fontSize: 14, marginLeft: 4 }}>pts</span>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>{p.teams.length} teams</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
