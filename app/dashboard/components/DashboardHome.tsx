"use client";
import { useEffect, useState } from "react";
import { CLIENT_STATUS } from "@/lib/constants";

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  createdAt: string;
  program: { name: string } | null;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DashboardHome({ onNav }: { onNav: (id: string) => void }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then(r => r.json())
      .then(d => setClients(d.clients ?? []))
      .finally(() => setLoading(false));
  }, []);

  const total           = clients.length;
  const onTrack         = clients.filter(c => c.status === "on_track").length;
  const needsAttention  = clients.filter(c => c.status === "needs_attention").length;
  const stuck           = clients.filter(c => c.status === "stuck").length;
  const recent          = [...clients].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const stats = [
    { label: "Total Clients",     value: total,          sub: total === 0 ? "No clients yet" : "Active" },
    { label: "On Track",          value: onTrack,         sub: total > 0 ? `${Math.round((onTrack / total) * 100)}% of all` : "—" },
    { label: "Needs Attention",   value: needsAttention,  sub: needsAttention > 0 ? "Review tasks" : "All clear" },
    { label: "Stuck",             value: stuck,           sub: stuck > 0 ? "Immediate action" : "All clear" },
  ];

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: 4, color: "#F0F0F0" }}>Good morning 👋</h1>
        <p style={{ color: "#A0A0A0", marginBottom: 24 }}>Here's what needs your attention today.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: "#1E1E1E", borderRadius: 12, height: 100, animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: 4, color: "#F0F0F0" }}>Good morning 👋</h1>
      <p style={{ color: "#A0A0A0", marginBottom: 24 }}>Here's what needs your attention today.</p>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20 }}>
            <div style={{ color: "#606060", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 300, color: "#F0F0F0" }}>{s.value}</div>
            <div style={{ color: "#606060", fontSize: 12, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      {total > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Recent clients */}
          <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#F0F0F0" }}>Recent Clients</div>
            {recent.map(c => {
              const st = CLIENT_STATUS[c.status as keyof typeof CLIENT_STATUS] ?? CLIENT_STATUS.on_track;
              return (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1E1E1E" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0" }}>{c.firstName} {c.lastName}</div>
                    <div style={{ fontSize: 11, color: "#606060" }}>{c.program?.name ?? "No program"}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#606060" }}>{timeAgo(c.createdAt)}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Health overview */}
          <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#F0F0F0" }}>Client Health</div>
            {[
              { name: "On Track",       count: onTrack,        color: CLIENT_STATUS.on_track.color },
              { name: "Needs Attention", count: needsAttention, color: CLIENT_STATUS.needs_attention.color },
              { name: "Stuck",          count: stuck,          color: CLIENT_STATUS.stuck.color },
            ].map(row => (
              <div key={row.name} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#A0A0A0" }}>{row.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: row.color }}>{row.count}</span>
                </div>
                <div style={{ height: 4, background: "#1E1E1E", borderRadius: 99 }}>
                  <div style={{
                    height: 4, borderRadius: 99,
                    background: row.color,
                    width: total > 0 ? `${(row.count / total) * 100}%` : "0%",
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state CTA */}
      {total === 0 && (
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
          <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, color: "#F0F0F0" }}>Ready to onboard your first client?</div>
          <div style={{ color: "#A0A0A0", marginBottom: 24 }}>Start by creating a program, then invite your first client.</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => onNav("programs")} style={{
              background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
              padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14,
            }}>
              Create Program
            </button>
            <button onClick={() => onNav("clients")} style={{
              background: "transparent", color: "#A0A0A0",
              padding: "10px 24px", borderRadius: 8, border: "1px solid #2A2A2A", cursor: "pointer", fontSize: 14,
            }}>
              Invite Client
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
