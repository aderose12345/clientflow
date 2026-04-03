"use client";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/lib/useIsMobile";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardClient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  calculatedStatus: string;
  programName: string | null;
  progressPct: number;
  completedSteps: number;
  totalSteps: number;
  lastActivityAt: string | null;
  overdueTasks: number;
};

type DashboardStats = {
  total: number;
  onTrack: number;
  needsAttention: number;
  stuck: number;
  churned: number;
  clients: DashboardClient[];
  recentUpdatesCount: number;
};

type ActivityEvent = {
  id: string;
  eventType: string;
  metadataJson: string | null;
  createdAt: string;
  client: { firstName: string; lastName: string } | null;
};

type ActivityFeed = {
  events: ActivityEvent[];
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; priority: number }> = {
  stuck:            { label: "Stuck",           color: "#FF6B6B", bg: "rgba(255,107,107,0.15)", priority: 0 },
  needs_attention:  { label: "Needs Attention", color: "#F0A94A", bg: "rgba(240,169,74,0.15)",  priority: 1 },
  on_track:         { label: "On Track",        color: "#C8F04A", bg: "rgba(200,240,74,0.15)",  priority: 2 },
  churned:          { label: "Churned",         color: "#808080", bg: "rgba(128,128,128,0.15)", priority: 3 },
};

