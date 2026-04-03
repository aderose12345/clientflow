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

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#C8F04A", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontWeight: 900, color: "#0F0F0F", fontSize: 20 }}>C</span>
          </div>
          <div style={{ color: "#606060", fontSize: 14 }}>Loading your portal...</div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No portal found</h2>
          <p style={{ color: "#A0A0A0", marginBottom: 24 }}>
            Your account doesn't have a client record yet. If you received an invitation, make sure you're signing in with the same email it was sent to.
          </p>
          <button onClick={() => signOut(() => router.push("/sign-in"))} style={{
            background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
            padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer",
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
  const recentSubmission = activeTemplate
    ? client.checkInSubmissions.find(s => s.templateId === activeTemplate.id)
    : null;

  const TABS = [
    { id: "overview", label: "Program" },
    { id: "tasks",    label: `Tasks${pending.length > 0 ? ` (${pending.length})` : ""}` },
    { id: "checkin",  label: "Check-In" },
  ] as const;

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Top bar */}
      <header style={{
        background: "#161616", borderBottom: "1px solid #2A2A2A",
        padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontWeight: 900, color: "#0F0F0F", fontSize: 16 }}>C</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{client.workspace.businessName}</div>
            <div style={{ fontSize: 11, color: "#606060" }}>Client Portal</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#A0A0A0" }}>{client.firstName} {client.lastName}</span>
          <button onClick={() => signOut(() => router.push("/sign-in"))} style={{
            background: "transparent", border: "1px solid #2A2A2A", color: "#606060",
            padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12,
          }}>Sign out</button>
        </div>
      </header>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
        {/* Welcome */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: 4 }}>
            Welcome back, {client.firstName} 👋
          </h1>
          {program && (
            <p style={{ color: "#A0A0A0", margin: 0 }}>
              You're enrolled in <strong style={{ color: "#F0F0F0" }}>{program.name}</strong>
              {program.duration ? ` · ${program.duration}` : ""}
            </p>
          )}
        </div>

        {/* Progress bar (tasks) */}
        {tasks.length > 0 && (
          <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Task Progress</span>
              <span style={{ fontSize: 13, color: "#A0A0A0" }}>{done.length}/{tasks.length} completed</span>
            </div>
            <div style={{ height: 6, background: "#2A2A2A", borderRadius: 99 }}>
              <div style={{
                height: 6, borderRadius: 99, background: accent,
                width: `${tasks.length > 0 ? (done.length / tasks.length) * 100 : 0}%`,
                transition: "width 0.6s ease",
              }} />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#161616", padding: 4, borderRadius: 10, width: "fit-content", border: "1px solid #2A2A2A" }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSubmitted(false); }} style={{
              padding: "7px 18px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
              background: activeTab === tab.id ? accent : "transparent",
              color: activeTab === tab.id ? "#0F0F0F" : "#A0A0A0",
              transition: "all 0.15s",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div>
            {!program ? (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>No program assigned yet</div>
                <div style={{ color: "#A0A0A0" }}>Your coach will assign you to a program soon.</div>
              </div>
            ) : (
              <div>
                {program.description && (
                  <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                    <p style={{ color: "#A0A0A0", margin: 0, fontSize: 14, lineHeight: 1.6 }}>{program.description}</p>
                  </div>
                )}

                {program.steps.length > 0 && (
                  <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>Program Roadmap</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {program.steps.map((step, i) => (
                        <div key={step.id} style={{
                          display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                          borderRadius: 8, background: i % 2 === 0 ? "#1A1A1A" : "transparent",
                        }}>
                          <div style={{ color: "#606060", fontSize: 12, fontWeight: 600, width: 20, textAlign: "center" }}>{step.position}</div>
                          <div style={{ fontSize: 18 }}>{STEP_ICON[step.type] ?? "📌"}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{step.title}</div>
                            {step.description && <div style={{ fontSize: 12, color: "#606060", marginTop: 1 }}>{step.description}</div>}
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "rgba(200,240,74,0.08)", color: "#C8F04A", textTransform: "uppercase" }}>
                            {STEP_TYPES.find(t => t.value === step.type)?.label ?? step.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {program.milestones.length > 0 && (
                  <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24, marginTop: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Milestones</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {program.milestones.map(m => {
                        const isComplete = completedMilestoneIds.has(m.id);
                        return (
                          <div key={m.id} style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                            borderRadius: 8, background: "#1A1A1A",
                            opacity: isComplete ? 0.6 : 1,
                          }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: "50%",
                              background: isComplete ? accent : "#2A2A2A",
                              border: `2px solid ${isComplete ? accent : "#3A3A3A"}`,
                              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}>
                              {isComplete && <span style={{ color: "#0F0F0F", fontSize: 12, fontWeight: 900 }}>✓</span>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, textDecoration: isComplete ? "line-through" : "none", color: isComplete ? "#606060" : "#F0F0F0" }}>
                                🏆 {m.title}
                              </div>
                              {m.description && <div style={{ fontSize: 12, color: "#606060", marginTop: 1 }}>{m.description}</div>}
                            </div>
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
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>No tasks yet</div>
                <div style={{ color: "#A0A0A0" }}>Your coach will assign tasks to you soon.</div>
              </div>
            ) : (
              <div>
                {pending.length > 0 && (
                  <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24, marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>To Do ({pending.length})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pending.map(t => (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: "#1A1A1A" }}>
                          <button
                            onClick={() => completeTask(t.id)}
                            disabled={completingId === t.id}
                            style={{
                              width: 22, height: 22, borderRadius: 6, border: "2px solid #3A3A3A",
                              background: "transparent", cursor: "pointer", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              opacity: completingId === t.id ? 0.5 : 1,
                            }}
                          >
                            {completingId === t.id && <span style={{ color: "#606060", fontSize: 10 }}>…</span>}
                          </button>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>{t.title}</div>
                            {t.description && <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 2 }}>{t.description}</div>}
                            {t.dueDate && (
                              <div style={{ fontSize: 11, color: "#606060", marginTop: 3 }}>
                                Due {new Date(t.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => completeTask(t.id)}
                            disabled={completingId === t.id}
                            style={{
                              background: accent, color: "#0F0F0F", fontWeight: 600,
                              padding: "6px 14px", borderRadius: 6, border: "none",
                              cursor: "pointer", fontSize: 12, opacity: completingId === t.id ? 0.7 : 1,
                            }}
                          >
                            Mark Complete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {done.length > 0 && (
                  <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, color: "#606060" }}>Completed ({done.length})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {done.map(t => (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, opacity: 0.5 }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: 6, background: accent,
                            border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          }}>
                            <span style={{ color: "#0F0F0F", fontSize: 12, fontWeight: 900 }}>✓</span>
                          </div>
                          <div style={{ fontSize: 14, textDecoration: "line-through", color: "#606060" }}>{t.title}</div>
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
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>No check-ins configured</div>
                <div style={{ color: "#A0A0A0" }}>Your coach will set up check-in forms for your program.</div>
              </div>
            ) : (
              <div>
                {/* Template selector */}
                {program.checkInTemplates.length > 1 && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {program.checkInTemplates.map(t => (
                      <button key={t.id} onClick={() => { setActiveTemplate(t); setSubmitted(false); setAnswers({}); }} style={{
                        padding: "7px 16px", borderRadius: 8, border: "1px solid",
                        borderColor: activeTemplate?.id === t.id ? accent : "#2A2A2A",
                        background: activeTemplate?.id === t.id ? "rgba(200,240,74,0.08)" : "transparent",
                        color: activeTemplate?.id === t.id ? accent : "#A0A0A0",
                        cursor: "pointer", fontSize: 13,
                      }}>{t.name}</button>
                    ))}
                  </div>
                )}

                {/* Auto-select first template */}
                {!activeTemplate && program.checkInTemplates.length > 0 && (
                  <div>
                    {(() => { if (!activeTemplate) setTimeout(() => setActiveTemplate(program.checkInTemplates[0]), 0); return null; })()}
                  </div>
                )}

                {activeTemplate && (
                  <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24 }}>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{activeTemplate.name}</div>
                      <div style={{ fontSize: 12, color: "#606060" }}>{activeTemplate.frequency} check-in</div>
                      {recentSubmission && (
                        <div style={{ marginTop: 8, fontSize: 12, color: "#A0A0A0" }}>
                          Last submitted: {new Date(recentSubmission.submittedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {submitted ? (
                      <div style={{ textAlign: "center", padding: "32px 0" }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Check-in submitted!</div>
                        <div style={{ color: "#A0A0A0", marginBottom: 20 }}>Your coach has been notified.</div>
                        <button onClick={() => { setSubmitted(false); setAnswers({}); }} style={{
                          background: accent, color: "#0F0F0F", fontWeight: 600,
                          padding: "9px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                        }}>Submit Another</button>
                      </div>
                    ) : (
                      <form onSubmit={submitCheckin}>
                        {(() => {
                          let questions: string[] = [];
                          try { questions = JSON.parse(activeTemplate.questions); } catch { questions = [activeTemplate.questions]; }
                          return questions.map((q, i) => (
                            <div key={i} style={{ marginBottom: 18 }}>
                              <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 8 }}>{q}</label>
                              <textarea
                                value={answers[i] ?? ""}
                                onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                                rows={3}
                                placeholder="Your answer..."
                                style={{
                                  width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A",
                                  color: "#F0F0F0", borderRadius: 8, padding: "10px 14px",
                                  fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box",
                                }}
                              />
                            </div>
                          ));
                        })()}
                        <button type="submit" disabled={submitting} style={{
                          background: accent, color: "#0F0F0F", fontWeight: 600,
                          padding: "10px 24px", borderRadius: 8, border: "none",
                          cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
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
    </div>
  );
}
