"use client";
import { useClerk } from "@clerk/nextjs";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/lib/useIsMobile";

type Step       = { id: string; type: string; title: string; description: string | null; position: number };
type Milestone  = { id: string; title: string; description: string | null; position: number };
type Template   = { id: string; name: string; frequency: string; questions: string };
type Task       = { id: string; title: string; description: string | null; status: string; dueDate: string | null; completedAt: string | null };
type Workspace  = { businessName: string; brandColor: string; logoUrl: string | null; hideBranding?: boolean; portalWelcomeMessage?: string | null; portalPrimaryColor?: string | null; supportEmail?: string | null };
type DocReq     = { id: string; title: string; description: string | null; required: boolean; status: string; fileUrl: string | null; fileName: string | null; requestedAt: string };
type Program    = { id: string; name: string; description: string | null; duration: string | null; steps: Step[]; milestones: Milestone[]; checkInTemplates: Template[] };
type Client     = {
  id: string; firstName: string; lastName: string; email: string; status: string; createdAt: string;
  workspace: Workspace; program: Program | null;
  tasks: Task[];
  milestoneCompletions: { milestoneId: string }[];
  checkInSubmissions: { templateId: string; submittedAt: string; answers: string }[];
  documentRequests: DocReq[];
};

const STEP_ICON: Record<string, string> = {
  intake_form: "📝", agreement: "✍️", task: "✅", milestone: "🏆", checkin: "📊", resource: "📁", document: "📎",
};

const STEP_ACTION: Record<string, string> = {
  intake_form: "Complete Form", agreement: "Review & Sign", task: "Mark as Complete",
  document: "Upload Document", resource: "View Resource", checkin: "Submit Update",
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  on_track:        { label: "On Track",        color: "#C8F04A", bg: "rgba(200,240,74,0.1)" },
  needs_attention: { label: "Needs Attention",  color: "#F0A94A", bg: "rgba(240,169,74,0.1)" },
  stuck:           { label: "At Risk",          color: "#FF6B6B", bg: "rgba(255,107,107,0.1)" },
  churned:         { label: "Churned",          color: "#808080", bg: "rgba(128,128,128,0.1)" },
};

