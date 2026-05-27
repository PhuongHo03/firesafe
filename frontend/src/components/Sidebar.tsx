"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Flame, LayoutDashboard, Camera, LogOut, ListChecks, Users } from "lucide-react";
import { clearAuth, getUser, isAdmin } from "@/lib/auth";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ username: string; email: string; roles: string[] } | null>(null);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setAdmin(isAdmin());
  }, []);

  function logout() {
    clearAuth();
    router.push("/login");
  }

  const label = user?.roles.includes("ROLE_ADMIN") ? "Admin" : user ? "Viewer" : "";

  const links = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    ...(admin ? [{ href: "/admin/users", icon: Users, label: "Users" }] : []),
    { href: "/alerts", icon: ListChecks, label: "Alerts" },
    { href: "/cameras", icon: Camera, label: "Cameras" },
  ];

  return (
    <aside style={{
      width: "220px",
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      padding: "1.25rem 0",
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ padding: "0 1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <Flame size={22} color="var(--accent)" />
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>FireSafe</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0 0.75rem" }}>
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.6rem 0.75rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
              color: active ? "#fff" : "var(--text-muted)",
              background: active ? "var(--accent-dim)" : "transparent",
              fontWeight: active ? 600 : 400,
              fontSize: "0.9rem",
              transition: "background 0.15s, color 0.15s",
            }}>
              <Icon size={17} color={active ? "var(--accent)" : undefined} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: "0 1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
          <div style={{ color: "var(--text)", fontWeight: 600 }}>{user?.username}</div>
          <div>{label}</div>
        </div>
        <button id="logout-btn" onClick={logout} style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "0.5rem",
          padding: "0.5rem 0.75rem",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}>
          <LogOut size={15} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
