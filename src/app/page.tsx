"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Flag from "@/components/Flag";
import { TEAM_BY_ID, TEAM_BY_API_ID } from "../../data/teams";

interface ParticipantStanding {
  name: string;
  teams: string[];
  totalPoints: number;
  teamPoints: Array<{ teamId: string; total: number; breakdown: Record<string, number> }>;
}

interface LiveEvent {
  time: { elapsed: number };
  team: { id: number; name: string };
  player: { name: string };
  type: string;
  detail: string;
}

interface LiveFixture {
  fixture: { id: number; date: string; status: { short: string; elapsed: number | null }; venue: { name: string; city: string } };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  goals: { home: number | null; away: number | null };
  events?: LiveEvent[];
}

const PARTICIPANT_COLORS: Record<string, string> = {
  Gordo: "#3b82f6",
  Shun: "#10b981",
  "Dr. Rick": "#f59e0b",
  "Sexy Tecsy": "#ec4899",
  "Lazy Bones": "#8b5cf6",
  "Bradical Bray": "#f97316",
};

const RANK_LABELS = ["🥇", "🥈", "🥉", "4th", "5th", "6th"];

export default function Home() {
  const [standings, setStandings] = useState<ParticipantStanding[]>([]);
  const [draftCompleted, setDraftCompleted] = useState(false);
  const [hasLiveGames, setHasLiveGames] = useState(false);
  const [liveFixtures, setLiveFixtures] = useState<LiveFixture[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRoster, setExpandedRoster] = useState<string | null>(null);
  const [apiIdOwner, setApiIdOwner] = useState<Record<number, string>>({});
  const [upcomingFixtures, setUpcomingFixtures] = useState<LiveFixture[]>([]);

  async function refreshLive() {
    const [liveRes, pointsRes] = await Promise.all([
      fetch("/api/fixtures?live=true"),
      fetch("/api/points"),
    ]);
    const liveData = await liveRes.json();
    setLiveFixtures(liveData.fixtures || []);
    const pointsData = await pointsRes.json();
    setStandings(pointsData.standings || []);
    setHasLiveGames(pointsData.hasLiveGames || false);
    setLastUpdated(pointsData.lastUpdated);
  }

  useEffect(() => {
    async function load() {
      const [pointsRes, liveRes, draftRes, upcomingRes] = await Promise.all([
        fetch("/api/points"),
        fetch("/api/fixtures?live=true"),
        fetch("/api/draft"),
        fetch("/api/fixtures?upcoming=true"),
      ]);
      const pointsData = await pointsRes.json();
      setStandings(pointsData.standings || []);
      setDraftCompleted(pointsData.draftCompleted || false);
      setHasLiveGames(pointsData.hasLiveGames || false);
      setLastUpdated(pointsData.lastUpdated);
      const liveData = await liveRes.json();
      setLiveFixtures(liveData.fixtures || []);
      const draftData = await draftRes.json();
      const idOwner: Record<number, string> = {};
      for (const [participant, teamIds] of Object.entries(draftData.participants || {} as Record<string, string[]>)) {
        for (const tid of teamIds as string[]) {
          const team = TEAM_BY_ID[tid];
          if (team && team.apiId) idOwner[team.apiId] = participant;
        }
      }
      setApiIdOwner(idOwner);
      const upcomingData = await upcomingRes.json();
      setUpcomingFixtures(upcomingData.fixtures || []);
      setLoading(false);
    }
    load();
    // Poll every 3 min — refreshes both live scores and standings.
    // Kept conservative to stay under the API-Football daily request cap.
    const interval = setInterval(refreshLive, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  function getOwner(apiTeamId: number) {
    return apiIdOwner[apiTeamId];
  }

  return (
    <>
      <style>{`
        .hero-content { display: flex; align-items: center; gap: 28px; justify-content: center; padding: 40px 24px; }
        .hero-trophy { height: 150px; }
        .hero-title { font-size: 60px; }
        .hero-sub { font-size: 13px; }
        .standings-teams { display: flex; }
        .standings-row td { padding: 14px 16px; }
        .rank-cell { width: 48px; font-size: 16px; }
        .points-cell { font-size: 26px; }
        .draft-banner { flex-direction: row; }
        .roster-grid { display: grid; grid-template-columns: repeat(4, 1fr); }

        @media (max-width: 600px) {
          .hero-content { flex-direction: column; gap: 12px; padding: 28px 16px; }
          .hero-trophy { height: 90px; }
          .hero-title { font-size: 38px !important; }
          .hero-sub { font-size: 11px; }
          .standings-teams { display: none; }
          .standings-row td { padding: 12px 10px; }
          .rank-cell { width: 36px; font-size: 14px; }
          .points-cell { font-size: 22px; }
          .draft-banner { flex-direction: column !important; gap: 10px; }
          .draft-banner a { text-align: center; }
          .roster-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 12px" }}>

        {/* Hero */}
        <div style={{ position: "relative", borderRadius: 12, marginBottom: 20, overflow: "hidden", minHeight: 200 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/bc-place.jpg" alt="BC Place" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 40%" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,14,26,0.5) 0%, rgba(10,14,26,0.88) 100%)" }} />
          <div className="hero-content" style={{ position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/trophy-emblem.png" alt="World Cup Trophy" className="hero-trophy" style={{ objectFit: "contain", filter: "drop-shadow(0 0 20px rgba(201,168,76,0.6))", flexShrink: 0 }} />
            <div style={{ textAlign: "center" }}>
              <div className="font-display hero-sub" style={{ color: "var(--gold)", letterSpacing: 4, marginBottom: 6 }}>
                FIFA WORLD CUP 2026
              </div>
              <h1 className="font-display hero-title" style={{ color: "var(--white)", lineHeight: 1, marginBottom: 8 }}>
                MBG TOURNAMENT
              </h1>
              <p style={{ color: "rgba(240,244,255,0.65)", fontSize: 12 }}>
                Gordo · Shun · Dr. Rick · Sexy Tecsy · Lazy Bones · Bradical Bray
              </p>
            </div>
          </div>
        </div>

        {/* Live ticker */}
        {liveFixtures.length > 0 && (
          <div className="card" style={{ padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span className="live-dot" />
              <span className="font-condensed" style={{ color: "#ef4444", fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>LIVE NOW</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {liveFixtures.map((f) => {
                const homeOwner = getOwner(f.teams.home.id);
                const awayOwner = getOwner(f.teams.away.id);
                const elapsed = f.fixture.status.elapsed;
                const statusLabel = f.fixture.status.short === "HT" ? "HT" : elapsed ? `${elapsed}'` : f.fixture.status.short;

                // Separate goals and cards from events
                const goals = (f.events ?? []).filter(e => e.type === "Goal" && e.detail !== "Missed Penalty");
                const allCards = (f.events ?? []).filter(e => e.type === "Card");

                // Per-team card counts for compact summary
                const homeYellows = allCards.filter(e => e.team.id === f.teams.home.id && e.detail === "Yellow Card").length;
                const awayYellows = allCards.filter(e => e.team.id === f.teams.away.id && e.detail === "Yellow Card").length;
                const homeReds = allCards.filter(e => e.team.id === f.teams.home.id && (e.detail === "Red Card" || e.detail === "Second Yellow Card")).length;
                const awayReds = allCards.filter(e => e.team.id === f.teams.away.id && (e.detail === "Red Card" || e.detail === "Second Yellow Card")).length;
                const hasCards = homeYellows + awayYellows + homeReds + awayReds > 0;

                const cardSummary = (yellows: number, reds: number) =>
                  [yellows > 0 ? `🟨${yellows}` : "", reds > 0 ? `🟥${reds}` : ""].filter(Boolean).join(" ");

                return (
                  <div key={f.fixture.id} style={{ background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.18)", padding: "10px 12px" }}>
                    {/* Score row */}
                    <div className="font-condensed" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700, minWidth: 28 }}>{statusLabel}</span>
                      <span style={{ color: homeOwner ? PARTICIPANT_COLORS[homeOwner] : "var(--white)", fontSize: 14, fontWeight: 700, flex: 1, textAlign: "right" }}>{f.teams.home.name}</span>
                      <span style={{ color: "var(--gold)", fontWeight: 800, fontSize: 18, minWidth: 40, textAlign: "center" }}>{f.goals.home ?? 0}–{f.goals.away ?? 0}</span>
                      <span style={{ color: awayOwner ? PARTICIPANT_COLORS[awayOwner] : "var(--white)", fontSize: 14, fontWeight: 700, flex: 1 }}>{f.teams.away.name}</span>
                    </div>
                    {/* Owner + card summary row */}
                    {(homeOwner || awayOwner) && (
                      <div className="font-condensed" style={{ display: "flex", gap: 8, fontSize: 11, marginBottom: goals.length ? 6 : 0 }}>
                        <span style={{ flex: 1, textAlign: "right", color: homeOwner ? PARTICIPANT_COLORS[homeOwner] : "var(--muted)" }}>
                          {homeOwner ?? "—"}{hasCards && cardSummary(homeYellows, homeReds) ? <span style={{ marginLeft: 5, opacity: 0.9 }}>{cardSummary(homeYellows, homeReds)}</span> : null}
                        </span>
                        <span style={{ minWidth: 40, textAlign: "center", color: "var(--muted)" }}>vs</span>
                        <span style={{ flex: 1, color: awayOwner ? PARTICIPANT_COLORS[awayOwner] : "var(--muted)" }}>
                          {hasCards && cardSummary(awayYellows, awayReds) ? <span style={{ marginRight: 5, opacity: 0.9 }}>{cardSummary(awayYellows, awayReds)}</span> : null}{awayOwner ?? "—"}
                        </span>
                      </div>
                    )}
                    {/* Goal events — split home left / away right */}
                    {goals.length > 0 && (
                      <div className="font-condensed" style={{ display: "flex", gap: 8, fontSize: 11, marginBottom: f.fixture.venue?.name ? 6 : 0 }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                          {goals.filter(e => e.team.id === f.teams.home.id).map((e, i) => {
                            const parts = e.player.name.split(" ");
                            const short = parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : e.player.name;
                            return (
                              <span key={i} style={{ color: "#10b981" }}>
                                {short} {e.time.elapsed}&apos;{e.detail === "Own Goal" ? " (OG)" : ""} ⚽
                              </span>
                            );
                          })}
                        </div>
                        <div style={{ minWidth: 40 }} />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
                          {goals.filter(e => e.team.id === f.teams.away.id).map((e, i) => {
                            const parts = e.player.name.split(" ");
                            const short = parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : e.player.name;
                            return (
                              <span key={i} style={{ color: "#10b981" }}>
                                ⚽ {short} {e.time.elapsed}&apos;{e.detail === "Own Goal" ? " (OG)" : ""}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Venue — shown last */}
                    {f.fixture.venue?.name && (
                      <div className="font-condensed" style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 2, opacity: 0.65 }}>
                        📍 {f.fixture.venue.name}, {f.fixture.venue.city}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Draft banner */}
        {!draftCompleted && !loading && (
          <div className="draft-banner" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, padding: "14px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <p className="font-condensed" style={{ color: "var(--gold)", fontWeight: 700, fontSize: 15 }}>Draft not started yet</p>
              <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>Pick your teams before June 11.</p>
            </div>
            <Link href="/draft" style={{ padding: "8px 18px", background: "var(--gold)", color: "#0a0e1a", borderRadius: 6, textDecoration: "none", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}>
              Go to Draft →
            </Link>
          </div>
        )}

        {/* Upcoming fixtures */}
        {!loading && upcomingFixtures.length > 0 && (
          <div className="card" style={{ padding: "12px 14px", marginBottom: 16 }}>
            <div className="font-condensed" style={{ color: "var(--gold)", fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>UP NEXT</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {upcomingFixtures.map((f) => {
                const homeOwner = getOwner(f.teams.home.id);
                const awayOwner = getOwner(f.teams.away.id);
                const homeTeam = TEAM_BY_API_ID[f.teams.home.id];
                const awayTeam = TEAM_BY_API_ID[f.teams.away.id];
                const kickoff = new Date(f.fixture.date);
                const dateLabel = kickoff.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
                const timeLabel = kickoff.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
                return (
                  <div key={f.fixture.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 8, flexWrap: "wrap" }}>
                    {/* Teams + score placeholder */}
                    <div className="font-condensed" style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 180 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {homeTeam && <Flag code={homeTeam.code} size={16} />}
                        <span style={{ color: homeOwner ? PARTICIPANT_COLORS[homeOwner] : "var(--white)", fontWeight: 700, fontSize: 13 }}>{f.teams.home.name}</span>
                      </div>
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>vs</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {awayTeam && <Flag code={awayTeam.code} size={16} />}
                        <span style={{ color: awayOwner ? PARTICIPANT_COLORS[awayOwner] : "var(--white)", fontWeight: 700, fontSize: 13 }}>{f.teams.away.name}</span>
                      </div>
                    </div>
                    {/* Owner matchup */}
                    {(homeOwner || awayOwner) && (
                      <div className="font-condensed" style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
                        <span style={{ color: homeOwner ? PARTICIPANT_COLORS[homeOwner] : "var(--muted)" }}>{homeOwner ?? "—"}</span>
                        <span style={{ margin: "0 4px" }}>vs</span>
                        <span style={{ color: awayOwner ? PARTICIPANT_COLORS[awayOwner] : "var(--muted)" }}>{awayOwner ?? "—"}</span>
                      </div>
                    )}
                    {/* Time + venue */}
                    <div className="font-condensed" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right", whiteSpace: "nowrap" }}>
                      <span style={{ color: "var(--white)", fontWeight: 600 }}>{dateLabel} · {timeLabel}</span>
                      {f.fixture.venue?.name && <><br /><span style={{ opacity: 0.6 }}>📍 {f.fixture.venue.name}, {f.fixture.venue.city}</span></>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Standings */}
        <div className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", gap: 10 }}>
            <h2 className="font-display" style={{ fontSize: 20, color: "var(--gold)" }}>STANDINGS</h2>
            {hasLiveGames && (
              <span className="font-condensed" style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, letterSpacing: 1, display: "flex", alignItems: "center", gap: 4 }}>
                <span className="live-dot" />UPDATING LIVE
              </span>
            )}
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                  <th className="font-condensed" style={{ padding: "8px 10px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>RANK</th>
                  <th className="font-condensed" style={{ padding: "8px 10px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>NAME</th>
                  <th className="font-condensed standings-teams" style={{ padding: "8px 10px", textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>TEAMS</th>
                  <th className="font-condensed" style={{ padding: "8px 10px", textAlign: "right", color: "var(--muted)", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((p, i) => {
                  const color = PARTICIPANT_COLORS[p.name] || "#666";
                  const isExpanded = expandedRoster === p.name;
                  const photoSlug = p.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
                  return (
                    <>
                      <tr key={p.name} className="standings-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }} onClick={() => setExpandedRoster(isExpanded ? null : p.name)}>
                        <td className="rank-cell" style={{ padding: "14px 10px" }}>{RANK_LABELS[i]}</td>
                        <td style={{ padding: "14px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/images/participants/${photoSlug}.jpg`}
                              alt=""
                              width={32} height={32}
                              style={{ borderRadius: "50%", objectFit: "cover", border: `2px solid ${color}`, flexShrink: 0 }}
                              onError={(e) => {
                                const el = e.target as HTMLImageElement;
                                el.style.display = "none";
                                (el.nextSibling as HTMLElement | null)?.style && ((el.nextSibling as HTMLElement).style.display = "block");
                              }}
                            />
                            <div style={{ width: 5, height: 24, borderRadius: 3, background: color, flexShrink: 0, display: "none" }} />
                            <span className="font-condensed" style={{ color: "var(--white)", fontSize: 16, fontWeight: 700 }}>{p.name}</span>
                            <span style={{ color: "var(--muted)", fontSize: 11 }}>{isExpanded ? "▲" : "▼"}</span>
                          </div>
                        </td>
                        <td className="standings-teams" style={{ padding: "14px 10px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                            {p.teams.map((tid) => {
                              const team = TEAM_BY_ID[tid];
                              return team ? <Flag key={tid} code={team.code} size={18} title={team.name} /> : null;
                            })}
                          </div>
                        </td>
                        <td style={{ padding: "14px 10px", textAlign: "right" }}>
                          <span className="font-display points-cell" style={{ color: i === 0 ? "var(--gold)" : "var(--white)" }}>{p.totalPoints}</span>
                          <span style={{ color: "var(--muted)", fontSize: 11, marginLeft: 3 }}>pts</span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${p.name}-roster`} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <td colSpan={4} style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)" }}>
                            <div className="roster-grid" style={{ gap: 6 }}>
                              {p.teams.map((tid) => {
                                const team = TEAM_BY_ID[tid];
                                if (!team) return null;
                                const tp = p.teamPoints.find((x) => x.teamId === tid);
                                return (
                                  <div key={tid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: `1px solid ${color}33` }}>
                                    <Flag code={team.code} size={20} title={team.name} />
                                    <div style={{ minWidth: 0 }}>
                                      <div className="font-condensed" style={{ color: "var(--white)", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.name}</div>
                                      <div style={{ color: "var(--muted)", fontSize: 11 }}>Grp {team.group} · <span style={{ color, fontWeight: 700 }}>{tp?.total ?? 0} pts</span></div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {lastUpdated && (
          <p style={{ color: "var(--muted)", fontSize: 11, marginBottom: 20, textAlign: "right" }}>
            Updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}

        {/* Points reference */}
        <div className="card" style={{ padding: "16px" }}>
          <h3 className="font-display" style={{ fontSize: 16, color: "var(--gold)", marginBottom: 12 }}>POINTS SYSTEM</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6 }}>
            {[["Group win","3"],["Group draw","1"],["Clean sheet","2"],["Goal scored","1"],["Upset win (ranked 30+ beats top 10)","3"],["Upset draw (ranked 30+ draws top 10)","1"],["Round of 32","2"],["Round of 16","4"],["Quarter-Final","6"],["Bronze Medal","9"],["Runner-up","11"],["Champion","15"],["Red card","-2"],["3 yellows","-1"]].map(([label, pts]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>{label}</span>
                <span className="font-condensed" style={{ color: pts.startsWith("-") ? "#ef4444" : "#e8c96a", fontWeight: 700, fontSize: 13 }}>
                  {pts.startsWith("-") ? pts : `+${pts}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
