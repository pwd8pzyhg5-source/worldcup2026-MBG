"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Flag from "@/components/Flag";
import { TEAM_BY_ID } from "../../data/teams";

interface ParticipantStanding {
  name: string;
  teams: string[];
  totalPoints: number;
  teamPoints: Array<{ teamId: string; total: number; breakdown: Record<string, number> }>;
}

interface LiveFixture {
  fixture: { id: number; status: { short: string } };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
  league: { round: string };
}

const PARTICIPANT_COLORS: Record<string, string> = {
  Jordan: "#3b82f6",
  Sean: "#10b981",
  Jamie: "#f59e0b",
  Matt: "#ec4899",
  Rob: "#8b5cf6",
};

const RANK_LABELS = ["🥇", "🥈", "🥉", "4th", "5th"];

export default function Home() {
  const [standings, setStandings] = useState<ParticipantStanding[]>([]);
  const [draftCompleted, setDraftCompleted] = useState(false);
  const [liveFixtures, setLiveFixtures] = useState<LiveFixture[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [pointsRes, liveRes] = await Promise.all([
        fetch("/api/points"),
        fetch("/api/fixtures?live=true"),
      ]);
      const pointsData = await pointsRes.json();
      setStandings(pointsData.standings || []);
      setDraftCompleted(pointsData.draftCompleted || false);
      setLastUpdated(pointsData.lastUpdated);
      const liveData = await liveRes.json();
      setLiveFixtures(liveData.fixtures || []);
      setLoading(false);
    }
    load();
    const interval = setInterval(() => {
      fetch("/api/fixtures?live=true")
        .then((r) => r.json())
        .then((d) => setLiveFixtures(d.fixtures || []));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      {/* Hero */}
      <div style={{
        position: "relative",
        borderRadius: 12,
        marginBottom: 32,
        overflow: "hidden",
        minHeight: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {/* Background stadium image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/bc-place.jpg"
          alt="BC Place"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%" }}
        />
        {/* Dark overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,14,26,0.55) 0%, rgba(10,14,26,0.85) 100%)" }} />

        {/* Content */}
        <div style={{ position: "relative", textAlign: "center", padding: "48px 32px", display: "flex", alignItems: "center", gap: 32, justifyContent: "center" }}>
          {/* Trophy */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/trophy.avif" alt="World Cup Trophy" style={{ height: 140, objectFit: "contain", filter: "drop-shadow(0 0 20px rgba(201,168,76,0.5))", flexShrink: 0 }} />

          <div>
            <div className="font-display" style={{ fontSize: 13, color: "var(--gold)", letterSpacing: 4, marginBottom: 8 }}>
              FIFA WORLD CUP 2026 · MBG LEAGUE
            </div>
            <h1 className="font-display" style={{ fontSize: 64, color: "var(--white)", lineHeight: 1, marginBottom: 10 }}>
              BIG DOGS BARK
            </h1>
            <p style={{ color: "rgba(240,244,255,0.7)", fontSize: 15 }}>Gordo · Shun · Dr. Rick · Sexy Tecsy · Lazy Bones</p>
          </div>
        </div>
      </div>

      {/* Live ticker */}
      {liveFixtures.length > 0 && (
        <div className="card" style={{ padding: "12px 16px", marginBottom: 24, display: "flex", gap: 16, overflowX: "auto", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span className="live-dot" />
            <span className="font-condensed" style={{ color: "#ef4444", fontWeight: 600, fontSize: 13, letterSpacing: 1 }}>LIVE</span>
          </div>
          {liveFixtures.map((f) => (
            <div key={f.fixture.id} className="font-condensed" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)", flexShrink: 0, fontSize: 15, fontWeight: 600 }}>
              <span>{f.teams.home.name}</span>
              <span style={{ color: "var(--gold)", fontWeight: 700 }}>{f.goals.home ?? 0} – {f.goals.away ?? 0}</span>
              <span>{f.teams.away.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Draft banner */}
      {!draftCompleted && !loading && (
        <div style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, padding: "16px 20px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <p className="font-condensed" style={{ color: "var(--gold)", fontWeight: 700, fontSize: 16 }}>Draft not started yet</p>
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>Head to the Draft Room to pick your teams before June 11.</p>
          </div>
          <Link href="/draft" style={{ padding: "8px 20px", background: "var(--gold)", color: "#0a0e1a", borderRadius: 6, textDecoration: "none", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>
            Go to Draft →
          </Link>
        </div>
      )}

      {/* Standings table */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 32 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
          <h2 className="font-display" style={{ fontSize: 22, color: "var(--gold)" }}>STANDINGS</h2>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                {["Rank", "Participant", "Teams", "Points"].map((h) => (
                  <th key={h} className="font-condensed" style={{ padding: "10px 20px", textAlign: h === "Points" ? "right" : "left", color: "var(--muted)", fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((p, i) => (
                <tr key={p.name} style={{ borderBottom: i < standings.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <td style={{ padding: "16px 20px", fontSize: 18, width: 60 }}>{RANK_LABELS[i]}</td>
                  <td style={{ padding: "16px 20px" }}>
                    <Link href={`/teams/${p.name.toLowerCase()}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 6, height: 28, borderRadius: 3, background: PARTICIPANT_COLORS[p.name] || "#666", flexShrink: 0 }} />
                      <span className="font-condensed" style={{ color: "var(--white)", fontSize: 18, fontWeight: 700 }}>{p.name}</span>
                    </Link>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {p.teams.map((tid) => {
                        const team = TEAM_BY_ID[tid];
                        return team ? <Flag key={tid} code={team.code} size={20} /> : null;
                      })}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "right" }}>
                    <span className="font-display" style={{ fontSize: 28, color: i === 0 ? "var(--gold)" : "var(--white)" }}>{p.totalPoints}</span>
                    <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 4 }}>pts</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {lastUpdated && (
        <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 24, textAlign: "right" }}>
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}

      {/* Points reference */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <h3 className="font-display" style={{ fontSize: 18, color: "var(--gold)", marginBottom: 16 }}>POINTS SYSTEM</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
          {[["Group win","3"],["Group draw","1"],["Clean sheet","2"],["Goal scored","1 each"],["Round of 32","2"],["Round of 16","4"],["Quarter-Final","6"],["Semi-Final","8"],["Bronze Medal","10"],["Runner-up","14"],["Champion","20"],["Red card","-2"],["2 yellows","-1"]].map(([label, pts]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>{label}</span>
              <span className="font-condensed" style={{ color: pts.startsWith("-") ? "#ef4444" : "var(--gold-light)", fontWeight: 700, fontSize: 14 }}>
                {pts.startsWith("-") ? pts : `+${pts}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
