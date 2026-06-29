"use client";

import { useEffect, useState } from "react";
import Flag from "@/components/Flag";
import ParticipantAvatar from "@/components/ParticipantAvatar";
import { TEAM_BY_ID } from "../../../data/teams";

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

const FINISHED = new Set(["FT", "AET", "PEN", "WO", "AWD"]);
const LIVE = new Set(["1H", "HT", "2H", "ET", "P", "BT"]);

// Bracket geometry
const CARD_H = 68;
const CARD_W = 168;
const TOTAL_H = 704; // 8 R32 slots × 88px each
const CONNECTOR_W = 28;

// Y center for match i in a round with n matches, using space-around in TOTAL_H
function matchCenterY(i: number, n: number): number {
  const totalGap = TOTAL_H - n * CARD_H;
  const gapPerItem = totalGap / n;
  return gapPerItem / 2 + i * (CARD_H + gapPerItem) + CARD_H / 2;
}


interface ConnectorProps {
  n: number; // number of source matches in the round
  direction: "right" | "left"; // which side the connection exits
}

function BracketConnector({ n, direction }: ConnectorProps) {
  const numPairs = n / 2;
  const BEND = 18;

  return (
    <svg
      width={CONNECTOR_W}
      height={TOTAL_H}
      style={{ flexShrink: 0, display: "block" }}
    >
      {Array.from({ length: numPairs }, (_, pairIdx) => {
        const topY = matchCenterY(pairIdx * 2, n);
        const botY = matchCenterY(pairIdx * 2 + 1, n);
        const midY = (topY + botY) / 2;
        const stroke = "rgba(255,255,255,0.18)";

        if (direction === "right") {
          return (
            <g key={pairIdx} stroke={stroke} strokeWidth="1" fill="none">
              <line x1="0" y1={topY} x2={BEND} y2={topY} />
              <line x1={BEND} y1={topY} x2={BEND} y2={botY} />
              <line x1="0" y1={botY} x2={BEND} y2={botY} />
              <line x1={BEND} y1={midY} x2={CONNECTOR_W} y2={midY} />
            </g>
          );
        } else {
          return (
            <g key={pairIdx} stroke={stroke} strokeWidth="1" fill="none">
              <line x1={CONNECTOR_W} y1={topY} x2={CONNECTOR_W - BEND} y2={topY} />
              <line x1={CONNECTOR_W - BEND} y1={topY} x2={CONNECTOR_W - BEND} y2={botY} />
              <line x1={CONNECTOR_W} y1={botY} x2={CONNECTOR_W - BEND} y2={botY} />
              <line x1={CONNECTOR_W - BEND} y1={midY} x2="0" y2={midY} />
            </g>
          );
        }
      })}
    </svg>
  );
}

