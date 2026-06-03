"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Flag from "@/components/Flag";
import { TEAM_BY_ID } from "../../../../data/teams";

const PARTICIPANTS = ["Gordo", "Shun", "Dr. Rick", "Sexy Tecsy", "Lazy Bones"];

const COLORS: Record<string, string> = {
  Jordan: "#3b82f6",
  Sean: "#10b981",
  Jamie: "#f59e0b",
  Matt: "#ec4899",
  Rob: "#8b5cf6",
};

interface TeamPoints {
  teamId: string;
  total: number;
  breakdown: {
    groupWins: number;
    groupDraws: number;
    cleanSheets: number;
    goalsScored: number;
    advancedRound32: number;
    advancedRound16: number;
    advancedQF: number;
    advancedSF: number;
    bronze: number;
    runnerUp: number;
    champion: number;
    redCardPenalty: number;
    yellowCardPenalty: number;
  };
}

export default function ParticipantPage() {
  const params = useParams();
  const rawName = params.name as string;
  const name = PARTICIPANTS.find((p) => p.toLowerCase() === rawName) || rawName;

  const [teamPoints, setTeamPoints] = useState<TeamPoints[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [draftCompleted, setDraftCompleted] = useState(false);

  useEffect(() => {
    fetch("/api/points").then((r) => r.json()).then((d) => {
      setDraftCompleted(d.draftCompleted || false);
      const standing = (d.standings || []).find((s: { name: string }) => s.name === name);
      if (standing) {
        setTeamPoints(standing.teamPoints || []);
        setTotalPoints(standing.totalPoints || 0);
      }
      setLoading(false);
    });
  }, [name]);

  const color = COLORS[name] || "#c9a84c";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <div style={{ width: 8, height: 60, borderRadius: 4, background: color }} />
        <div>
          <h1 className="font-display" style={{ fontSize: 48, color: "var(--white)", lineHeight: 1 }}>{name}</h1>
          <div style={{ color: "var(--muted)", fontSize: 14 }}>{teamPoints.length} teams</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div className="font-display" style={{ fontSize: 52, color }}>
            {totalPoints}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 14 }}>total points</div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>Loading...</div>
      ) : !draftCompleted ? (
        <div style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>Draft not completed yet.</div>
      ) : teamPoints.length === 0 ? (
        <div style={{ color: "var(--muted)", textAlign: "center", padding: 40 }}>No teams assigned.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {teamPoints.map(({ teamId, total, breakdown }) => {
            const team = TEAM_BY_ID[teamId];
            if (!team) return null;
            return (
              <div key={teamId} className="card" style={{ padding: "20px", borderLeft: `3px solid ${color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Flag code={team.code} size={32} />
                    <div>
                      <div className="font-condensed" style={{ fontWeight: 700, fontSize: 17, color: "var(--white)" }}>{team.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Group {team.group}</div>
                    </div>
                  </div>
                  <div className="font-display" style={{ fontSize: 28, color }}>
                    {total >= 0 ? `+${total}` : total}
                  </div>
                </div>

                {/* Breakdown */}
                <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 3 }}>
                  {breakdown.groupWins > 0 && <StatRow label={`${breakdown.groupWins} group win${breakdown.groupWins > 1 ? "s" : ""}`} val={breakdown.groupWins * 3} />}
                  {breakdown.groupDraws > 0 && <StatRow label={`${breakdown.groupDraws} group draw${breakdown.groupDraws > 1 ? "s" : ""}`} val={breakdown.groupDraws} />}
                  {breakdown.cleanSheets > 0 && <StatRow label={`${breakdown.cleanSheets} clean sheet${breakdown.cleanSheets > 1 ? "s" : ""}`} val={breakdown.cleanSheets * 2} />}
                  {breakdown.goalsScored > 0 && <StatRow label={`${breakdown.goalsScored} goals`} val={breakdown.goalsScored} />}
                  {breakdown.advancedRound32 > 0 && <StatRow label="Reached Round of 32" val={2} />}
                  {breakdown.advancedRound16 > 0 && <StatRow label="Reached Round of 16" val={4} />}
                  {breakdown.advancedQF > 0 && <StatRow label="Reached Quarter-Final" val={6} />}
                  {breakdown.advancedSF > 0 && <StatRow label="Reached Semi-Final" val={8} />}
                  {breakdown.bronze > 0 && <StatRow label="Bronze Medal 🥉" val={10} />}
                  {breakdown.runnerUp > 0 && <StatRow label="Runner-up 🥈" val={14} />}
                  {breakdown.champion > 0 && <StatRow label="World Champion 🏆" val={20} />}
                  {breakdown.redCardPenalty > 0 && <StatRow label={`${breakdown.redCardPenalty} red card${breakdown.redCardPenalty > 1 ? "s" : ""}`} val={breakdown.redCardPenalty * -2} negative />}
                  {breakdown.yellowCardPenalty > 0 && <StatRow label={`${breakdown.yellowCardPenalty * 2} yellow cards`} val={-breakdown.yellowCardPenalty} negative />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, val, negative = false }: { label: string; val: number; negative?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ color: negative ? "#ef4444" : "var(--gold-light, #e8c96a)", fontWeight: 600 }}>
        {val > 0 ? `+${val}` : val}
      </span>
    </div>
  );
}
