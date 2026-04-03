"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { value: "marketing_agency", label: "Marketing Agency", icon: "📣" },
  { value: "insurance_agency", label: "Insurance Agency", icon: "🛡️" },
  { value: "sales_org",       label: "Sales Organization", icon: "💼" },
  { value: "coaching",        label: "Coaching Business", icon: "🎯" },
  { value: "consulting",      label: "Consulting Firm", icon: "📊" },
  { value: "other",           label: "Other", icon: "🏢" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]               = useState(1);
  const [businessType, setBusinessType] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [saving, setSaving]             = useState(false);
  const [ready, setReady]               = useState(false);

  useEffect(() => {
    fetch("/api/auth/role")
      .then(r => r.json())
      .then(d => { if (d.role === "client") router.replace("/portal"); else setReady(true); })
      .catch(() => setReady(true));
  }, [router]);

  async function submit() {
    if (!businessType || !businessName.trim()) return;
    setSaving(true);
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName, businessType }),
    });
    router.push("/dashboard");
  }

  if (!ready) return <div style={{ minHeight: "100vh", background: "#0F0F0F" }} />;

  return (
    <div style={{
      minHeight: "100vh", background: "#0F0F0F", color: "#F0F0F0",
      fontFamily: "system-ui, -apple-system, sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ maxWidth: 600, width: "100%", padding: "0 24px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: "#C8F04A",
            margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontWeight: 900, color: "#0F0F0F", fontSize: 22 }}>C</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 300, marginBottom: 6, letterSpacing: "-0.02em" }}>
            Welcome to <span style={{ fontWeight: 600, color: "#C8F04A" }}>ClientFlow</span>
          </h1>
          <p style={{ color: "#A0A0A0", margin: 0, fontSize: 15 }}>
            {step === 1 ? "What type of business are you?" : "What is your business name?"}
          </p>
        </div>

        {/* Step 1: Business Type */}
        {step === 1 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: typeof window !== "undefined" && window.innerWidth < 768 ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 32 }}>
              {TYPES.map(t => (
                <button key={t.value} onClick={() => setBusinessType(t.value)} style={{
                  background: businessType === t.value ? "rgba(200,240,74,0.08)" : "#161616",
                  border: businessType === t.value ? "2px solid #C8F04A" : "1px solid #2A2A2A",
                  borderRadius: 14, padding: "24px 16px", cursor: "pointer",
                  textAlign: "center", transition: "all 0.15s",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{t.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: businessType === t.value ? "#C8F04A" : "#A0A0A0" }}>
                    {t.label}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => businessType && setStep(2)}
              disabled={!businessType}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 10, border: "none",
                background: businessType ? "#C8F04A" : "#2A2A2A",
                color: businessType ? "#0F0F0F" : "#606060",
                fontWeight: 600, fontSize: 15, cursor: businessType ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
            >Continue</button>
          </div>
        )}

        {/* Step 2: Business Name */}
        {step === 2 && (
          <div>
            <input
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="Enter your business name"
              autoFocus
              style={{
                width: "100%", background: "#161616", border: "1px solid #2A2A2A",
                color: "#F0F0F0", borderRadius: 12, padding: "16px 20px",
                fontSize: 16, outline: "none", boxSizing: "border-box",
                marginBottom: 20, textAlign: "center",
              }}
              onFocus={e => e.target.style.borderColor = "#C8F04A"}
              onBlur={e => e.target.style.borderColor = "#2A2A2A"}
              onKeyDown={e => e.key === "Enter" && submit()}
            />
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, padding: "14px 0", borderRadius: 10,
                background: "transparent", border: "1px solid #2A2A2A",
                color: "#A0A0A0", fontWeight: 500, fontSize: 15, cursor: "pointer",
              }}>Back</button>
              <button
                onClick={submit}
                disabled={saving || !businessName.trim()}
                style={{
                  flex: 2, padding: "14px 0", borderRadius: 10, border: "none",
                  background: businessName.trim() ? "#C8F04A" : "#2A2A2A",
                  color: businessName.trim() ? "#0F0F0F" : "#606060",
                  fontWeight: 600, fontSize: 15,
                  cursor: businessName.trim() ? "pointer" : "not-allowed",
                  opacity: saving ? 0.7 : 1,
                }}
              >{saving ? "Setting up..." : "Get Started"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