function MatchCard({
  fixture,
  teamOwner,
  eliminatedTeams,
}: {
  fixture: KnockoutFixture | null;
  teamOwner: Record<string, string>;
  eliminatedTeams: Set<string>;
}) {
  if (!fixture) {
    return (
      <div
        style={{
          height: CARD_H,
          width: CARD_W,
          background: "rgba(255,255,255,0.02)",
          border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>TBD</span>
      </div>
    );
  }

  const isFinished = FINISHED.has(fixture.status);
  const isLive = LIVE.has(fixture.status);
  const hg = fixture.homeGoals ?? -1;
  const ag = fixture.awayGoals ?? -1;
  const homeWon = isFinished && hg > ag;
  const awayWon = isFinished && ag > hg;

  const dateStr = fixture.date
    ? new Date(fixture.date).toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
      })
    : null;

  function TeamRow({
    teamId,
    goals,
    isWinner,
  }: {
    teamId: string | null;
    goals: number | null;
    isWinner: boolean;
  }) {
    const team = teamId ? TEAM_BY_ID[teamId] : null;
    const owner = teamId ? teamOwner[teamId] : null;
    const ownerColor = owner ? PARTICIPANT_COLORS[owner] : undefined;
    const out = teamId ? eliminatedTeams.has(teamId) : false;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 8px",
          background: isWinner ? "rgba(201,168,76,0.07)" : "transparent",
          opacity: out ? 0.35 : 1,
          filter: out ? "grayscale(0.8)" : "none",
        }}
      >
        {ownerColor && !out && (
          <div
            style={{
              width: 2,
              height: 14,
              borderRadius: 2,
              background: ownerColor,
              flexShrink: 0,
            }}
          />
        )}
        {team ? (
          <>
            <Flag code={team.code} size={14} />
            <span
              className="font-condensed"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: out
                  ? "var(--muted)"
                  : isWinner
                  ? "var(--white)"
                  : "rgba(255,255,255,0.65)",
                flex: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {team.name}
            </span>
          </>
        ) : (
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.25)",
              flex: 1,
              fontStyle: "italic",
            }}
          >
            TBD
          </span>
        )}
        {owner && !out && (
          <ParticipantAvatar name={owner} size={12} color={ownerColor} className="" />
        )}
        {(isFinished || isLive) && goals !== null && goals >= 0 && (
          <span
            className="font-display"
            style={{
              fontSize: 13,
              color: isWinner ? "var(--gold)" : "var(--muted)",
              fontWeight: 700,
              minWidth: 12,
              textAlign: "right",
            }}
          >
            {goals}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        height: CARD_H,
        width: CARD_W,
        background: "var(--navy-card)",
        border: `1px solid ${isLive ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 6,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {(dateStr || isLive || isFinished) && (
        <div
          style={{
            padding: "2px 8px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          {isLive && (
            <span style={{ fontSize: 9, color: "#ef4444", fontWeight: 700 }}>
              ● LIVE
            </span>
          )}
          {isFinished && (
            <span style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 0.5 }}>
              FT
            </span>
          )}
          {dateStr && (
            <span style={{ fontSize: 10, color: "var(--muted)" }}>{dateStr}</span>
          )}
        </div>
      )}
      <TeamRow teamId={fixture.homeTeamId} goals={fixture.homeGoals} isWinner={homeWon} />
      <div style={{ height: "0.5px", background: "rgba(255,255,255,0.05)", margin: "0 8px" }} />
      <TeamRow teamId={fixture.awayTeamId} goals={fixture.awayGoals} isWinner={awayWon} />
    </div>
  );
}


const ROUND_LABELS: Record<string, string> = {
  "Round of 32": "Round of 32",
  "Round of 16": "Round of 16",
  "Quarter-finals": "Quarter-final",
  "Semi-finals": "Semi-final",
  "Final": "Final",
  "3rd Place Final": "3rd Place",
};

export default function KnockoutsPage() {
  const [rounds, setRounds] = useState<Record<string, KnockoutFixture[]>>({});
  const [draft, setDraft] = useState<{ participants: Record<string, string[]> }>({
    participants: {},
  });
  const [loading, setLoading] = useState(true);
  const [eliminatedTeams, setEliminatedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/knockout").then((r) => r.json()),
      fetch("/api/draft").then((r) => r.json()),
    ]).then(([ko, d]) => {
      setRounds(ko.rounds || {});
      setDraft(d);
      setLoading(false);
    });

    fetch("/api/eliminated")
      .then((r) => r.json())
      .then((d) => setEliminatedTeams(new Set(d.eliminated || [])))
      .catch(() => {});
  }, []);

  const teamOwner: Record<string, string> = {};
  for (const [name, teams] of Object.entries(draft.participants || {})) {
    for (const teamId of teams as string[]) teamOwner[teamId] = name;
  }

  const r32 = rounds["Round of 32"] || [];
  const r16 = rounds["Round of 16"] || [];
  const qf = rounds["Quarter-finals"] || [];
  const sf = rounds["Semi-finals"] || [];
  const final = (rounds["Final"] || [])[0] ?? null;
  const thirdPlace = (rounds["3rd Place Final"] || [])[0] ?? null;

  // Split each round into left half and right half
  const r32L = r32.slice(0, 8);
  const r32R = r32.slice(8, 16);
  const r16L = r16.slice(0, 4);
  const r16R = r16.slice(4, 8);
  const qfL = qf.slice(0, 2);
  const qfR = qf.slice(2, 4);
  const sfL = sf.slice(0, 1);
  const sfR = sf.slice(1, 2);

  // Pad arrays with nulls for TBD placeholders
  function pad<T>(arr: T[], n: number): (T | null)[] {
    const result: (T | null)[] = [...arr];
    while (result.length < n) result.push(null);
    return result;
  }

  // Round labels positioned above each column
  const roundLabelStyle: React.CSSProperties = {
    fontSize: 10,
    color: "var(--muted)",
    textAlign: "center",
    letterSpacing: 0.8,
    whiteSpace: "nowrap",
    marginBottom: 8,
    height: 16,
    fontWeight: 600,
    textTransform: "uppercase",
    width: CARD_W,
    flexShrink: 0,
  };

  function col(label: string, matches: (KnockoutFixture | null)[], n: number) {
    const padded = pad(matches, n);
    return (
      <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={roundLabelStyle}>{ROUND_LABELS[label] ?? label}</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            height: TOTAL_H,
            width: CARD_W,
          }}
        >
          {padded.map((m, i) => (
            <MatchCard
              key={m ? m.fixtureId : `tbd-${i}`}
              fixture={m}
              teamOwner={teamOwner}
              eliminatedTeams={eliminatedTeams}
            />
          ))}
        </div>
      </div>
    );
  }

  function conn(n: number, dir: "right" | "left") {
    return (
      <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ height: 24 }} /> {/* spacer for label row */}
        <BracketConnector n={n} direction={dir} />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ color: "var(--muted)", textAlign: "center", padding: 80 }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 16px" }}>
      {/* Banner */}
      <div
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 24,
          height: 100,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/wc-ball-vancouver.png"
          alt="World Cup 2026"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 40%",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(10,14,26,0.95) 0%, rgba(10,14,26,0.5) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 28px",
          }}
        >
          <h1
            className="font-display"
            style={{ fontSize: 32, color: "var(--gold)" }}
          >
            KNOCKOUT BRACKET
          </h1>
          <p style={{ color: "rgba(240,244,255,0.6)", fontSize: 12 }}>
            Colours = owner · Greyed = eliminated · Scroll horizontally to see full bracket
          </p>
        </div>
      </div>

      {/* Bracket scroll container */}
      <div style={{ overflowX: "auto", paddingBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 0,
            minWidth: "fit-content",
          }}
        >
          {/* ── LEFT HALF ── */}
          {col("Round of 32", r32L, 8)}
          {conn(8, "right")}
          {col("Round of 16", r16L, 4)}
          {conn(4, "right")}
          {col("Quarter-finals", qfL, 2)}
          {conn(2, "right")}
          {col("Semi-finals", sfL, 1)}

          {/* ── CENTER (Final + 3rd Place) ── */}
          {(() => {
            // Center card is positioned so Final aligns with SF at y=352
            const centerW = CARD_W + 80; // 248px
            const sideMargin = (centerW - CARD_W) / 2; // 40px
            const finalTop = TOTAL_H / 2 - CARD_H / 2; // 318px — centers at y=352 = SF center
            const thirdTop = finalTop + CARD_H + 16;
            const sfY = TOTAL_H / 2; // 352

            return (
              <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <div style={{ height: 24 }} />
                <div style={{ position: "relative", height: TOTAL_H, width: centerW }}>
                  {/* Horizontal connector lines at SF Y level */}
                  <svg
                    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                    width={centerW}
                    height={TOTAL_H}
                  >
                    <line x1="0" y1={sfY} x2={sideMargin} y2={sfY} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                    <line x1={centerW - sideMargin} y1={sfY} x2={centerW} y2={sfY} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                  </svg>

                  {/* Final card centred at y=352 */}
                  <div style={{ position: "absolute", top: finalTop, left: sideMargin, textAlign: "center" }}>
                    <div className="font-display" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: 1.5, marginBottom: 5 }}>FINAL</div>
                    <MatchCard fixture={final} teamOwner={teamOwner} eliminatedTeams={eliminatedTeams} />
                  </div>

                  {/* 3rd Place card below Final */}
                  <div style={{ position: "absolute", top: thirdTop + 16, left: sideMargin, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 1, marginBottom: 5, textTransform: "uppercase" }}>3rd Place</div>
                    <MatchCard fixture={thirdPlace} teamOwner={teamOwner} eliminatedTeams={eliminatedTeams} />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── RIGHT HALF ── */}
          {col("Semi-finals", sfR, 1)}
          {conn(2, "left")}
          {col("Quarter-finals", qfR, 2)}
          {conn(4, "left")}
          {col("Round of 16", r16R, 4)}
          {conn(8, "left")}
          {col("Round of 32", r32R, 8)}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          marginTop: 8,
        }}
      >
        {Object.entries(PARTICIPANT_COLORS).map(([name, color]) => (
          <div
            key={name}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: color,
              }}
            />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