function daysAgo(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function PortalPage() {
  const { signOut } = useClerk();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [client, setClient]         = useState<Client | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [activeTab, setActiveTab]   = useState<"home" | "documents" | "updates" | "resources">("home");
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Update form state
  const [updateCompleted, setUpdateCompleted] = useState("");
  const [updateStuck, setUpdateStuck]         = useState("");
  const [updateConfidence, setUpdateConfidence] = useState(7);
  const [updateNextAction, setUpdateNextAction] = useState("");
  const [submitting, setSubmitting]             = useState(false);
  const [submitted, setSubmitted]               = useState(false);

  // Document upload state
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [linkInput, setLinkInput]     = useState<Record<string, string>>({});

  const fetchClient = useCallback(async () => {
    setLoading(true);
    // Check role — redirect owners to dashboard
    try {
      const roleRes = await fetch("/api/auth/role");
      const roleData = await roleRes.json();
      if (roleData.role === "owner") { router.replace("/dashboard"); return; }
    } catch { /* continue to load portal */ }

    const res = await fetch("/api/portal/me");
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    const d = await res.json();
    setClient(d.client);
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  async function completeTask(taskId: string) {
    setCompletingId(taskId);
    await fetch(`/api/portal/tasks/${taskId}/complete`, { method: "POST" });
    setCompletingId(null);
    fetchClient();
  }

  async function submitUpdate() {
    if (!client?.program?.checkInTemplates?.[0]) return;
    setSubmitting(true);
    const answers = JSON.stringify({
      completed: updateCompleted,
      stuck: updateStuck,
      confidence: updateConfidence,
      nextAction: updateNextAction,
    });
    await fetch("/api/portal/checkins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: client.program.checkInTemplates[0].id, answers }),
    });
    setSubmitting(false);
    setSubmitted(true);
    setUpdateCompleted(""); setUpdateStuck(""); setUpdateConfidence(7); setUpdateNextAction("");
    fetchClient();
  }

  async function submitDocLink(docId: string) {
    const url = linkInput[docId]?.trim();
    if (!url) return;
    setUploadingId(docId);
    await fetch(`/api/portal/documents/${docId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl: url, fileName: url.split("/").pop() || "Link" }),
    });
    setUploadingId(null);
    setLinkInput(prev => ({ ...prev, [docId]: "" }));
    fetchClient();
  }

  // ── Derived data ──
  const accent = client?.workspace?.portalPrimaryColor || client?.workspace?.brandColor || "#C8F04A";
  const ws = client?.workspace;
  const program = client?.program;
  const steps = program?.steps ?? [];
  const tasks = client?.tasks ?? [];
  const docs = client?.documentRequests ?? [];
  const completedTaskIds = new Set(tasks.filter(t => t.status === "complete").map(t => t.id));
  const uploadedDocIds = new Set(docs.filter(d => d.status !== "pending").map(d => d.id));
  const submissions = client?.checkInSubmissions ?? [];

  // Step completion mapping: a step is "done" if a matching task is completed
  // We match steps to tasks by title (since tasks are created from steps)
  const completedStepPositions = new Set<number>();
  steps.forEach(step => {
    const matchingTask = tasks.find(t => t.title === step.title && t.status === "complete");
    if (matchingTask) completedStepPositions.add(step.position);
    // Resource steps are always "available" not completable
    // Check-in steps are done if there's a submission
    if (step.type === "checkin" && submissions.length > 0) completedStepPositions.add(step.position);
    // Document steps
    if ((step.type === "document" || step.type === "task") && docs.some(d => d.title === step.title && d.status !== "pending")) {
      completedStepPositions.add(step.position);
    }
  });

  const completedSteps = completedStepPositions.size;
  const totalSteps = steps.filter(s => s.type !== "resource").length || 1;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);

  // Find next incomplete step
  const nextStep = steps.find(s => s.type !== "resource" && !completedStepPositions.has(s.position));

  const daysInProgram = client ? Math.max(1, Math.floor((Date.now() - new Date(client.createdAt).getTime()) / 86400000)) : 0;
  const resourceSteps = steps.filter(s => s.type === "resource");
  const pendingDocs = docs.filter(d => d.status === "pending").length;
  const statusBadge = STATUS_BADGE[client?.status ?? "on_track"] ?? STATUS_BADGE.on_track;

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F0F0F" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#C8F04A", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontWeight: 900, color: "#0F0F0F", fontSize: 22 }}>C</span>
          </div>
          <div style={{ color: "#A0A0A0", fontSize: 14 }}>Loading your portal...</div>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !client) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F0F0F" }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: "0 24px" }}>
          <div style={{ fontSize: 28, marginBottom: 16 }}>🔍</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: "#F0F0F0" }}>No portal found</h2>
          <p style={{ color: "#A0A0A0", marginBottom: 28, lineHeight: 1.6, fontSize: 14 }}>
            Your account doesn&apos;t have a client record yet. Make sure you&apos;re signing in with the same email your invitation was sent to.
          </p>
          <button onClick={() => signOut(() => router.push("/sign-in"))} style={{
            background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
            padding: "11px 28px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14,
          }}>Sign Out</button>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "home" as const,      label: "Home",      icon: "⌂" },
    { id: "documents" as const, label: `Documents${pendingDocs > 0 ? ` (${pendingDocs})` : ""}`, icon: "📎" },
    { id: "updates" as const,   label: "Updates",    icon: "📊" },
    { id: "resources" as const, label: "Resources",  icon: "📁" },
  ];

  const textareaStyle: React.CSSProperties = {
    width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F0F0F0",
    borderRadius: 10, padding: "12px 16px", fontSize: 14, outline: "none", resize: "vertical",
    boxSizing: "border-box", lineHeight: 1.5,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F0F", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── Header ── */}
      <header style={{ background: "#161616", borderBottom: "1px solid #2A2A2A", padding: isMobile ? "0 12px" : "0 20px", height: isMobile ? 52 : 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, minWidth: 0, flex: 1 }}>
          <div style={{ width: isMobile ? 30 : 36, height: isMobile ? 30 : 36, borderRadius: isMobile ? 8 : 10, background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontWeight: 900, color: "#0F0F0F", fontSize: isMobile ? 14 : 17 }}>{ws?.businessName?.charAt(0).toUpperCase()}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: isMobile ? 13 : 14, color: "#F0F0F0", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws?.businessName}</div>
            {program && !isMobile && <div style={{ fontSize: 11, color: "#505050" }}>{program.name}</div>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, flexShrink: 0 }}>
          {!isMobile && <span style={{ fontSize: 13, color: "#606060" }}>{client.firstName}</span>}
          <button onClick={() => signOut(() => router.push("/sign-in"))} style={{
            background: "transparent", border: "1px solid #2A2A2A", color: "#606060",
            padding: isMobile ? "5px 10px" : "6px 14px", borderRadius: 7, cursor: "pointer", fontSize: isMobile ? 11 : 12,
          }}>Sign out</button>
        </div>
      </header>

      {/* ── Tab Navigation (top on desktop, bottom on mobile) ── */}
      {!isMobile && (
        <div style={{ background: "#161616", borderBottom: "1px solid #2A2A2A", padding: "0 20px", display: "flex", gap: 0 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSubmitted(false); }} style={{
              padding: "12px 18px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
              background: "transparent",
              color: activeTab === tab.id ? accent : "#505050",
              borderBottom: activeTab === tab.id ? `2px solid ${accent}` : "2px solid transparent",
              marginBottom: -1, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 13 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "16px 12px 100px" : "28px 20px 80px" }}>

        {/* ════════════════ HOME TAB ════════════════ */}
        {activeTab === "home" && (
          <div>
            {/* Welcome + Progress */}
            <div style={{ marginBottom: isMobile ? 16 : 24 }}>
              <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 300, color: "#F0F0F0", marginBottom: 4, letterSpacing: "-0.02em" }}>
                Welcome back, <span style={{ fontWeight: 600 }}>{client.firstName}</span>
              </h1>
              {program && (
                <p style={{ color: "#606060", margin: "0 0 16px", fontSize: 14 }}>{program.name}{program.duration ? ` · ${program.duration}` : ""}</p>
              )}

              {/* Progress bar */}
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 14, padding: isMobile ? "16px" : "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 14, color: "#F0F0F0", fontWeight: 500 }}>
                    You are <span style={{ color: accent, fontWeight: 700 }}>{progressPct}%</span> through your onboarding
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: statusBadge.bg, color: statusBadge.color }}>
                    {statusBadge.label}
                  </span>
                </div>
                <div style={{ height: 8, background: "#1E1E1E", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${accent}, ${accent}dd)`, width: `${progressPct}%`, transition: "width 0.8s ease" }} />
                </div>
                <div style={{ fontSize: 12, color: "#505050", marginTop: 8 }}>{completedSteps} of {totalSteps} steps completed</div>
              </div>
            </div>

            {/* Next Step Card */}
            {nextStep && (
              <div style={{
                background: "#161616", border: `2px solid ${accent}40`, borderRadius: 16,
                padding: isMobile ? 16 : 24, marginBottom: isMobile ? 16 : 24, position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />
                <div style={{ fontSize: 11, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                  Your Next Step
                </div>
                <div style={{ display: "flex", alignItems: isMobile ? "center" : "flex-start", gap: isMobile ? 12 : 16 }}>
                  <div style={{
                    width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, borderRadius: isMobile ? 12 : 14, background: `${accent}15`, border: `1px solid ${accent}30`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 20 : 24, flexShrink: 0,
                  }}>
                    {STEP_ICON[nextStep.type] ?? "📌"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#505050", marginBottom: 4 }}>Step {nextStep.position} of {steps.length}</div>
                    <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, color: "#F0F0F0", marginBottom: 4 }}>{nextStep.title}</div>
                    {nextStep.description && <div style={{ fontSize: isMobile ? 13 : 14, color: "#A0A0A0", lineHeight: 1.5, marginBottom: 14 }}>{nextStep.description}</div>}
                    <button
                      onClick={() => {
                        if (nextStep.type === "task" || nextStep.type === "intake_form" || nextStep.type === "agreement") {
                          const matchingTask = tasks.find(t => t.title === nextStep.title && t.status !== "complete");
                          if (matchingTask) completeTask(matchingTask.id);
                        } else if (nextStep.type === "document") {
                          setActiveTab("documents");
                        } else if (nextStep.type === "checkin") {
                          setActiveTab("updates");
                        } else if (nextStep.type === "resource") {
                          setActiveTab("resources");
                        }
                      }}
                      disabled={completingId !== null}
                      style={{
                        background: accent, color: "#0F0F0F", fontWeight: 600,
                        padding: isMobile ? "12px 20px" : "11px 24px", borderRadius: 9, border: "none", cursor: "pointer",
                        fontSize: 14, opacity: completingId ? 0.7 : 1, transition: "opacity 0.15s",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      {completingId ? "Processing..." : (STEP_ACTION[nextStep.type] ?? "Continue")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!nextStep && steps.length > 0 && (
              <div style={{
                background: "#161616", border: `2px solid ${accent}40`, borderRadius: 16,
                padding: "32px 24px", marginBottom: 24, textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#F0F0F0", marginBottom: 6 }}>All steps completed!</div>
                <div style={{ color: "#A0A0A0", fontSize: 14 }}>Great work. Your account manager has been notified.</div>
              </div>
            )}

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 16 : 24 }}>
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: isMobile ? "12px" : "16px 18px" }}>
                <div style={{ color: "#505050", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 600 }}>Steps Done</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 26, fontWeight: 300, color: "#F0F0F0" }}>{completedSteps}</span>
                  <span style={{ fontSize: 13, color: "#505050" }}>/ {totalSteps}</span>
                </div>
              </div>
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: isMobile ? "12px" : "16px 18px" }}>
                <div style={{ color: "#505050", fontSize: isMobile ? 9 : 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: isMobile ? 6 : 8, fontWeight: 600 }}>Docs Submitted</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: isMobile ? 22 : 26, fontWeight: 300, color: "#F0F0F0" }}>{uploadedDocIds.size}</span>
                  <span style={{ fontSize: isMobile ? 11 : 13, color: "#505050" }}>/ {docs.length || 0}</span>
                </div>
              </div>
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: isMobile ? "12px" : "16px 18px" }}>
                <div style={{ color: "#505050", fontSize: isMobile ? 9 : 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: isMobile ? 6 : 8, fontWeight: 600 }}>Days In Program</div>
                <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 300, color: "#F0F0F0" }}>{daysInProgram}</div>
              </div>
            </div>

            {/* Journey Timeline */}
            {steps.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0", marginBottom: 16 }}>Your Onboarding Journey</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {steps.map((step, i) => {
                    const isDone = completedStepPositions.has(step.position);
                    const isCurrent = !isDone && nextStep?.id === step.id;
                    const isUpcoming = !isDone && !isCurrent;
                    const matchingTask = tasks.find(t => t.title === step.title && t.status === "complete");
                    return (
                      <div key={step.id} style={{ display: "flex", gap: 0 }}>
                        {/* Timeline column */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", flexShrink: 0, zIndex: 1,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: isDone ? accent : isCurrent ? "#0F0F0F" : "#1A1A1A",
                            border: `2px solid ${isDone ? accent : isCurrent ? accent : "#2A2A2A"}`,
                            boxShadow: isCurrent ? `0 0 0 4px ${accent}20` : "none",
                            transition: "all 0.3s",
                          }}>
                            {isDone ? (
                              <span style={{ color: "#0F0F0F", fontSize: 14, fontWeight: 900 }}>✓</span>
                            ) : isCurrent ? (
                              <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent }} />
                            ) : (
                              <span style={{ color: "#3A3A3A", fontSize: 11, fontWeight: 700 }}>{step.position}</span>
                            )}
                          </div>
                          {i < steps.length - 1 && (
                            <div style={{ width: 2, flex: 1, background: isDone ? `${accent}40` : "#2A2A2A", minHeight: 20 }} />
                          )}
                        </div>

                        {/* Step content */}
                        <div style={{
                          flex: 1, marginLeft: 10, marginBottom: 8, padding: "10px 16px",
                          borderRadius: 10, background: isCurrent ? "#161616" : "transparent",
                          border: isCurrent ? `1px solid ${accent}30` : "1px solid transparent",
                          opacity: isUpcoming ? 0.5 : 1, transition: "opacity 0.2s",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 15 }}>{STEP_ICON[step.type] ?? "📌"}</span>
                            <span style={{ fontSize: 14, fontWeight: 500, color: isDone ? "#606060" : "#F0F0F0", textDecoration: isDone ? "line-through" : "none" }}>
                              {step.title}
                            </span>
                          </div>
                          {step.description && !isUpcoming && (
                            <div style={{ fontSize: 12, color: "#606060", marginTop: 2, marginLeft: 23 }}>{step.description}</div>
                          )}
                          <div style={{ fontSize: 11, color: "#505050", marginTop: 4, marginLeft: 23 }}>
                            {isDone ? (
                              <span style={{ color: accent }}>Completed{matchingTask?.completedAt ? ` ${daysAgo(matchingTask.completedAt)}` : ""}</span>
                            ) : isCurrent ? (
                              <span style={{ color: accent }}>In Progress</span>
                            ) : (
                              <span>Upcoming</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {tasks.filter(t => t.status === "complete").length > 0 && (
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0", marginBottom: 12 }}>Recent Activity</div>
                <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 16 }}>
                  {tasks.filter(t => t.status === "complete").slice(-3).reverse().map(t => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #1E1E1E" }}>
                      <span style={{ color: accent, fontSize: 12 }}>✓</span>
                      <span style={{ fontSize: 13, color: "#A0A0A0", flex: 1 }}>Completed: {t.title}</span>
                      {t.completedAt && <span style={{ fontSize: 11, color: "#505050" }}>{daysAgo(t.completedAt)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════ DOCUMENTS TAB ════════════════ */}
        {activeTab === "documents" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 400, color: "#F0F0F0", marginBottom: 20 }}>Documents</h2>
            {docs.length === 0 ? (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
                <div style={{ fontWeight: 500, color: "#F0F0F0", marginBottom: 4 }}>No documents requested yet</div>
                <div style={{ color: "#606060", fontSize: 13 }}>Your account manager will request documents when needed.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {docs.map(doc => {
                  const isDone = doc.status === "uploaded" || doc.status === "approved";
                  return (
                    <div key={doc.id} style={{
                      background: "#161616", border: `1px solid ${isDone ? "#2A2A2A" : doc.required ? `${accent}30` : "#2A2A2A"}`,
                      borderRadius: 14, padding: "20px 22px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {isDone ? (
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ color: "#0F0F0F", fontSize: 14, fontWeight: 900 }}>✓</span>
                            </div>
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1E1E1E", border: "2px solid #3A3A3A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ fontSize: 13 }}>📎</span>
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 500, color: "#F0F0F0" }}>{doc.title}</div>
                            {doc.description && <div style={{ fontSize: 13, color: "#A0A0A0", marginTop: 2 }}>{doc.description}</div>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {doc.required && doc.status === "pending" && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: "#F0A94A", padding: "2px 8px", borderRadius: 99, background: "rgba(240,169,74,0.1)" }}>Required</span>
                          )}
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                            background: doc.status === "approved" ? `${accent}15` : doc.status === "uploaded" ? "rgba(96,165,250,0.1)" : "rgba(240,169,74,0.1)",
                            color: doc.status === "approved" ? accent : doc.status === "uploaded" ? "#60A5FA" : "#F0A94A",
                            textTransform: "capitalize",
                          }}>{doc.status === "approved" ? "Approved" : doc.status === "uploaded" ? "Under Review" : "Pending"}</span>
                        </div>
                      </div>

                      {doc.status === "pending" && (
                        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                          <input
                            value={linkInput[doc.id] ?? ""}
                            onChange={e => setLinkInput(prev => ({ ...prev, [doc.id]: e.target.value }))}
                            placeholder="Paste file link (Google Drive, Dropbox, etc.)..."
                            style={{ flex: 1, background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F0F0F0", borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none" }}
                            onFocus={e => e.target.style.borderColor = accent}
                            onBlur={e => e.target.style.borderColor = "#2A2A2A"}
                          />
                          <button onClick={() => submitDocLink(doc.id)} disabled={uploadingId === doc.id || !linkInput[doc.id]?.trim()} style={{
                            background: accent, color: "#0F0F0F", fontWeight: 600,
                            padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, flexShrink: 0,
                            opacity: uploadingId === doc.id ? 0.7 : 1,
                          }}>{uploadingId === doc.id ? "Submitting..." : "Submit"}</button>
                        </div>
                      )}

                      {isDone && doc.fileUrl && (
                        <div style={{ fontSize: 12, color: "#606060", marginTop: 10, marginLeft: 38 }}>
                          Submitted: <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: accent }}>{doc.fileName || "View file"}</a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ UPDATES TAB ════════════════ */}
        {activeTab === "updates" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 400, color: "#F0F0F0", marginBottom: 20 }}>Progress Updates</h2>

            {submitted ? (
              <div style={{ background: "#161616", border: `1px solid ${accent}30`, borderRadius: 14, padding: "40px 24px", textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#F0F0F0", marginBottom: 6 }}>Update submitted!</div>
                <div style={{ color: "#A0A0A0", fontSize: 14, marginBottom: 20 }}>Your account manager has been notified.</div>
                <button onClick={() => setSubmitted(false)} style={{
                  background: accent, color: "#0F0F0F", fontWeight: 600,
                  padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14,
                }}>Submit Another</button>
              </div>
            ) : (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 14, padding: 24, marginBottom: 24 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0", marginBottom: 18 }}>Submit a Progress Update</div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", display: "block", marginBottom: 8 }}>What did you complete?</label>
                  <textarea value={updateCompleted} onChange={e => setUpdateCompleted(e.target.value)} rows={2} placeholder="List what you finished since your last update..." style={textareaStyle}
                    onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", display: "block", marginBottom: 8 }}>What are you stuck on?</label>
                  <textarea value={updateStuck} onChange={e => setUpdateStuck(e.target.value)} rows={2} placeholder="Anything blocking your progress?" style={textareaStyle}
                    onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", display: "block", marginBottom: 8 }}>Confidence score: <span style={{ color: accent, fontWeight: 700 }}>{updateConfidence}/10</span></label>
                  <input type="range" min={1} max={10} value={updateConfidence} onChange={e => setUpdateConfidence(Number(e.target.value))} style={{ width: "100%", accentColor: accent }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#505050" }}>
                    <span>Not confident</span><span>Very confident</span>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", display: "block", marginBottom: 8 }}>What is your next action?</label>
                  <textarea value={updateNextAction} onChange={e => setUpdateNextAction(e.target.value)} rows={2} placeholder="What will you do next?" style={textareaStyle}
                    onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
                </div>

                <button onClick={submitUpdate} disabled={submitting || !updateCompleted.trim()} style={{
                  background: accent, color: "#0F0F0F", fontWeight: 600,
                  padding: "12px 28px", borderRadius: 9, border: "none", cursor: submitting ? "not-allowed" : "pointer",
                  fontSize: 14, opacity: submitting ? 0.7 : 1,
                }}>{submitting ? "Submitting..." : "Submit Update"}</button>
              </div>
            )}

            {/* Previous submissions */}
            {submissions.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0", marginBottom: 12 }}>Previous Updates</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {submissions.map((sub, i) => {
                    let parsed: Record<string, string> = {};
                    try { parsed = JSON.parse(sub.answers); } catch { /* ignore */ }
                    return (
                      <div key={i} style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: "16px 20px" }}>
                        <div style={{ fontSize: 11, color: "#505050", marginBottom: 8 }}>
                          {new Date(sub.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        {parsed.completed && <div style={{ fontSize: 13, color: "#A0A0A0", marginBottom: 4 }}><span style={{ color: "#606060" }}>Completed:</span> {parsed.completed}</div>}
                        {parsed.stuck && <div style={{ fontSize: 13, color: "#A0A0A0", marginBottom: 4 }}><span style={{ color: "#606060" }}>Stuck on:</span> {parsed.stuck}</div>}
                        {parsed.confidence && <div style={{ fontSize: 13, color: "#A0A0A0", marginBottom: 4 }}><span style={{ color: "#606060" }}>Confidence:</span> {parsed.confidence}/10</div>}
                        {parsed.nextAction && <div style={{ fontSize: 13, color: "#A0A0A0" }}><span style={{ color: "#606060" }}>Next:</span> {parsed.nextAction}</div>}
                        {/* Fallback for old format submissions */}
                        {!parsed.completed && !parsed.stuck && sub.answers && (
                          <div style={{ fontSize: 13, color: "#A0A0A0" }}>{sub.answers.substring(0, 200)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════ RESOURCES TAB ════════════════ */}
        {activeTab === "resources" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 400, color: "#F0F0F0", marginBottom: 20 }}>Resources</h2>
            {resourceSteps.length === 0 ? (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📁</div>
                <div style={{ fontWeight: 500, color: "#F0F0F0", marginBottom: 4 }}>No resources yet</div>
                <div style={{ color: "#606060", fontSize: 13 }}>Resources will appear here as they are added to your program.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                {resourceSteps.map(step => (
                  <div key={step.id} style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 14, padding: isMobile ? 16 : 22 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 22 }}>📁</span>
                      <div style={{ fontWeight: 500, fontSize: 15, color: "#F0F0F0" }}>{step.title}</div>
                    </div>
                    {step.description && (
                      <div style={{ fontSize: 13, color: "#A0A0A0", lineHeight: 1.5, marginBottom: 14 }}>{step.description}</div>
                    )}
                    {step.description && step.description.startsWith("http") && (
                      <a href={step.description} target="_blank" rel="noopener noreferrer" style={{
                        display: "inline-block", background: `${accent}15`, border: `1px solid ${accent}30`,
                        color: accent, fontWeight: 600, padding: "8px 18px", borderRadius: 8,
                        textDecoration: "none", fontSize: 13,
                      }}>View Resource</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile bottom nav ── */}
      {isMobile && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          height: 60, background: "#161616", borderTop: "1px solid #2A2A2A",
          display: "flex", alignItems: "center", justifyContent: "space-around",
          zIndex: 50,
        }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSubmitted(false); }} style={{
              background: "transparent", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "8px 12px", minWidth: 56, minHeight: 44,
              justifyContent: "center",
            }}>
              <span style={{
                fontSize: 20,
                filter: activeTab === tab.id ? "none" : "grayscale(1) opacity(0.4)",
                transition: "all 0.15s",
              }}>{tab.icon}</span>
              <span style={{
                fontSize: 9, fontWeight: 600,
                color: activeTab === tab.id ? accent : "#606060",
              }}>{tab.id === "home" ? "Home" : tab.id === "documents" ? "Docs" : tab.id === "updates" ? "Updates" : "Files"}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      {!isMobile && (
      <footer style={{ borderTop: "1px solid #1A1A1A", padding: "20px", textAlign: "center", color: "#333", fontSize: 12 }}>
        {ws?.supportEmail && (
          <div style={{ marginBottom: 6 }}><a href={`mailto:${ws.supportEmail}`} style={{ color: "#505050", textDecoration: "none" }}>{ws.supportEmail}</a></div>
        )}
        {!ws?.hideBranding && <span>Powered by <span style={{ color: "#505050", fontWeight: 600 }}>ClientFlow</span> · </span>}
        <span>&copy; {new Date().getFullYear()}</span>
      </footer>
      )}
    </div>
  );
}
