"use client";
import { useClerk } from "@clerk/nextjs";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { STEP_TYPES } from "@/lib/constants";

type Step       = { id: string; type: string; title: string; description: string | null; position: number };
type Milestone  = { id: string; title: string; description: string | null; position: number };
type Template   = { id: string; name: string; frequency: string; questions: string };
type Task       = { id: string; title: string; description: string | null; status: string; dueDate: string | null; completedAt: string | null };
type Workspace  = { businessName: string; brandColor: string; logoUrl: string | null };
type Program    = { id: string; name: string; description: string | null; duration: string | null; steps: Step[]; milestones: Milestone[]; checkInTemplates: Template[] };
type Client     = {
  id: string; firstName: string; lastName: string; email: string; status: string;
  workspace: Workspace; program: Program | null;
  tasks: Task[];
  milestoneCompletions: { milestoneId: string }[];
  checkInSubmissions: { templateId: string; submittedAt: string }[];
};

const STEP_ICON: Record<string, string> = {
  intake_form: "📝", agreement: "✍️", task: "✅", milestone: "🏆", checkin: "📊", resource: "📁",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function PortalPage() {
  const { signOut } = useClerk();
  const router = useRouter();
  const [client, setClient]         = useState<Client | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [activeTab, setActiveTab]   = useState<"overview" | "tasks" | "checkin">("overview");
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Check-in state
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [answers, setAnswers]               = useState<Record<number, string>>({});
  const [submitting, setSubmitting]         = useState(false);
  const [submitted, setSubmitted]           = useState(false);

  const fetchClient = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/portal/me");
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    const d = await res.json();
    setClient(d.client);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  // Auto-select the first check-in template when program loads
  useEffect(() => {
    if (client?.program?.checkInTemplates?.length && !activeTemplate) {
      setActiveTemplate(client.program.checkInTemplates[0]);
    }
  }, [client, activeTemplate]);

  async function completeTask(taskId: string) {
    setCompletingId(taskId);
    await fetch(`/api/portal/tasks/${taskId}/complete`, { method: "POST" });
    setCompletingId(null);
    fetchClient();
  }

  async function submitCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTemplate) return;
    setSubmitting(true);
    await fetch("/api/portal/checkins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: activeTemplate.id, answers }),
    });
    setSubmitting(false);
    setSubmitted(true);
    setAnswers({});
    fetchClient();
  }

  const accent = client?.workspace?.brandColor ?? "#C8F04A";

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F0F0F" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: "#C8F04A",
            margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontWeight: 900, color: "#0F0F0F", fontSize: 22 }}>C</span>
          </div>
          <div style={{ color: "#A0A0A0", fontSize: 14, marginBottom: 8 }}>Loading your portal...</div>
          <div style={{ width: 120, height: 3, background: "#1E1E1E", borderRadius: 99, margin: "0 auto", overflow: "hidden" }}>
            <div style={{
              width: "40%", height: "100%", background: "#C8F04A", borderRadius: 99,
              animation: "shimmer 1.2s ease-in-out infinite alternate",
            }} />
          </div>
          <style>{`@keyframes shimmer { from { transform: translateX(0); } to { transform: translateX(150%); } }`}</style>
        </div>
      </div>
    );
  }

  // ─── Not found ────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F0F0F" }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: "0 24px" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: "#161616", border: "1px solid #2A2A2A",
            margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 28 }}>🔍</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: "#F0F0F0" }}>No portal found</h2>
          <p style={{ color: "#A0A0A0", marginBottom: 28, lineHeight: 1.6, fontSize: 14 }}>
            Your account doesn&apos;t have a client record yet. Make sure you&apos;re signing in with the same email your invitation was sent to.
          </p>
          <button onClick={() => signOut(() => router.push("/sign-in"))} style={{
            background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
            padding: "11px 28px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14,
          }}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!client) return null;

  const program  = client.program;
  const tasks    = client.tasks;
  const pending  = tasks.filter(t => t.status !== "complete");
  const done     = tasks.filter(t => t.status === "complete");
  const completedMilestoneIds = new Set(client.milestoneCompletions.map(mc => mc.milestoneId));
  const totalMilestones = program?.milestones?.length ?? 0;
  const completedMilestones = program?.milestones?.filter(m => completedMilestoneIds.has(m.id)).length ?? 0;
  const recentSubmission = activeTemplate
    ? client.checkInSubmissions.find(s => s.templateId === activeTemplate.id)
    : null;

  const TABS = [
    { id: "overview" as const, label: "Program" },
    { id: "tasks" as const,    label: `Tasks${pending.length > 0 ? ` (${pending.length})` : ""}` },
    { id: "checkin" as const,  label: "Check-In" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F0F" }}>
      {/* ── Header ── */}
      <header style={{
        background: "#161616", borderBottom: "1px solid #2A2A2A",
        padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 0 1px rgba(0,0,0,0.1)`,
          }}>
            <span style={{ fontWeight: 900, color: "#0F0F0F", fontSize: 18 }}>
              {client.workspace.businessName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#F0F0F0", letterSpacing: "-0.01em" }}>{client.workspace.businessName}</div>
            <div style={{ fontSize: 11, color: "#505050", letterSpacing: "0.06em", textTransform: "uppercase" }}>Client Portal</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0" }}>{client.firstName} {client.lastName}</div>
            <div style={{ fontSize: 11, color: "#505050" }}>{client.email}</div>
          </div>
          <button onClick={() => signOut(() => router.push("/sign-in"))} style={{
            background: "transparent", border: "1px solid #2A2A2A", color: "#606060",
            padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#3A3A3A"; e.currentTarget.style.color = "#A0A0A0"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#606060"; }}
          >Sign out</button>
        </div>
      </header>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* ── Welcome + Summary ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 8, color: "#F0F0F0", letterSpacing: "-0.02em" }}>
            {greeting()}, <span style={{ fontWeight: 600 }}>{client.firstName}</span>
          </h1>
          {program ? (
            <p style={{ color: "#A0A0A0", margin: 0, fontSize: 15, lineHeight: 1.5 }}>
              You&apos;re enrolled in <strong style={{ color: "#F0F0F0" }}>{program.name}</strong>
              {program.duration ? <span style={{ color: "#505050" }}> &middot; {program.duration}</span> : ""}
            </p>
          ) : (
            <p style={{ color: "#606060", margin: 0, fontSize: 15 }}>Your coach will assign you to a program soon.</p>
          )}
        </div>

        {/* ── Stats cards ── */}
        {(tasks.length > 0 || totalMilestones > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: totalMilestones > 0 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 14, marginBottom: 32 }}>
            <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 14, padding: "18px 22px" }}>
              <div style={{ color: "#505050", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>Tasks Done</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 30, fontWeight: 300, color: "#F0F0F0", letterSpacing: "-0.02em" }}>{done.length}</span>
                <span style={{ fontSize: 14, color: "#505050" }}>/ {tasks.length}</span>
              </div>
              <div style={{ height: 3, background: "#1E1E1E", borderRadius: 99, marginTop: 12 }}>
                <div style={{ height: 3, borderRadius: 99, background: accent, width: `${tasks.length > 0 ? (done.length / tasks.length) * 100 : 0}%`, transition: "width 0.6s ease" }} />
              </div>
            </div>
            {totalMilestones > 0 && (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 14, padding: "18px 22px" }}>
                <div style={{ color: "#505050", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>Milestones</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 30, fontWeight: 300, color: "#F0F0F0", letterSpacing: "-0.02em" }}>{completedMilestones}</span>
                  <span style={{ fontSize: 14, color: "#505050" }}>/ {totalMilestones}</span>
                </div>
                <div style={{ height: 3, background: "#1E1E1E", borderRadius: 99, marginTop: 12 }}>
                  <div style={{ height: 3, borderRadius: 99, background: "#F0A94A", width: `${totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0}%`, transition: "width 0.6s ease" }} />
                </div>
              </div>
            )}
            <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 14, padding: "18px 22px" }}>
              <div style={{ color: "#505050", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, fontWeight: 600 }}>Check-Ins</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 30, fontWeight: 300, color: "#F0F0F0", letterSpacing: "-0.02em" }}>{client.checkInSubmissions.length}</span>
                <span style={{ fontSize: 14, color: "#505050" }}>submitted</span>
              </div>
              <div style={{ fontSize: 11, color: "#505050", marginTop: 12 }}>
                {recentSubmission
                  ? `Last: ${new Date(recentSubmission.submittedAt).toLocaleDateString()}`
                  : "No submissions yet"}
              </div>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{
          display: "flex", gap: 0, marginBottom: 32, borderBottom: "1px solid #2A2A2A",
        }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSubmitted(false); }} style={{
              padding: "13px 22px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500,
              background: "transparent", letterSpacing: "-0.01em",
              color: activeTab === tab.id ? accent : "#505050",
              borderBottom: activeTab === tab.id ? `2px solid ${accent}` : "2px solid transparent",
              marginBottom: -1,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = "#808080"; }}
            onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = "#505050"; }}
            >{tab.label}</button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div>
            {!program ? (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 56, textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, background: "#1A1A1A", border: "1px solid #2A2A2A",
                  margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 26 }}>📋</span>
                </div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16, color: "#F0F0F0" }}>No program assigned yet</div>
                <div style={{ color: "#A0A0A0", fontSize: 14 }}>Your coach will assign you to a program soon. Sit tight!</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Description */}
                {program.description && (
                  <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: "20px 24px" }}>
                    <div style={{ fontSize: 12, color: "#606060", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>About This Program</div>
                    <p style={{ color: "#A0A0A0", margin: 0, fontSize: 14, lineHeight: 1.7 }}>{program.description}</p>
                  </div>
                )}

                {/* Steps roadmap */}
                {program.steps.length > 0 && (
                  <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 20, color: "#F0F0F0" }}>
                      Program Roadmap
                      <span style={{ color: "#606060", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({program.steps.length} steps)</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {program.steps.map((step, i) => (
                        <div key={step.id} style={{
                          display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                          borderRadius: 10, background: i % 2 === 0 ? "#1A1A1A" : "transparent",
                          transition: "background 0.1s",
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, background: "rgba(200,240,74,0.06)",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            border: "1px solid rgba(200,240,74,0.1)",
                          }}>
                            <span style={{ fontSize: 13 }}>{STEP_ICON[step.type] ?? "📌"}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: "#F0F0F0" }}>{step.title}</div>
                            {step.description && <div style={{ fontSize: 12, color: "#606060", marginTop: 2 }}>{step.description}</div>}
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                            background: "rgba(200,240,74,0.06)", color: accent,
                            textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
                          }}>
                            {STEP_TYPES.find(t => t.value === step.type)?.label ?? step.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Milestones */}
                {program.milestones.length > 0 && (
                  <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, color: "#F0F0F0" }}>
                      Milestones
                      <span style={{ color: "#606060", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                        ({completedMilestones}/{totalMilestones})
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {program.milestones.map(m => {
                        const isComplete = completedMilestoneIds.has(m.id);
                        return (
                          <div key={m.id} style={{
                            display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                            borderRadius: 10, background: "#1A1A1A",
                            transition: "opacity 0.2s",
                          }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: "50%",
                              background: isComplete ? accent : "transparent",
                              border: `2px solid ${isComplete ? accent : "#3A3A3A"}`,
                              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                              transition: "all 0.2s",
                            }}>
                              {isComplete && <span style={{ color: "#0F0F0F", fontSize: 12, fontWeight: 900 }}>✓</span>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: 14, fontWeight: 500,
                                color: isComplete ? "#606060" : "#F0F0F0",
                                textDecoration: isComplete ? "line-through" : "none",
                              }}>
                                {m.title}
                              </div>
                              {m.description && <div style={{ fontSize: 12, color: "#606060", marginTop: 2 }}>{m.description}</div>}
                            </div>
                            {isComplete && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: accent, padding: "2px 8px", borderRadius: 99, background: "rgba(200,240,74,0.08)" }}>
                                Done
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tasks ── */}
        {activeTab === "tasks" && (
          <div>
            {tasks.length === 0 ? (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 56, textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, background: "#1A1A1A", border: "1px solid #2A2A2A",
                  margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 26 }}>✅</span>
                </div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16, color: "#F0F0F0" }}>No tasks assigned yet</div>
                <div style={{ color: "#A0A0A0", fontSize: 14 }}>Your coach will assign tasks to you as you progress.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {pending.length > 0 && (
                  <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, color: "#F0F0F0" }}>
                      To Do
                      <span style={{ color: "#606060", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({pending.length})</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pending.map(t => {
                        const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
                        return (
                          <div key={t.id} style={{
                            display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                            borderRadius: 10, background: "#1A1A1A",
                            border: isOverdue ? "1px solid rgba(255,107,107,0.2)" : "1px solid transparent",
                          }}>
                            <button
                              onClick={() => completeTask(t.id)}
                              disabled={completingId === t.id}
                              style={{
                                width: 24, height: 24, borderRadius: 7, border: "2px solid #3A3A3A",
                                background: "transparent", cursor: "pointer", flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                opacity: completingId === t.id ? 0.5 : 1, transition: "all 0.15s",
                              }}
                            >
                              {completingId === t.id && <span style={{ color: "#606060", fontSize: 10 }}>…</span>}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: "#F0F0F0" }}>{t.title}</div>
                              {t.description && <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 3 }}>{t.description}</div>}
                              {t.dueDate && (
                                <div style={{ fontSize: 11, marginTop: 4, color: isOverdue ? "#FF6B6B" : "#606060" }}>
                                  {isOverdue ? "Overdue — " : "Due "}
                                  {new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => completeTask(t.id)}
                              disabled={completingId === t.id}
                              style={{
                                background: accent, color: "#0F0F0F", fontWeight: 600,
                                padding: "7px 18px", borderRadius: 8, border: "none",
                                cursor: completingId === t.id ? "not-allowed" : "pointer",
                                fontSize: 12, opacity: completingId === t.id ? 0.7 : 1,
                                transition: "all 0.15s", flexShrink: 0,
                                letterSpacing: "0.01em",
                              }}
                              onMouseEnter={e => { if (completingId !== t.id) e.currentTarget.style.opacity = "0.85"; }}
                              onMouseLeave={e => { if (completingId !== t.id) e.currentTarget.style.opacity = "1"; }}
                            >
                              Complete
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {done.length > 0 && (
                  <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, color: "#606060" }}>
                      Completed
                      <span style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({done.length})</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {done.map(t => (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", borderRadius: 10, opacity: 0.5 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 7, background: accent,
                            border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          }}>
                            <span style={{ color: "#0F0F0F", fontSize: 12, fontWeight: 900 }}>✓</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, textDecoration: "line-through", color: "#606060" }}>{t.title}</div>
                          </div>
                          {t.completedAt && (
                            <span style={{ fontSize: 11, color: "#3A3A3A" }}>
                              {new Date(t.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Check-In ── */}
        {activeTab === "checkin" && (
          <div>
            {!program || program.checkInTemplates.length === 0 ? (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 56, textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, background: "#1A1A1A", border: "1px solid #2A2A2A",
                  margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 26 }}>📊</span>
                </div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16, color: "#F0F0F0" }}>No check-ins configured</div>
                <div style={{ color: "#A0A0A0", fontSize: 14 }}>Your coach will set up check-in forms for your program.</div>
              </div>
            ) : (
              <div>
                {/* Template selector (if more than one) */}
                {program.checkInTemplates.length > 1 && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {program.checkInTemplates.map(t => (
                      <button key={t.id} onClick={() => { setActiveTemplate(t); setSubmitted(false); setAnswers({}); }} style={{
                        padding: "8px 18px", borderRadius: 8, border: "1px solid",
                        borderColor: activeTemplate?.id === t.id ? accent : "#2A2A2A",
                        background: activeTemplate?.id === t.id ? "rgba(200,240,74,0.08)" : "transparent",
                        color: activeTemplate?.id === t.id ? accent : "#A0A0A0",
                        cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.15s",
                      }}>{t.name}</button>
                    ))}
                  </div>
                )}

                {activeTemplate && (
                  <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 28 }}>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 4, color: "#F0F0F0" }}>{activeTemplate.name}</div>
                      <div style={{ fontSize: 13, color: "#606060" }}>
                        {activeTemplate.frequency.charAt(0).toUpperCase() + activeTemplate.frequency.slice(1)} check-in
                        {recentSubmission && (
                          <span> · Last submitted {new Date(recentSubmission.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        )}
                      </div>
                    </div>

                    {submitted ? (
                      <div style={{ textAlign: "center", padding: "40px 0" }}>
                        <div style={{
                          width: 64, height: 64, borderRadius: 16, background: "rgba(200,240,74,0.1)",
                          margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ fontSize: 32 }}>🎉</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, color: "#F0F0F0" }}>Check-in submitted!</div>
                        <div style={{ color: "#A0A0A0", marginBottom: 24, fontSize: 14 }}>Your coach has been notified. Great work!</div>
                        <button onClick={() => { setSubmitted(false); setAnswers({}); }} style={{
                          background: accent, color: "#0F0F0F", fontWeight: 600,
                          padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14,
                        }}>Submit Another</button>
                      </div>
                    ) : (
                      <form onSubmit={submitCheckin}>
                        {(() => {
                          let questions: string[] = [];
                          try { questions = JSON.parse(activeTemplate.questions); } catch { questions = [activeTemplate.questions]; }
                          return questions.map((q, i) => (
                            <div key={i} style={{ marginBottom: 22 }}>
                              <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 10, color: "#F0F0F0" }}>{q}</label>
                              <textarea
                                value={answers[i] ?? ""}
                                onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                                rows={3}
                                placeholder="Your answer..."
                                style={{
                                  width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A",
                                  color: "#F0F0F0", borderRadius: 10, padding: "12px 16px",
                                  fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box",
                                  lineHeight: 1.5, transition: "border-color 0.15s",
                                }}
                                onFocus={e => e.target.style.borderColor = accent}
                                onBlur={e => e.target.style.borderColor = "#2A2A2A"}
                              />
                            </div>
                          ));
                        })()}
                        <button type="submit" disabled={submitting} style={{
                          background: accent, color: "#0F0F0F", fontWeight: 600,
                          padding: "12px 28px", borderRadius: 8, border: "none",
                          cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
                          fontSize: 14, transition: "opacity 0.15s",
                        }}>
                          {submitting ? "Submitting..." : "Submit Check-In"}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid #1A1A1A", padding: "28px 24px",
        textAlign: "center", color: "#333", fontSize: 12,
        letterSpacing: "0.02em",
      }}>
        Powered by <span style={{ color: "#505050", fontWeight: 600 }}>ClientFlow</span>
        <span style={{ margin: "0 8px", color: "#222" }}>&middot;</span>
        <span>&copy; {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
