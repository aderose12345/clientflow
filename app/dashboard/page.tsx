"use client";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";

export default function DashboardPage() {
  const { user } = useUser();
  const [activeNav, setActiveNav] = useState("dashboard");

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0F0F0F", color: "#F0F0F0", fontFamily: "sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: "#161616", borderRight: "1px solid #2A2A2A", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px", borderBottom: "1px solid #2A2A2A" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: "#C8F04A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#0F0F0F", fontWeight: 900, fontSize: 14 }}>C</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>ClientFlow</div>
              <div style={{ color: "#606060", fontSize: 10 }}>Your Workspace</div>
            </div>
          </div>
        </div>
        <nav style={{ padding: "12px 10px", flex: 1 }}>
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "clients", label: "Clients" },
            { id: "programs", label: "Programs" },
            { id: "automations", label: "Automations" },
            { id: "settings", label: "Settings" },
          ].map(n => (
            <button key={n.id} onClick={() => setActiveNav(n.id)} style={{
              width: "100%", display: "flex", alignItems: "center", padding: "9px 12px",
              borderRadius: 8, marginBottom: 2, textAlign: "left", fontSize: 13, fontWeight: 500,
              background: activeNav === n.id ? "rgba(200,240,74,0.08)" : "transparent",
              color: activeNav === n.id ? "#C8F04A" : "#A0A0A0",
              border: "none", cursor: "pointer",
            }}>
              {n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #2A2A2A", fontSize: 12, color: "#606060" }}>
          {user?.emailAddresses[0]?.emailAddress}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
        {activeNav === "dashboard" && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: 4 }}>Good morning 👋</h1>
            <p style={{ color: "#A0A0A0", marginBottom: 24 }}>Here's what needs your attention today.</p>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Total Clients", value: "0", sub: "No clients yet" },
                { label: "On Track", value: "0", sub: "0% of all" },
                { label: "Needs Attention", value: "0", sub: "Review tasks" },
                { label: "Stuck", value: "0", sub: "Immediate action" },
              ].map(s => (
                <div key={s.label} style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20 }}>
                  <div style={{ color: "#606060", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 300 }}>{s.value}</div>
                  <div style={{ color: "#606060", fontSize: 12, marginTop: 4 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Empty state */}
            <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
              <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Ready to onboard your first client?</div>
              <div style={{ color: "#A0A0A0", marginBottom: 24 }}>Start by creating a program, then invite your first client.</div>
              <button onClick={() => setActiveNav("programs")} style={{
                background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14,
              }}>
                Create First Program
              </button>
            </div>
          </div>
        )}

        {activeNav === "clients" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 400 }}>Clients</h1>
              <button style={{ background: "#C8F04A", color: "#0F0F0F", fontWeight: 600, padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer" }}>
                + Invite Client
              </button>
            </div>
            <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>No clients yet</div>
              <div style={{ color: "#A0A0A0" }}>Invite your first client to get started.</div>
            </div>
          </div>
        )}

        {activeNav === "programs" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 400 }}>Programs</h1>
              <button style={{ background: "#C8F04A", color: "#0F0F0F", fontWeight: 600, padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer" }}>
                + New Program
              </button>
            </div>
            <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>No programs yet</div>
              <div style={{ color: "#A0A0A0" }}>Create your first coaching program or onboarding flow.</div>
            </div>
          </div>
        )}

        {activeNav === "automations" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 400, marginBottom: 24 }}>Automations</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Welcome email after invite accepted",
                "Reminder if intake form not submitted after 24h",
                "Reminder if agreement not signed after 24h",
                "Alert when client inactive for 7 days",
                "Congrats email when milestone completed",
                "Weekly check-in reminder",
              ].map((rule, i) => (
                <div key={i} style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13 }}>{rule}</span>
                  <div style={{ width: 42, height: 22, borderRadius: 99, background: "#C8F04A", position: "relative", cursor: "pointer" }}>
                    <div style={{ position: "absolute", top: 3, right: 3, width: 16, height: 16, borderRadius: "50%", background: "#0F0F0F" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeNav === "settings" && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 400, marginBottom: 24 }}>Settings</h1>
            <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24, maxWidth: 500 }}>
              <div style={{ fontWeight: 600, marginBottom: 16 }}>Workspace Settings</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Business Name</label>
                <input placeholder="Your business name" style={{ width: "100%", background: "#1E1E1E", border: "1px solid #2A2A2A", color: "#F0F0F0", borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none" }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Business Type</label>
                <select style={{ width: "100%", background: "#1E1E1E", border: "1px solid #2A2A2A", color: "#F0F0F0", borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none" }}>
                  <option>Coach</option>
                  <option>Consultant</option>
                  <option>Agency</option>
                  <option>Mentorship</option>
                </select>
              </div>
              <button style={{ background: "#C8F04A", color: "#0F0F0F", fontWeight: 600, padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer" }}>
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}