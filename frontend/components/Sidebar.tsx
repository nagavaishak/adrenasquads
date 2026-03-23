"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

// ── Icons (shared between desktop + mobile) ───────────────────────────────────

const ICONS = {
  home: (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <path d="M2 7.5L8 2L14 7.5V14H10.5V10H5.5V14H2V7.5Z"
        stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  squads: (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="5" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.7"/>
      <rect x="6" y="2" width="4" height="4" rx="0.5" fill="currentColor"/>
      <rect x="11" y="5" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.7"/>
      <line x1="5" y1="7" x2="6" y2="5.5" stroke="currentColor" strokeWidth="0.8" opacity="0.5"/>
      <line x1="10" y1="5.5" x2="11" y2="7" stroke="currentColor" strokeWidth="0.8" opacity="0.5"/>
      <rect x="5" y="10" width="6" height="4" rx="0.5" fill="currentColor" opacity="0.5"/>
      <line x1="8" y1="6" x2="8" y2="10" stroke="currentColor" strokeWidth="0.8" opacity="0.4"/>
    </svg>
  ),
  predict: (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <polyline points="1,12 5,7 8,9 12,4 15,5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
      <circle cx="15" cy="5" r="1.2" fill="currentColor"/>
      <line x1="1" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/>
    </svg>
  ),
  profile: (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2 13.5c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  admin: (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <path d="M8 1L2 4v4c0 3.3 2.5 6 6 7 3.5-1 6-3.7 6-7V4L8 1z"
        stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
      <line x1="5.5" y1="8" x2="7" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="7" y1="9.5" x2="10.5" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
};

const NAV = [
  { href: "/",        label: "Home",    icon: ICONS.home    },
  { href: "/squads",  label: "Squads",  icon: ICONS.squads  },
  { href: "/predict", label: "Predict", icon: ICONS.predict },
  { href: "/profile", label: "Profile", icon: ICONS.profile },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(!!localStorage.getItem("admin_key"));
  }, []);

  const allNav = [
    ...NAV,
    ...(isAdmin ? [{ href: "/admin", label: "Monitor", icon: ICONS.admin }] : []),
  ];

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile via .sidebar-desktop) ── */}
      <aside className="sidebar-desktop">
        {/* Logo */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28, height: 28,
                backgroundColor: "var(--accent)",
                borderRadius: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2C8 2 4 5.5 4 9.5C4 11.98 5.79 14 8 14C10.21 14 12 11.98 12 9.5C12 5.5 8 2 8 2Z"
                  fill="white" opacity="0.9"/>
                <path d="M8 7C8 7 6 8.8 6 10.5C6 11.33 6.9 12 8 12C9.1 12 10 11.33 10 10.5C10 8.8 8 7 8 7Z"
                  fill="rgba(0,0,0,0.3)"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", letterSpacing: "0.02em" }}>
                ADRENA
              </div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.12em" }}>
                SQUADS
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {NAV.map(({ href, label, icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 16px",
                  fontSize: 12,
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--text)" : "var(--text-muted)",
                  backgroundColor: active ? "var(--surface-raised)" : "transparent",
                  borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                  textDecoration: "none",
                  transition: "all 0.12s",
                  letterSpacing: "0.02em",
                }}
              >
                <span style={{ color: active ? "var(--accent)" : "inherit" }}>{icon}</span>
                {label}
              </Link>
            );
          })}

          {/* Admin link */}
          {isAdmin && (() => {
            const active = isActive("/admin");
            return (
              <Link
                href="/admin"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 16px",
                  fontSize: 12,
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--text)" : "var(--text-muted)",
                  backgroundColor: active ? "rgba(239,68,68,0.06)" : "transparent",
                  borderLeft: active ? "2px solid #ef4444" : "2px solid transparent",
                  textDecoration: "none",
                  transition: "all 0.12s",
                  letterSpacing: "0.02em",
                  marginTop: 4,
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <span style={{ color: active ? "#ef4444" : "inherit" }}>{ICONS.admin}</span>
                Health Monitor
              </Link>
            );
          })()}
        </nav>

        {/* Season indicator */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--text-muted)" }}>
          <div style={{ marginBottom: 4, letterSpacing: "0.08em" }}>SEASON 1 · ROUND 3/8</div>
          <div style={{ height: 3, backgroundColor: "var(--border)", borderRadius: 1, overflow: "hidden" }}>
            <div style={{ width: "37.5%", height: "100%", backgroundColor: "var(--accent)", borderRadius: 1 }} />
          </div>
          <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
            <span>3 of 8 rounds</span>
            <span style={{ color: "var(--accent)" }}>ACTIVE</span>
          </div>
        </div>

        {/* Devnet indicator */}
        <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--text-muted)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#f59e0b", display: "inline-block" }} />
          DEVNET
        </div>
      </aside>

      {/* ── Mobile bottom tab bar (shown only on mobile via .sidebar-mobile) ── */}
      <nav className="sidebar-mobile">
        {allNav.map(({ href, label, icon }) => {
          const active = isActive(href);
          const isMonitor = href === "/admin";
          const activeColor = isMonitor ? "#ef4444" : "var(--accent)";
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                color: active ? activeColor : "var(--text-muted)",
                textDecoration: "none",
                fontSize: 9,
                letterSpacing: "0.05em",
                minHeight: 44,
                borderTop: active ? `2px solid ${activeColor}` : "2px solid transparent",
                transition: "color 0.12s",
                paddingTop: 2,
              }}
            >
              {icon}
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
