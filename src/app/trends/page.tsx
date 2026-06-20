"use client";

import { useEffect, useState } from "react";

interface HistoryDay {
  date: string;
  points: Record<string, number>;
}

const PARTICIPANT_COLORS: Record<string, string> = {
  Gordo: "#3b82f6",
  Shun: "#10b981",
  "Dr. Rick": "#f59e0b",
  "Sexy Tecsy": "#ec4899",
  "Lazy Bones": "#8b5cf6",
  "Bradical Bray": "#f97316",
};

const PARTICIPANTS = ["Gordo", "Shun", "Dr. Rick", "Sexy Tecsy", "Lazy Bones", "Bradical Bray"];

function ranksForDay(points: Record<string, number>): Record<string, number> {
  const sorted = [...PARTICIPANTS].sort((a, b) => {
    const diff = (points[b] ?? 0) - (points[a] ?? 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
  const ranks: Record<string, number> = {};
  sorted.forEach((name, i) => { ranks[name] = i + 1; });
  return ranks;
}

export default function TrendsPage() {
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/standings-history")
      .then((r) => r.json())
      .then((data) => {
        setHistory(data.history || []);
        setLoading(false);
      });
  }, []);

  // Chart geometry
  const width = 900;
  const height = 440;
  const padLeft = 130;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 50;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const days = history.length;
  const xFor = (i: number) => days <= 1 ? padLeft + plotW / 2 : padLeft + (plotW * i) / (days - 1);
  const yFor = (rank: number) => padTop + ((rank - 1) / 5) * plotH;

  const rankHistory = history.map((d) => ranksForDay(d.points));

  const dateLabel = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      {/* Banner */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 36, color: "var(--gold)" }}>TRENDS</h1>
        <p style={{ color: "rgba(240,244,255,0.7)", fontSize: 13 }}>Standings position over the course of the tournament.</p>
      </div>

      <div className="card" style={{ padding: 16, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading...</div>
        ) : days === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            No history yet — check back after the first day of standings.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: 600, height: "auto" }}>
              {/* Gridlines + rank labels */}
              {[1, 2, 3, 4, 5, 6].map((rank) => (
                <g key={rank}>
                  <line
                    x1={padLeft} x2={width - padRight}
                    y1={yFor(rank)} y2={yFor(rank)}
                    stroke="rgba(255,255,255,0.06)" strokeWidth={1}
                  />
                  <text
                    x={padLeft - 14} y={yFor(rank) + 5}
                    textAnchor="end" fontSize={13} fill="var(--muted)"
                    fontFamily="var(--font-barlow), sans-serif"
                  >
                    {rank === 1 ? "1st" : rank === 2 ? "2nd" : rank === 3 ? "3rd" : `${rank}th`}
                  </text>
                </g>
              ))}

              {/* Date labels */}
              {history.map((d, i) => (
                <text
                  key={d.date}
                  x={xFor(i)} y={height - padBottom + 22}
                  textAnchor="middle" fontSize={12} fill="var(--muted)"
                  fontFamily="var(--font-barlow), sans-serif"
                >
                  {dateLabel(d.date)}
                </text>
              ))}

              {/* Lines per participant */}
              {PARTICIPANTS.map((name) => {
                const color = PARTICIPANT_COLORS[name];
                const isDimmed = hovered !== null && hovered !== name;
                const points = rankHistory.map((r, i) => `${xFor(i)},${yFor(r[name])}`).join(" ");
                return (
                  <g key={name} opacity={isDimmed ? 0.15 : 1} style={{ transition: "opacity 0.15s" }}>
                    {days > 1 && (
                      <polyline
                        points={points}
                        fill="none"
                        stroke={color}
                        strokeWidth={hovered === name ? 4 : 2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {rankHistory.map((r, i) => (
                      <circle
                        key={i}
                        cx={xFor(i)} cy={yFor(r[name])}
                        r={hovered === name ? 6 : 4.5}
                        fill={color}
                        stroke="#0a0e1a"
                        strokeWidth={1.5}
                      />
                    ))}
                    {/* End-of-line label */}
                    <text
                      x={xFor(days - 1) + 10}
                      y={yFor(rankHistory[days - 1][name]) + 4}
                      fontSize={13}
                      fontWeight={700}
                      fill={color}
                      fontFamily="var(--font-barlow), sans-serif"
                    >
                      {name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Legend / interactive toggle */}
      {!loading && days > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
          {PARTICIPANTS.map((name) => (
            <button
              key={name}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              className="font-condensed"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 6,
                background: hovered === name ? `${PARTICIPANT_COLORS[name]}22` : "rgba(255,255,255,0.03)",
                border: `1px solid ${PARTICIPANT_COLORS[name]}44`,
                cursor: "default", fontSize: 13, fontWeight: 600,
                color: "var(--white)",
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: PARTICIPANT_COLORS[name] }} />
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
