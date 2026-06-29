"use client";

import { useEffect, useState } from "react";
import Flag from "@/components/Flag";
import ParticipantAvatar from "@/components/ParticipantAvatar";
import { TEAMS, TEAM_BY_ID, TEAM_BY_API_ID } from "../../../data/teams";

interface StandingEntry {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

interface KnockoutFixture {
  fixtureId: number;
  round: string;
  date: string | null;
  status: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
}

const PARTICIPANT_COLORS: Record<string, string> = {
  Gordo: "#3b82f6",
  Shun: "#10b981",
  "Dr. Rick": "#f59e0b",
  "Sexy Tecsy": "#ec4899",
  "Lazy Bones": "#8b5cf6",
  "Bradical Bray": "#f97316",
};

const FINISHED = ["FT", "AET", "PEN", "WO", "AWD"];

function KnockoutMatchCard({ fixture, teamOwner, eliminatedTeams }: {
  fixture: KnockoutFixture;
  teamOwner: Record<string, string>;
  eliminatedTeams: Set<string>;
}) {
  const homeTeam = fixture.homeTeamId ? TEAM_BY_ID[fixture.homeTeamId] : null;
  const awayTeam = fixture.awayTeamId ? TEAM_BY_ID[fixture.awayTeamId] : null;
  const isFinished = FINISHED.includes(fixture.status);
  const isLive = ["1H", "HT", "2H", "ET", "P", "BT"].includes(fixture.status);

  const dateStr = fixture.date
    ? new Date(fixture.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
    : null;

  function TeamRow({ teamId, goals, isWinner }: { teamId: string | null; goals: number | null; isWinner: boolean }) {
    const team = teamId ? TEAM_BY_ID[teamId] : null;
    const owner = teamId ? teamOwner[teamId] : null;
    const ownerColor = owner ? PARTICIPANT_COLORS[owner] : undefined;
    const out = teamId ? eliminatedTeams.has(teamId) : false;

    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 7, padding: "7px 10px",
        opacity: (!teamId || out) ? (teamId ? 0.35 : 1) : 1,
        filter: out ? "grayscale(0.8)" : "none",
        background: isWinner ? "rgba(201,168,76,0.06)" : "transparent",
      }}>
        {ownerColor && <div style={{ width: 2, height: 16, borderRadius: 2, background: ownerColor, flexShrink: 0 }} />}
        {team ? (
          <>
            <Flag code={team.code} size={16} />
            <span className="font-condensed" style={{ fontSize: 13, fontWeight: 600, color: out ? "var(--muted)" : isWinner ? "var(--white)" : "var(--muted)", flex: 1 }}>
              {team.name}
            </span>
          </>
        ) : (
          <span className="font-condensed" style={{ fontSize: 12, color: "var(--muted)", flex: 1, fontStyle: "italic" }}>TBD</span>
        )}
        {owner && <ParticipantAvatar name={owner} size={14} color={ownerColor} className="" />}
        {(isFinished || isLive) && goals !== null && (
          <span className="font-display" style={{ fontSize: 15, color: isWinner ? "var(--gold)" : "var(--muted)", fontWeight: 700, minWidth: 14, textAlign: "right" }}>{goals}</span>
        )}
      </div>
    );
  }

  const hg = fixture.homeGoals ?? -1;
  const ag = fixture.awayGoals ?? -1;
  const homeWon = isFinished && hg > ag;
  const awayWon = isFinished && ag > hg;

  return (
    <div style={{ background: "var(--navy-card)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden", minWidth: 200 }}>
      {dateStr && (
        <div style={{ padding: "4px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{dateStr}</span>
          {isLive && <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700, letterSpacing: 0.5 }}>LIVE</span>}
          {isFinished && <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 0.5 }}>FT</span>}
        </div>
      )}
      <TeamRow teamId={fixture.homeTeamId} goals={fixture.homeGoals} isWinner={homeWon} />
      <div style={{ height: "0.5px", background: "rgba(255,255,255,0.05)", margin: "0 10px" }} />
      <TeamRow teamId={fixture.awayTeamId} goals={fixture.awayGoals} isWinner={awayWon} />
    </div>
  );
}

