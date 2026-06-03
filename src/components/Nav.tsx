"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Leaderboard", short: "Board" },
  { href: "/teams", label: "Teams", short: "Teams" },
  { href: "/bracket", label: "Bracket", short: "Groups" },
  { href: "/stats", label: "Stats", short: "Stats" },
  { href: "/draft", label: "Draft Room", short: "Draft" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      <style>{`
        .nav-label-full { display: inline; }
        .nav-label-short { display: none; }
        @media (max-width: 500px) {
          .nav-label-full { display: none; }
          .nav-label-short { display: inline; }
          .nav-logo-text { display: none; }
          .nav-link { padding: 6px 8px !important; font-size: 13px !important; }
        }
      `}</style>
      <nav style={{
        background: "rgba(10,14,26,0.97)",
        borderBottom: "1px solid rgba(201,168,76,0.2)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 12px", display: "flex", alignItems: "center", gap: 4, height: 52 }}>
          <Link href="/" style={{ textDecoration: "none", marginRight: 12, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 20 }}>⚽</span>
            <span className="font-display nav-logo-text" style={{ color: "var(--gold)", fontSize: 18, letterSpacing: 2 }}>WC26</span>
          </Link>
          <div style={{ display: "flex", gap: 2, flex: 1 }}>
            {links.map(({ href, label, short }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link key={href} href={href} className="font-condensed nav-link" style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                  color: active ? "var(--gold)" : "var(--muted)",
                  background: active ? "rgba(201,168,76,0.1)" : "transparent",
                  whiteSpace: "nowrap",
                }}>
                  <span className="nav-label-full">{label}</span>
                  <span className="nav-label-short">{short}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