function getStatusConfig(s: string) {
  return STATUS_CONFIG[s] ?? STATUS_CONFIG.on_track;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  if (hrs < 48)   return "Yesterday";
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatEvent(event: ActivityEvent): string {
  const name = event.client
    ? `${event.client.firstName} ${event.client.lastName}`
    : "A client";

  switch (event.eventType) {
    case "client_invited":              return `${name} was invited`;
    case "step_completed_intake_form":  return `${name} completed intake form`;
    case "step_completed_agreement":    return `${name} signed agreement`;
    case "step_completed_task":         return `${name} completed a task`;
    case "step_completed_checkin":      return `${name} submitted progress update`;
    case "step_completed_document":     return `${name} uploaded a document`;
    case "step_completed_resource":     return `${name} viewed a resource`;
    default:                            return `${name} had activity`;
  }
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard({ height }: { height: number }) {
  return (
    <div style={{
      background: "#1E1E1E",
      borderRadius: 12,
      height,
      animation: "pulse 1.5s infinite",
    }} />
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: "#2A2A2A", borderRadius: 99, marginTop: 4 }}>
      <div style={{
        height: 4,
        borderRadius: 99,
        background: color,
        width: `${Math.min(100, Math.max(0, pct))}%`,
        transition: "width 0.6s ease",
      }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardHome({ onNav }: { onNav: (id: string) => void }) {
  const isMobile = useIsMobile();

  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then(r => r.json()).catch(() => null),
      fetch("/api/activity").then(r => r.json()).catch(() => ({ events: [] })),
    ]).then(([statsData, activityData]: [DashboardStats | null, ActivityFeed]) => {
      setStats(statsData);
      setActivity((activityData?.events ?? []).slice(0, 10));
    }).finally(() => setLoading(false));
  }, []);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 400, marginBottom: 4, color: "#F0F0F0" }}>
          Good morning 👋
        </h1>
        <p style={{ color: "#A0A0A0", marginBottom: 24, fontSize: isMobile ? 13 : 14 }}>
          Here&apos;s what needs your attention today.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16, marginBottom: 24 }}>
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} height={isMobile ? 80 : 100} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 16 }}>
          <SkeletonCard height={240} />
          <SkeletonCard height={240} />
        </div>
      </div>
    );
  }

  const total             = stats?.total ?? 0;
  const onTrack           = stats?.onTrack ?? 0;
  const needsAttention    = stats?.needsAttention ?? 0;
  const stuck             = stats?.stuck ?? 0;
  const recentUpdates     = stats?.recentUpdatesCount ?? 0;

  // Clients sorted by risk: stuck first, then needs_attention, rest by lastActivityAt
  const atRiskClients = [...(stats?.clients ?? [])]
    .sort((a, b) => {
      const pa = getStatusConfig(a.calculatedStatus).priority;
      const pb = getStatusConfig(b.calculatedStatus).priority;
      if (pa !== pb) return pa - pb;
      const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return ta - tb; // less recent = higher risk
    })
    .filter(c => c.calculatedStatus === "stuck" || c.calculatedStatus === "needs_attention")
    .slice(0, 6);

  const statCards = [
    {
      label: "Total Clients",
      value: total,
      sub: total === 0 ? "No clients yet" : "Active",
      accentColor: "#F0F0F0",
    },
    {
      label: "On Track",
      value: onTrack,
      sub: total > 0 ? `${Math.round((onTrack / total) * 100)}% of all` : "—",
      accentColor: "#C8F04A",
    },
    {
      label: "Needs Attention",
      value: needsAttention,
      sub: needsAttention > 0 ? "Review tasks" : "All clear",
      accentColor: "#F0A94A",
    },
    {
      label: "Stuck",
      value: stuck,
      sub: stuck > 0 ? "Immediate action" : "All clear",
      accentColor: "#FF6B6B",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", gap: 8, marginBottom: isMobile ? 16 : 24 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 400, marginBottom: 4, color: "#F0F0F0" }}>
            Good morning 👋
          </h1>
          <p style={{ color: "#A0A0A0", fontSize: isMobile ? 13 : 14 }}>
            Here&apos;s what needs your attention today.
          </p>
        </div>
        {recentUpdates > 0 && (
          <button
            onClick={() => onNav("clients")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(200,240,74,0.1)",
              border: "1px solid rgba(200,240,74,0.3)",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 12,
              color: "#C8F04A",
              flexShrink: 0,
            }}
          >
            <span style={{
              background: "#C8F04A",
              color: "#0F0F0F",
              borderRadius: 99,
              fontWeight: 700,
              fontSize: 11,
              padding: "1px 6px",
            }}>
              {recentUpdates}
            </span>
            unreviewed update{recentUpdates !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 16 : 24 }}>
        {statCards.map(s => (
          <div
            key={s.label}
            style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: isMobile ? 14 : 20 }}
          >
            <div style={{ color: "#606060", fontSize: isMobile ? 10 : 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: isMobile ? 6 : 8 }}>
              {s.label}
            </div>
            <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 300, color: s.accentColor }}>
              {s.value}
            </div>
            <div style={{ color: "#606060", fontSize: isMobile ? 11 : 12, marginTop: 4 }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: isMobile ? 32 : 48, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
          <div style={{ fontWeight: 600, fontSize: isMobile ? 16 : 18, marginBottom: 8, color: "#F0F0F0" }}>
            Ready to set up your first onboarding flow?
          </div>
          <div style={{ color: "#A0A0A0", marginBottom: 24, fontSize: isMobile ? 13 : 14 }}>
            Start by creating a program, then invite your first client.
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexDirection: isMobile ? "column" : "row" }}>
            <button
              onClick={() => onNav("programs")}
              style={{
                background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14,
                width: isMobile ? "100%" : "auto",
              }}
            >
              Create Program
            </button>
            <button
              onClick={() => onNav("clients")}
              style={{
                background: "transparent", color: "#A0A0A0",
                padding: "10px 24px", borderRadius: 8, border: "1px solid #2A2A2A", cursor: "pointer", fontSize: 14,
                width: isMobile ? "100%" : "auto",
              }}
            >
              Invite Client
            </button>
          </div>
        </div>
      )}

      {/* Main content — At Risk + Activity */}
      {total > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 16 }}>

          {/* At Risk Clients */}
          <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: isMobile ? 16 : 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#F0F0F0" }}>At Risk Clients</div>
              {atRiskClients.length > 0 && (
                <button
                  onClick={() => onNav("clients")}
                  style={{ background: "none", border: "none", color: "#606060", fontSize: 11, cursor: "pointer", padding: 0 }}
                >
                  View all →
                </button>
              )}
            </div>

            {atRiskClients.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                <div style={{ color: "#606060", fontSize: 13 }}>No clients need attention</div>
              </div>
            ) : (
              atRiskClients.map((c, idx) => {
                const st = getStatusConfig(c.calculatedStatus);
                return (
                  <div
                    key={c.id}
                    onClick={() => onNav("clients")}
                    style={{
                      padding: "10px 0",
                      borderBottom: idx < atRiskClients.length - 1 ? "1px solid #1E1E1E" : "none",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", marginBottom: 1 }}>
                          {c.firstName} {c.lastName}
                        </div>
                        <div style={{ fontSize: 11, color: "#606060", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.programName ?? "No program"}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                          background: st.bg, color: st.color,
                        }}>
                          {st.label}
                        </span>
                        {!isMobile && c.lastActivityAt && (
                          <span style={{ fontSize: 10, color: "#606060" }}>
                            {timeAgo(c.lastActivityAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#606060" }}>
                          {c.completedSteps}/{c.totalSteps} steps
                        </span>
                        <span style={{ fontSize: 10, color: "#606060" }}>
                          {Math.round(c.progressPct)}%
                        </span>
                      </div>
                      <ProgressBar pct={c.progressPct} color={st.color} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Recent Activity */}
          <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: isMobile ? 16 : 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#F0F0F0" }}>Recent Activity</div>

            {activity.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
                <div style={{ color: "#606060", fontSize: 13 }}>No activity yet</div>
              </div>
            ) : (
              activity.map((event, idx) => (
                <div
                  key={event.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: idx < activity.length - 1 ? "1px solid #1E1E1E" : "none",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 12, color: "#C0C0C0", minWidth: 0, flex: 1 }}>
                    {formatEvent(event)}
                  </div>
                  <div style={{ fontSize: 10, color: "#606060", flexShrink: 0 }}>
                    {timeAgo(event.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}
