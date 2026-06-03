"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Leaderboard" },
  { href: "/teams", label: "Teams" },
  { href: "/bracket", label: "Bracket" },
  { href: "/stats", label: "Stats" },
  { href: "/draft", label: "Draft Room" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        background: "rgba(10, 14, 26, 0.95)",
        borderBottom: "1px solid rgba(201,168,76,0.2)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", gap: 8, height: 56 }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", marginRight: 24, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚽</span>
          <span className="font-display" style={{ color: "var(--gold)", fontSize: 20, letterSpacing: 2 }}>
            WC26
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {links.map(({ href, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="font-condensed"
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  color: active ? "var(--gold)" : "var(--muted)",
                  background: active ? "rgba(201,168,76,0.1)" : "transparent",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
