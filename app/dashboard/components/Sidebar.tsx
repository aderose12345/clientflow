"use client";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",   icon: "⌂" },
  { id: "clients",     label: "Clients",      icon: "👥" },
  { id: "programs",    label: "Programs",     icon: "📋" },
  { id: "automations", label: "Automations",  icon: "⚡" },
  { id: "settings",    label: "Settings",     icon: "⚙" },
];

type Props = {
  activeNav: string;
  onNav: (id: string) => void;
  userEmail?: string;
  subscriptionStatus?: string;
};

export default function Sidebar({ activeNav, onNav, userEmail, subscriptionStatus }: Props) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [isAdminView, setIsAdminView] = useState(false);
  const isAdmin = userEmail === "a.derose12345@gmail.com";

  useEffect(() => {
    setIsAdminView(document.cookie.includes("adminViewingWorkspace="));
  }, []);

  function exitAdminView() {
    document.cookie = "adminViewingWorkspace=;path=/;max-age=0";
    window.location.reload();
  }

  return (
    <div style={{
      width: 220, background: "#161616", borderRight: "1px solid #2A2A2A",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px", borderBottom: "1px solid #2A2A2A" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: "#C8F04A",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#0F0F0F", fontWeight: 900, fontSize: 16 }}>C</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#F0F0F0" }}>ClientFlow</div>
            <div style={{ color: "#606060", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {subscriptionStatus ?? "Trial"}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "10px 8px", flex: 1 }}>
        {NAV_ITEMS.map(n => (
          <button key={n.id} onClick={() => onNav(n.id)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 8, marginBottom: 2,
            textAlign: "left", fontSize: 13, fontWeight: 500,
            background: activeNav === n.id ? "rgba(200,240,74,0.08)" : "transparent",
            color: activeNav === n.id ? "#C8F04A" : "#A0A0A0",
            border: "none", cursor: "pointer", transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "12px 8px", borderTop: "1px solid #2A2A2A" }}>
        {isAdminView && (
          <button onClick={exitAdminView} style={{
            width: "100%", padding: "8px 12px", borderRadius: 8, marginBottom: 6,
            background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)",
            color: "#FF6B6B", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left",
          }}>
            Exit Admin View
          </button>
        )}
        {isAdmin && !isAdminView && (
          <button onClick={() => router.push("/admin")} style={{
            width: "100%", padding: "8px 12px", borderRadius: 8, marginBottom: 6,
            background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.15)",
            color: "#FF6B6B", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left",
          }}>
            Super Admin
          </button>
        )}
        <button
          onClick={() => router.push("/billing")}
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 8, marginBottom: 6,
            background: "rgba(200,240,74,0.06)", border: "1px solid rgba(200,240,74,0.2)",
            color: "#C8F04A", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left",
          }}
        >
          ✦ Upgrade Plan
        </button>
        <div style={{ padding: "4px 12px", fontSize: 11, color: "#606060", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {userEmail}
        </div>
        <button
          onClick={() => signOut(() => router.push("/sign-in"))}
          style={{
            width: "100%", padding: "7px 12px", borderRadius: 8,
            background: "transparent", border: "none",
            color: "#606060", fontSize: 12, cursor: "pointer", textAlign: "left",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