export default function BracketPage() {
  const [groupStandings, setGroupStandings] = useState<StandingEntry[][]>([]);
  const [draft, setDraft] = useState<{ participants: Record<string, string[]>; completed: boolean }>({ participants: {}, completed: false });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [knockoutRounds, setKnockoutRounds] = useState<Record<string, KnockoutFixture[]>>({});
  const [roundOrder, setRoundOrder] = useState<string[]>([]);
  const [eliminatedTeams, setEliminatedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    function refresh(initial = false) {
      const fetches: Promise<Response>[] = [
        fetch("/api/standings"),
        fetch("/api/knockout"),
        fetch("/api/eliminated"),
      ];
      if (initial) {
        fetches.push(fetch("/api/draft"));
      }
      Promise.all(fetches.map((f) => f.then((r) => r.json()))).then((results) => {
        const [standingsData, knockoutData, eliminatedData, draftData] = results;
        setGroupStandings(standingsData.standings || []);
        setLastUpdated(standingsData.lastUpdated);
        setKnockoutRounds(knockoutData.rounds || {});
        setRoundOrder(knockoutData.roundOrder || []);
        setEliminatedTeams(new Set(eliminatedData.eliminated || []));
        if (draftData) setDraft(draftData);
        if (initial) setLoading(false);
      });
    }
    refresh(true);
    const interval = setInterval(() => refresh(false), 10 * 60 * 1000);
    return () => clearInterval(interval);
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
          <p style={{ color: "rgba(240,244,255,0.7)", fontSize: 13 }}>Team colours indicate which participant owns them. Greyed = eliminated.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>Loading...</div>
      ) : (
        <>
          {/* Group tables */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
            {groupLetters.map((letter) => {
              const teamsInGroup = groups[letter];
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
                        const team = TEAM_BY_API_ID[entry.team.id] || teamsInGroup[i];
                        if (!team) return null;
                        const owner = teamOwner[team.id];
                        const ownerColor = owner ? PARTICIPANT_COLORS[owner] : undefined;
                        const out = eliminatedTeams.has(team.id);

                        return (
                          <tr key={team.id} style={{ borderBottom: i < teamsInGroup.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", opacity: out ? 0.38 : 1, filter: out ? "grayscale(0.8)" : "none", transition: "opacity 0.2s" }}>
                            <td style={{ padding: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {ownerColor && !out && <div style={{ width: 3, height: 20, borderRadius: 2, background: ownerColor, flexShrink: 0 }} />}
                                <Flag code={team.code} size={16} />
                                <span className="font-condensed" style={{ fontSize: 14, color: out ? "var(--muted)" : "var(--white)", fontWeight: 600 }}>
                                  {team.name}
                                </span>
                                {owner && !out && <ParticipantAvatar name={owner} size={16} color={ownerColor} className="" />}
                              </div>
                            </td>
                            {[entry.all.played, entry.all.win, entry.all.draw, entry.all.lose, entry.goalsDiff >= 0 ? `+${entry.goalsDiff}` : entry.goalsDiff, entry.points].map((val, j) => (
                              <td key={j} style={{ padding: "8px", textAlign: "center", fontSize: 13, color: j === 5 ? (out ? "var(--muted)" : "var(--gold)") : "var(--muted)", fontWeight: j === 5 ? 700 : 400 }}>{val}</td>
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

          {/* Knockout bracket */}
          {roundOrder.length > 0 && (
            <div style={{ marginTop: 48 }}>
              <h2 className="font-display" style={{ fontSize: 28, color: "var(--gold)", marginBottom: 24 }}>KNOCKOUT STAGE</h2>
              {roundOrder.map((round) => {
                const fixtures = knockoutRounds[round] || [];
                return (
                  <div key={round} style={{ marginBottom: 36 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <span className="font-display" style={{ fontSize: 18, color: "var(--white)", letterSpacing: 1 }}>{round.toUpperCase()}</span>
                      <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.1)" }} />
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{fixtures.length} match{fixtures.length !== 1 ? "es" : ""}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {fixtures.map((f) => (
                        <div key={f.fixtureId} style={{ flex: "1 1 220px", maxWidth: 320 }}>
                          <KnockoutMatchCard fixture={f} teamOwner={teamOwner} eliminatedTeams={eliminatedTeams} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {lastUpdated && <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 16, textAlign: "right" }}>Updated: {new Date(lastUpdated).toLocaleTimeString()}</p>}
    </div>
  );
}
