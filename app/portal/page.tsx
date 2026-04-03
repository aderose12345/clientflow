"use client";
import { useClerk } from "@clerk/nextjs";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/lib/useIsMobile";

type Step       = { id: string; type: string; title: string; description: string | null; position: number; fields?: unknown };
type Milestone  = { id: string; title: string; description: string | null; position: number };
type Template   = { id: string; title: string; description: string | null; position: number; frequency: string; questions: string };
type Task       = { id: string; title: string; description: string | null; status: string; dueDate: string | null; completedAt: string | null };
type Workspace  = { businessName: string; brandColor: string; logoUrl: string | null; hideBranding?: boolean; portalWelcomeMessage?: string | null; portalPrimaryColor?: string | null; supportEmail?: string | null };
type DocReq     = { id: string; title: string; description: string | null; required: boolean; status: string; fileUrl: string | null; fileName: string | null; requestedAt: string };
type StepCompletion = { id: string; stepId: string; data: unknown; completedAt: string };
type Program    = { id: string; name: string; description: string | null; duration: string | null; steps: Step[]; milestones: Milestone[]; checkInTemplates: Template[] };
type Client     = {
  id: string; firstName: string; lastName: string; email: string; status: string; createdAt: string;
  workspace: Workspace; program: Program | null;
  tasks: Task[];
  milestoneCompletions: { milestoneId: string }[];
  checkInSubmissions: { templateId: string; submittedAt: string; answers: string }[];
  documentRequests: DocReq[];
  stepCompletions: StepCompletion[];
};

type StepProgress = {
  id: string; type: string; title: string; description: string | null;
  position: number; fields: unknown; completed: boolean; completedAt: string | null;
};

type ProgressData = {
  steps: StepProgress[];
  currentStep: StepProgress | null;
  progressPct: number;
  completedCount: number;
  totalCount: number;
};

type IntakeField = {
  label: string;
  type: "short_text" | "email" | "phone" | "long_text" | "dropdown" | "multiple_choice" | "checkbox" | "date" | "file_link";
  required?: boolean;
  options?: string;
};

const STEP_ICON: Record<string, string> = {
  intake_form: "\u{1F4DD}", agreement: "\u270D\uFE0F", task: "\u2705", milestone: "\u{1F3C6}", checkin: "\u{1F4CA}", resource: "\u{1F4C1}", document: "\u{1F4CE}",
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalPage() {
  const { signOut } = useClerk();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [client, setClient]         = useState<Client | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [activeTab, setActiveTab]   = useState<"home" | "documents" | "updates" | "resources">("home");

  // Update form state (for Updates tab)
  const [updateCompleted, setUpdateCompleted] = useState("");
  const [updateStuck, setUpdateStuck]         = useState("");
  const [updateConfidence, setUpdateConfidence] = useState(7);
  const [updateNextAction, setUpdateNextAction] = useState("");
  const [submitting, setSubmitting]             = useState(false);
  const [submitted, setSubmitted]               = useState(false);

  // Document upload state (for Documents tab)
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [linkInput, setLinkInput]     = useState<Record<string, string>>({});

  // New step-based state
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [agreeName, setAgreeName] = useState("");
  const [agreeCheck, setAgreeCheck] = useState(false);
  const [stepSubmitting, setStepSubmitting] = useState(false);
  const [stepCompleted, setStepCompleted] = useState<string | null>(null);
  const [docLink, setDocLink] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // Checkin inline state
  const [checkinCompleted, setCheckinCompleted] = useState("");
  const [checkinStuck, setCheckinStuck] = useState("");
  const [checkinConfidence, setCheckinConfidence] = useState(7);
  const [checkinNextAction, setCheckinNextAction] = useState("");

  const journeyRef = useRef<HTMLDivElement>(null);
  const resourceAutoCompleted = useRef<Set<string>>(new Set());

  const fetchClient = useCallback(async () => {
    const res = await fetch("/api/portal/me");
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    const d = await res.json();
    setClient(d.client);
  }, []);

  const fetchProgress = useCallback(async () => {
    const res = await fetch("/api/portal/progress");
    if (!res.ok) return;
    const d = await res.json();
    setProgress(d);
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const roleRes = await fetch("/api/auth/role");
        const roleData = await roleRes.json();
        if (roleData.role === "owner") { router.replace("/dashboard"); return; }
      } catch { /* continue to load portal */ }
      await fetchClient();
      await fetchProgress();
      setLoading(false);
    }
    init();
  }, [fetchClient, fetchProgress, router]);

  // Auto-expand current step
  useEffect(() => {
    if (progress?.currentStep && !expandedStepId && !stepCompleted) {
      setExpandedStepId(progress.currentStep.id);
    }
  }, [progress?.currentStep, expandedStepId, stepCompleted]);

  // Auto-complete resource steps
  useEffect(() => {
    if (!progress) return;
    progress.steps.forEach(step => {
      if (step.type === "resource" && !step.completed && !resourceAutoCompleted.current.has(step.id)) {
        resourceAutoCompleted.current.add(step.id);
        fetch(`/api/portal/steps/${step.id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }).then(() => {
          fetchProgress();
        });
      }
    });
  }, [progress, fetchProgress]);

  async function completeStep(stepId: string, body: Record<string, unknown> = {}) {
    setStepSubmitting(true);
    await fetch(`/api/portal/steps/${stepId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setStepSubmitting(false);
    setStepCompleted(stepId);
    // Reset form state
    setFormValues({});
    setAgreeName("");
    setAgreeCheck(false);
    setDocLink("");
    setFormErrors({});
    setCheckinCompleted("");
    setCheckinStuck("");
    setCheckinConfidence(7);
    setCheckinNextAction("");
    // Refetch
    await Promise.all([fetchClient(), fetchProgress()]);
    // Auto-advance after 2s
    setTimeout(() => {
      setStepCompleted(null);
      setExpandedStepId(null);
    }, 2000);
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
    fetchProgress();
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
    fetchProgress();
  }

  // ── Derived data ──
  const accent = client?.workspace?.portalPrimaryColor || client?.workspace?.brandColor || "#C8F04A";
  const ws = client?.workspace;
  const program = client?.program;
  const steps = program?.steps ?? [];
  const tasks = client?.tasks ?? [];
  const docs = client?.documentRequests ?? [];
  const uploadedDocIds = new Set(docs.filter(d => d.status !== "pending").map(d => d.id));
  const submissions = client?.checkInSubmissions ?? [];

  // Use progress data for step completion
  const progressSteps = progress?.steps ?? [];
  const completedSteps = progress?.completedCount ?? 0;
  const totalSteps = progress?.totalCount ?? 1;
  const progressPct = progress?.progressPct ?? 0;
  const currentStep = progress?.currentStep ?? null;
  const allComplete = progress ? progress.completedCount === progress.totalCount && progress.totalCount > 0 : false;

  const daysInProgram = client ? Math.max(1, Math.floor((Date.now() - new Date(client.createdAt).getTime()) / 86400000)) : 0;
  const resourceSteps = steps.filter(s => s.type === "resource");
  const pendingDocs = docs.filter(d => d.status === "pending").length;
  const statusBadge = STATUS_BADGE[client?.status ?? "on_track"] ?? STATUS_BADGE.on_track;

  // Helper to get completion data for a step
  function getCompletionData(stepId: string): Record<string, unknown> | null {
    const sc = client?.stepCompletions?.find(c => c.stepId === stepId);
    if (!sc) return null;
    return (sc.data as Record<string, unknown>) ?? null;
  }

  // ── Scroll to journey helper ──
  function scrollToJourney() {
    setTimeout(() => {
      journeyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  // ── Input style helper ──
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F0F0F0",
    borderRadius: 10, padding: "12px 16px", fontSize: 14, outline: "none",
    boxSizing: "border-box", lineHeight: 1.5,
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F0F0F0",
    borderRadius: 10, padding: "12px 16px", fontSize: 14, outline: "none", resize: "vertical",
    boxSizing: "border-box", lineHeight: 1.5,
  };

  // ── Step form renderer ──
  function renderStepForm(step: StepProgress) {
    const isCompleted = step.completed;
    const completionData = getCompletionData(step.id);
    const justCompleted = stepCompleted === step.id;

    // Show completion success state
    if (justCompleted) {
      return (
        <div style={{ padding: "24px 0", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: accent, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#0F0F0F", fontSize: 22, fontWeight: 900 }}>{"\u2713"}</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#F0F0F0", marginBottom: 4 }}>Step Completed!</div>
          <div style={{ fontSize: 13, color: "#A0A0A0" }}>Moving to next step...</div>
        </div>
      );
    }

    // ── INTAKE FORM ──
    if (step.type === "intake_form") {
      const fields: IntakeField[] = Array.isArray(step.fields) ? (step.fields as IntakeField[]) : [];

      // Show submitted data if completed
      if (isCompleted && completionData) {
        const answers = (completionData.answers ?? completionData) as Record<string, string>;
        return (
          <div style={{ padding: "12px 0" }}>
            <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginBottom: 10 }}>Submitted Answers</div>
            {Object.entries(answers).map(([key, val]) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "#606060", marginBottom: 2 }}>{key}</div>
                <div style={{ fontSize: 13, color: "#A0A0A0" }}>{String(val)}</div>
              </div>
            ))}
          </div>
        );
      }

      if (fields.length === 0) {
        return <div style={{ padding: "12px 0", fontSize: 13, color: "#606060" }}>No form fields configured for this step.</div>;
      }

      return (
        <div style={{ padding: "12px 0" }}>
          {fields.map((field, idx) => {
            const fieldKey = field.label;
            const value = formValues[fieldKey] ?? "";
            const hasError = formErrors[fieldKey];

            return (
              <div key={idx} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", display: "block", marginBottom: 6 }}>
                  {field.label}
                  {field.required && <span style={{ color: "#FF6B6B", marginLeft: 4 }}>*</span>}
                </label>

                {(field.type === "short_text" || field.type === "email" || field.type === "phone" || field.type === "file_link") && (
                  <input
                    type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                    value={value}
                    onChange={e => {
                      setFormValues(prev => ({ ...prev, [fieldKey]: e.target.value }));
                      if (hasError) setFormErrors(prev => ({ ...prev, [fieldKey]: false }));
                    }}
                    placeholder={field.type === "email" ? "email@example.com" : field.type === "phone" ? "+1 (555) 000-0000" : field.type === "file_link" ? "Paste URL here..." : ""}
                    style={{ ...inputStyle, borderColor: hasError ? "#FF6B6B" : "#2A2A2A" }}
                    onFocus={e => e.target.style.borderColor = accent}
                    onBlur={e => { if (!hasError) e.target.style.borderColor = "#2A2A2A"; }}
                  />
                )}

                {field.type === "long_text" && (
                  <textarea
                    value={value}
                    onChange={e => {
                      setFormValues(prev => ({ ...prev, [fieldKey]: e.target.value }));
                      if (hasError) setFormErrors(prev => ({ ...prev, [fieldKey]: false }));
                    }}
                    rows={3}
                    style={{ ...textareaStyle, borderColor: hasError ? "#FF6B6B" : "#2A2A2A" }}
                    onFocus={e => e.target.style.borderColor = accent}
                    onBlur={e => { if (!hasError) e.target.style.borderColor = "#2A2A2A"; }}
                  />
                )}

                {field.type === "dropdown" && (
                  <select
                    value={value}
                    onChange={e => {
                      setFormValues(prev => ({ ...prev, [fieldKey]: e.target.value }));
                      if (hasError) setFormErrors(prev => ({ ...prev, [fieldKey]: false }));
                    }}
                    style={{ ...inputStyle, borderColor: hasError ? "#FF6B6B" : "#2A2A2A", appearance: "auto" }}
                  >
                    <option value="">Select...</option>
                    {(field.options ?? "").split(",").map(opt => opt.trim()).filter(Boolean).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {field.type === "multiple_choice" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(field.options ?? "").split(",").map(opt => opt.trim()).filter(Boolean).map(opt => (
                      <label key={opt} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#F0F0F0" }}>
                        <input
                          type="radio"
                          name={`field_${idx}`}
                          value={opt}
                          checked={value === opt}
                          onChange={() => {
                            setFormValues(prev => ({ ...prev, [fieldKey]: opt }));
                            if (hasError) setFormErrors(prev => ({ ...prev, [fieldKey]: false }));
                          }}
                          style={{ accentColor: accent }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}

                {field.type === "checkbox" && (
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#F0F0F0" }}>
                    <input
                      type="checkbox"
                      checked={value === "true"}
                      onChange={e => {
                        setFormValues(prev => ({ ...prev, [fieldKey]: e.target.checked ? "true" : "false" }));
                        if (hasError) setFormErrors(prev => ({ ...prev, [fieldKey]: false }));
                      }}
                      style={{ accentColor: accent, width: 18, height: 18 }}
                    />
                    {field.label}
                  </label>
                )}

                {field.type === "date" && (
                  <input
                    type="date"
                    value={value}
                    onChange={e => {
                      setFormValues(prev => ({ ...prev, [fieldKey]: e.target.value }));
                      if (hasError) setFormErrors(prev => ({ ...prev, [fieldKey]: false }));
                    }}
                    style={{ ...inputStyle, borderColor: hasError ? "#FF6B6B" : "#2A2A2A", colorScheme: "dark" }}
                  />
                )}

                {hasError && (
                  <div style={{ fontSize: 11, color: "#FF6B6B", marginTop: 4 }}>This field is required</div>
                )}
              </div>
            );
          })}

          <button
            onClick={() => {
              // Validate required fields
              const errors: Record<string, boolean> = {};
              let hasErrors = false;
              fields.forEach(field => {
                if (field.required) {
                  const val = formValues[field.label]?.trim();
                  if (!val || val === "false") {
                    errors[field.label] = true;
                    hasErrors = true;
                  }
                }
              });
              if (hasErrors) {
                setFormErrors(errors);
                return;
              }
              completeStep(step.id, { answers: formValues });
            }}
            disabled={stepSubmitting}
            style={{
              background: accent, color: "#0F0F0F", fontWeight: 600,
              padding: "12px 28px", borderRadius: 9, border: "none", cursor: "pointer",
              fontSize: 14, opacity: stepSubmitting ? 0.7 : 1, marginTop: 8,
              width: isMobile ? "100%" : "auto",
            }}
          >
            {stepSubmitting ? "Submitting..." : "Submit Form"}
          </button>
        </div>
      );
    }

    // ── AGREEMENT ──
    if (step.type === "agreement") {
      const fieldsObj = (step.fields && typeof step.fields === "object" && !Array.isArray(step.fields)) ? step.fields as Record<string, unknown> : {};
      const content = typeof fieldsObj.content === "string" ? fieldsObj.content : step.description || "Agreement content not available.";

      // Show signed state
      if (isCompleted && completionData) {
        const signedName = (completionData.fullName as string) ?? "Unknown";
        const signedAt = step.completedAt;
        return (
          <div style={{ padding: "16px 0", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: accent, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#0F0F0F", fontSize: 22, fontWeight: 900 }}>{"\u2713"}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#F0F0F0", marginBottom: 4 }}>Agreement Signed</div>
            <div style={{ fontSize: 13, color: "#A0A0A0" }}>
              Signed{signedAt ? ` on ${formatDate(signedAt)}` : ""} by <span style={{ color: accent }}>{signedName}</span>
            </div>
          </div>
        );
      }

      return (
        <div style={{ padding: "12px 0" }}>
          <div style={{
            background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 10,
            padding: 20, maxHeight: 300, overflowY: "auto", marginBottom: 16,
            fontSize: 13, color: "#C0C0C0", lineHeight: 1.7, whiteSpace: "pre-wrap",
          }}>
            {content}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", display: "block", marginBottom: 6 }}>
              Type your full legal name to sign <span style={{ color: "#FF6B6B" }}>*</span>
            </label>
            <input
              type="text"
              value={agreeName}
              onChange={e => setAgreeName(e.target.value)}
              placeholder="Full legal name"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = accent}
              onBlur={e => e.target.style.borderColor = "#2A2A2A"}
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 18 }}>
            <input
              type="checkbox"
              checked={agreeCheck}
              onChange={e => setAgreeCheck(e.target.checked)}
              style={{ accentColor: accent, width: 18, height: 18 }}
            />
            <span style={{ fontSize: 13, color: "#A0A0A0" }}>I have read and agree to the terms above</span>
          </label>

          <button
            onClick={() => completeStep(step.id, { fullName: agreeName })}
            disabled={stepSubmitting || !agreeName.trim() || !agreeCheck}
            style={{
              background: accent, color: "#0F0F0F", fontWeight: 600,
              padding: "12px 28px", borderRadius: 9, border: "none", cursor: "pointer",
              fontSize: 14, opacity: (stepSubmitting || !agreeName.trim() || !agreeCheck) ? 0.5 : 1,
              width: isMobile ? "100%" : "auto",
            }}
          >
            {stepSubmitting ? "Signing..." : "Sign Agreement"}
          </button>
        </div>
      );
    }

    // ── TASK ──
    if (step.type === "task") {
      if (isCompleted) {
        return (
          <div style={{ padding: "16px 0", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: accent, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#0F0F0F", fontSize: 22, fontWeight: 900 }}>{"\u2713"}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#F0F0F0", marginBottom: 4 }}>Task Completed</div>
            {step.completedAt && <div style={{ fontSize: 12, color: "#A0A0A0" }}>Completed {daysAgo(step.completedAt)}</div>}
          </div>
        );
      }

      return (
        <div style={{ padding: "12px 0" }}>
          {step.description && (
            <div style={{ fontSize: 14, color: "#A0A0A0", lineHeight: 1.6, marginBottom: 16 }}>{step.description}</div>
          )}
          <button
            onClick={() => completeStep(step.id, {})}
            disabled={stepSubmitting}
            style={{
              background: accent, color: "#0F0F0F", fontWeight: 600,
              padding: "12px 28px", borderRadius: 9, border: "none", cursor: "pointer",
              fontSize: 14, opacity: stepSubmitting ? 0.7 : 1,
              width: isMobile ? "100%" : "auto",
            }}
          >
            {stepSubmitting ? "Completing..." : "Mark as Complete"}
          </button>
        </div>
      );
    }

    // ── CHECKIN ──
    if (step.type === "checkin") {
      if (isCompleted && completionData) {
        const ans = completionData as Record<string, string>;
        return (
          <div style={{ padding: "12px 0" }}>
            <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginBottom: 10 }}>Submitted Check-in</div>
            {ans.completed ? <div style={{ marginBottom: 6 }}><span style={{ fontSize: 11, color: "#606060" }}>Completed:</span> <span style={{ fontSize: 13, color: "#A0A0A0" }}>{ans.completed}</span></div> : null}
            {ans.stuck ? <div style={{ marginBottom: 6 }}><span style={{ fontSize: 11, color: "#606060" }}>Stuck on:</span> <span style={{ fontSize: 13, color: "#A0A0A0" }}>{ans.stuck}</span></div> : null}
            {ans.confidence ? <div style={{ marginBottom: 6 }}><span style={{ fontSize: 11, color: "#606060" }}>Confidence:</span> <span style={{ fontSize: 13, color: "#A0A0A0" }}>{String(ans.confidence)}/10</span></div> : null}
            {ans.nextAction ? <div><span style={{ fontSize: 11, color: "#606060" }}>Next action:</span> <span style={{ fontSize: 13, color: "#A0A0A0" }}>{ans.nextAction}</span></div> : null}
          </div>
        );
      }

      return (
        <div style={{ padding: "12px 0" }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", display: "block", marginBottom: 6 }}>What did you complete?</label>
            <textarea value={checkinCompleted} onChange={e => setCheckinCompleted(e.target.value)} rows={2} placeholder="List what you finished since your last update..." style={textareaStyle}
              onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", display: "block", marginBottom: 6 }}>What are you stuck on?</label>
            <textarea value={checkinStuck} onChange={e => setCheckinStuck(e.target.value)} rows={2} placeholder="Anything blocking your progress?" style={textareaStyle}
              onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", display: "block", marginBottom: 6 }}>
              Confidence: <span style={{ color: accent, fontWeight: 700 }}>{checkinConfidence}/10</span>
            </label>
            <input type="range" min={1} max={10} value={checkinConfidence} onChange={e => setCheckinConfidence(Number(e.target.value))} style={{ width: "100%", accentColor: accent }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#505050" }}>
              <span>Not confident</span><span>Very confident</span>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", display: "block", marginBottom: 6 }}>What is your next action?</label>
            <textarea value={checkinNextAction} onChange={e => setCheckinNextAction(e.target.value)} rows={2} placeholder="What will you do next?" style={textareaStyle}
              onFocus={e => e.target.style.borderColor = accent} onBlur={e => e.target.style.borderColor = "#2A2A2A"} />
          </div>
          <button
            onClick={() => completeStep(step.id, { answers: { completed: checkinCompleted, stuck: checkinStuck, confidence: checkinConfidence, nextAction: checkinNextAction } })}
            disabled={stepSubmitting || !checkinCompleted.trim()}
            style={{
              background: accent, color: "#0F0F0F", fontWeight: 600,
              padding: "12px 28px", borderRadius: 9, border: "none", cursor: "pointer",
              fontSize: 14, opacity: (stepSubmitting || !checkinCompleted.trim()) ? 0.5 : 1,
              width: isMobile ? "100%" : "auto",
            }}
          >
            {stepSubmitting ? "Submitting..." : "Submit Update"}
          </button>
        </div>
      );
    }

    // ── DOCUMENT ──
    if (step.type === "document") {
      if (isCompleted && completionData) {
        const url = (completionData.fileUrl as string) ?? "";
        return (
          <div style={{ padding: "12px 0" }}>
            <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginBottom: 8 }}>Document Submitted</div>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: accent, textDecoration: "underline" }}>
                View submitted document
              </a>
            )}
          </div>
        );
      }

      return (
        <div style={{ padding: "12px 0" }}>
          {step.description && (
            <div style={{ fontSize: 14, color: "#A0A0A0", lineHeight: 1.6, marginBottom: 14 }}>{step.description}</div>
          )}
          <label style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", display: "block", marginBottom: 6 }}>
            Paste a link to your document (Google Drive, Dropbox, etc.)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="url"
              value={docLink}
              onChange={e => setDocLink(e.target.value)}
              placeholder="https://..."
              style={{ ...inputStyle, flex: 1 }}
              onFocus={e => e.target.style.borderColor = accent}
              onBlur={e => e.target.style.borderColor = "#2A2A2A"}
            />
            <button
              onClick={() => completeStep(step.id, { fileUrl: docLink })}
              disabled={stepSubmitting || !docLink.trim()}
              style={{
                background: accent, color: "#0F0F0F", fontWeight: 600,
                padding: "12px 20px", borderRadius: 9, border: "none", cursor: "pointer",
                fontSize: 14, flexShrink: 0,
                opacity: (stepSubmitting || !docLink.trim()) ? 0.5 : 1,
              }}
            >
              {stepSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      );
    }

    // ── RESOURCE ──
    if (step.type === "resource") {
      const fieldsObj = (step.fields && typeof step.fields === "object" && !Array.isArray(step.fields)) ? step.fields as Record<string, unknown> : {};
      const url = (typeof fieldsObj.url === "string" ? fieldsObj.url : null) || (step.description?.startsWith("http") ? step.description : null);

      return (
        <div style={{ padding: "12px 0" }}>
          {step.description && !step.description.startsWith("http") && (
            <div style={{ fontSize: 14, color: "#A0A0A0", lineHeight: 1.6, marginBottom: 14 }}>{step.description}</div>
          )}
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-block", background: `${accent}15`, border: `1px solid ${accent}30`,
              color: accent, fontWeight: 600, padding: "10px 22px", borderRadius: 9,
              textDecoration: "none", fontSize: 14,
            }}>
              Open Resource {"\u2197"}
            </a>
          )}
          <div style={{ marginTop: 10, fontSize: 12, color: "#505050" }}>
            {step.completed ? "Viewed" : "Auto-completing..."}
          </div>
        </div>
      );
    }

    // Fallback
    return (
      <div style={{ padding: "12px 0", fontSize: 13, color: "#606060" }}>
        {isCompleted ? "This step has been completed." : "Interact with this step through your program."}
      </div>
    );
  }

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
          <div style={{ fontSize: 28, marginBottom: 16 }}>{"\u{1F50D}"}</div>
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
    { id: "home" as const,      label: "Home",      icon: "\u2302" },
    { id: "documents" as const, label: `Documents${pendingDocs > 0 ? ` (${pendingDocs})` : ""}`, icon: "\u{1F4CE}" },
    { id: "updates" as const,   label: "Updates",    icon: "\u{1F4CA}" },
    { id: "resources" as const, label: "Resources",  icon: "\u{1F4C1}" },
  ];

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
                <p style={{ color: "#606060", margin: "0 0 16px", fontSize: 14 }}>{program.name}{program.duration ? ` \u00B7 ${program.duration}` : ""}</p>
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
            {currentStep && !allComplete && (
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
                    {STEP_ICON[currentStep.type] ?? "\u{1F4CC}"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#505050", marginBottom: 4 }}>Step {currentStep.position} of {progressSteps.length}</div>
                    <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, color: "#F0F0F0", marginBottom: 4 }}>{currentStep.title}</div>
                    {currentStep.description && <div style={{ fontSize: isMobile ? 13 : 14, color: "#A0A0A0", lineHeight: 1.5, marginBottom: 14 }}>{currentStep.description}</div>}
                    <button
                      onClick={() => {
                        // Simple types: complete inline
                        if (currentStep.type === "task") {
                          completeStep(currentStep.id, {});
                        } else if (currentStep.type === "resource") {
                          // Resource auto-completes, just open the URL
                          const fieldsObj = (currentStep.fields && typeof currentStep.fields === "object" && !Array.isArray(currentStep.fields)) ? currentStep.fields as Record<string, unknown> : {};
                          const url = (typeof fieldsObj.url === "string" ? fieldsObj.url : null) || (currentStep.description?.startsWith("http") ? currentStep.description : null);
                          if (url) window.open(url, "_blank");
                        } else {
                          // Complex types: scroll to journey section and expand
                          setExpandedStepId(currentStep.id);
                          scrollToJourney();
                        }
                      }}
                      disabled={stepSubmitting}
                      style={{
                        background: accent, color: "#0F0F0F", fontWeight: 600,
                        padding: isMobile ? "12px 20px" : "11px 24px", borderRadius: 9, border: "none", cursor: "pointer",
                        fontSize: 14, opacity: stepSubmitting ? 0.7 : 1, transition: "opacity 0.15s",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      {stepSubmitting && stepCompleted !== currentStep.id ? "Processing..." : (STEP_ACTION[currentStep.type] ?? "Continue")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* All Complete Celebration */}
            {allComplete && progressSteps.length > 0 && (
              <div style={{
                background: "#161616", border: `2px solid ${accent}40`, borderRadius: 16,
                padding: "32px 24px", marginBottom: 24, textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{"\u{1F389}"}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#F0F0F0", marginBottom: 6 }}>You&apos;ve completed your onboarding!</div>
                <div style={{ color: "#A0A0A0", fontSize: 14 }}>Your account manager has been notified.</div>
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
            {progressSteps.length > 0 && (
              <div ref={journeyRef} style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0", marginBottom: 16 }}>Your Onboarding Journey</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {progressSteps.map((step, i) => {
                    const isDone = step.completed;
                    const isCurrent = !isDone && currentStep?.id === step.id;
                    const isUpcoming = !isDone && !isCurrent;
                    const isExpanded = expandedStepId === step.id;
                    const canExpand = isDone || isCurrent;

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
                              <span style={{ color: "#0F0F0F", fontSize: 14, fontWeight: 900 }}>{"\u2713"}</span>
                            ) : isCurrent ? (
                              <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent }} />
                            ) : (
                              <span style={{ color: "#3A3A3A", fontSize: 11, fontWeight: 700 }}>{step.position}</span>
                            )}
                          </div>
                          {i < progressSteps.length - 1 && (
                            <div style={{ width: 2, flex: 1, background: isDone ? `${accent}40` : "#2A2A2A", minHeight: 20 }} />
                          )}
                        </div>

                        {/* Step content */}
                        <div style={{
                          flex: 1, marginLeft: 10, marginBottom: 8, padding: isExpanded ? "14px 18px" : "10px 16px",
                          borderRadius: 10,
                          background: isExpanded ? "#161616" : isCurrent ? "#161616" : "transparent",
                          border: isExpanded ? `1px solid ${accent}30` : isCurrent ? `1px solid ${accent}30` : "1px solid transparent",
                          opacity: isUpcoming ? 0.5 : 1, transition: "all 0.2s",
                          cursor: canExpand ? "pointer" : "default",
                        }}>
                          <div
                            onClick={() => {
                              if (!canExpand) return;
                              setExpandedStepId(isExpanded ? null : step.id);
                              // Reset form state on collapse/switch
                              setFormValues({});
                              setFormErrors({});
                              setAgreeName("");
                              setAgreeCheck(false);
                              setDocLink("");
                              setCheckinCompleted("");
                              setCheckinStuck("");
                              setCheckinConfidence(7);
                              setCheckinNextAction("");
                            }}
                            style={{ cursor: canExpand ? "pointer" : "default" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <span style={{ fontSize: 15 }}>{STEP_ICON[step.type] ?? "\u{1F4CC}"}</span>
                              <span style={{ fontSize: 14, fontWeight: 500, color: isDone ? "#606060" : "#F0F0F0", textDecoration: isDone ? "line-through" : "none", flex: 1 }}>
                                {step.title}
                              </span>
                              {canExpand && (
                                <span style={{ fontSize: 11, color: "#505050", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                                  {"\u25BC"}
                                </span>
                              )}
                            </div>
                            {step.description && !isUpcoming && !isExpanded && (
                              <div style={{ fontSize: 12, color: "#606060", marginTop: 2, marginLeft: 23 }}>{step.description}</div>
                            )}
                            <div style={{ fontSize: 11, color: "#505050", marginTop: 4, marginLeft: 23 }}>
                              {isDone ? (
                                <span style={{ color: accent }}>Completed{step.completedAt ? ` ${daysAgo(step.completedAt)}` : ""}</span>
                              ) : isCurrent ? (
                                <span style={{ color: accent }}>In Progress</span>
                              ) : (
                                <span>Upcoming</span>
                              )}
                            </div>
                          </div>

                          {/* Expanded form content */}
                          {isExpanded && canExpand && (
                            <div style={{ marginTop: 12, borderTop: "1px solid #2A2A2A", paddingTop: 12 }}>
                              {renderStepForm(step)}
                            </div>
                          )}
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
                      <span style={{ color: accent, fontSize: 12 }}>{"\u2713"}</span>
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
                <div style={{ fontSize: 28, marginBottom: 10 }}>{"\u{1F4C4}"}</div>
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
                              <span style={{ color: "#0F0F0F", fontSize: 14, fontWeight: 900 }}>{"\u2713"}</span>
                            </div>
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1E1E1E", border: "2px solid #3A3A3A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ fontSize: 13 }}>{"\u{1F4CE}"}</span>
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
                <div style={{ fontSize: 36, marginBottom: 12 }}>{"\u{1F389}"}</div>
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
                <div style={{ fontSize: 28, marginBottom: 10 }}>{"\u{1F4C1}"}</div>
                <div style={{ fontWeight: 500, color: "#F0F0F0", marginBottom: 4 }}>No resources yet</div>
                <div style={{ color: "#606060", fontSize: 13 }}>Resources will appear here as they are added to your program.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                {resourceSteps.map(step => {
                  const fieldsObj = (step.fields && typeof step.fields === "object" && !Array.isArray(step.fields)) ? step.fields as Record<string, unknown> : {};
                  const url = (typeof fieldsObj.url === "string" ? fieldsObj.url : null) || (step.description?.startsWith("http") ? step.description : null);
                  return (
                    <div key={step.id} style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 14, padding: isMobile ? 16 : 22 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 22 }}>{"\u{1F4C1}"}</span>
                        <div style={{ fontWeight: 500, fontSize: 15, color: "#F0F0F0" }}>{step.title}</div>
                      </div>
                      {step.description && !step.description.startsWith("http") && (
                        <div style={{ fontSize: 13, color: "#A0A0A0", lineHeight: 1.5, marginBottom: 14 }}>{step.description}</div>
                      )}
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{
                          display: "inline-block", background: `${accent}15`, border: `1px solid ${accent}30`,
                          color: accent, fontWeight: 600, padding: "8px 18px", borderRadius: 8,
                          textDecoration: "none", fontSize: 13,
                        }}>View Resource</a>
                      )}
                    </div>
                  );
                })}
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
        {!ws?.hideBranding && <span>Powered by <span style={{ color: "#505050", fontWeight: 600 }}>ClientFlow</span> {"\u00B7"} </span>}
        <span>&copy; {new Date().getFullYear()}</span>
      </footer>
      )}
    </div>
  );
}
