"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type InviteData = {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  logoUrl: string | null;
  brandColor: string;
  programName: string | null;
};

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);

  useEffect(() => {
    if (!token) { setError("No invite token provided"); setLoading(false); return; }
    fetch(`/api/invite?token=${token}`)
      .then(r => {
        if (r.status === 410) { setExpired(true); setLoading(false); return null; }
        if (!r.ok) throw new Error("Invalid invite");
        return r.json();
      })
      .then(d => { if (d) setInvite(d); setLoading(false); })
      .catch(() => { setError("This invite link is invalid or has expired."); setLoading(false); });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    if (password.length < 8) { setSubmitError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setSubmitError("Passwords do not match"); return; }

    setSubmitting(true);

    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to create account");
        setSubmitting(false);
        return;
      }

      if (data.existingAccount) {
        setExistingAccount(true);
        setSuccess(true);
        setSubmitting(false);
        return;
      }

      // Account created — redirect to sign-in page
      setSuccess(true);
      setTimeout(() => router.push("/sign-in"), 2000);
      setSubmitting(false);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const accent = invite?.brandColor || "#C8F04A";

  // Loading
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F0F0F" }}>
        <div style={{ color: "#A0A0A0", fontSize: 14 }}>Loading invitation...</div>
      </div>
    );
  }

  // Error
  if (error || !token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F0F0F" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>😕</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "#F0F0F0", marginBottom: 8 }}>Invalid Invite</h2>
          <p style={{ color: "#A0A0A0", marginBottom: 24, lineHeight: 1.6 }}>{error || "No invite token provided."}</p>
          <a href="/sign-in" style={{ color: "#C8F04A", fontSize: 14 }}>Go to Sign In</a>
        </div>
      </div>
    );
  }

  // Already accepted
  if (expired) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F0F0F" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "#F0F0F0", marginBottom: 8 }}>Already Accepted</h2>
          <p style={{ color: "#A0A0A0", marginBottom: 24, lineHeight: 1.6 }}>This invite has already been accepted. Sign in to access your portal.</p>
          <a href="/sign-in" style={{
            display: "inline-block", background: "#C8F04A", color: "#0F0F0F", fontWeight: 700,
            padding: "12px 28px", borderRadius: 8, textDecoration: "none", fontSize: 14,
          }}>Sign In</a>
        </div>
      </div>
    );
  }

  // Success
  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F0F0F" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: "#F0F0F0", marginBottom: 8 }}>Account Created!</h2>
          {existingAccount ? (
            <>
              <p style={{ color: "#A0A0A0", marginBottom: 24, lineHeight: 1.6 }}>
                You already have an account. Sign in to access your portal.
              </p>
              <a href="/sign-in" style={{
                display: "inline-block", background: accent, color: "#0F0F0F", fontWeight: 700,
                padding: "14px 32px", borderRadius: 8, textDecoration: "none", fontSize: 15,
              }}>Sign In</a>
            </>
          ) : (
            <p style={{ color: "#A0A0A0", lineHeight: 1.6 }}>
              Signing you in and redirecting to your portal...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Invite form
  return (
    <div style={{
      minHeight: "100vh", background: "#0F0F0F", color: "#F0F0F0",
      fontFamily: "system-ui, -apple-system, sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ maxWidth: 440, width: "100%", padding: "0 24px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {invite?.logoUrl ? (
            <img src={invite.logoUrl} alt="Logo" style={{ height: 48, borderRadius: 10, marginBottom: 16 }} />
          ) : (
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: accent,
              margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontWeight: 900, color: "#0F0F0F", fontSize: 22 }}>
                {invite?.businessName?.charAt(0).toUpperCase() ?? "C"}
              </span>
            </div>
          )}
          <h1 style={{ fontSize: 24, fontWeight: 300, marginBottom: 6, letterSpacing: "-0.02em" }}>
            Welcome, <span style={{ fontWeight: 600, color: accent }}>{invite?.firstName}</span>!
          </h1>
          <p style={{ color: "#A0A0A0", margin: 0, fontSize: 15, lineHeight: 1.5 }}>
            <strong style={{ color: "#F0F0F0" }}>{invite?.businessName}</strong> has invited you to their client portal
            {invite?.programName && <> for the <strong style={{ color: "#F0F0F0" }}>{invite.programName}</strong> program</>}.
          </p>
        </div>

        {/* Form */}
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 14, padding: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#F0F0F0", marginBottom: 20 }}>Create Your Account</div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={invite?.email ?? ""}
                readOnly
                style={{
                  width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#606060",
                  borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Create Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
                style={{
                  width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F0F0F0",
                  borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                style={{
                  width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F0F0F0",
                  borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {submitError && (
              <div style={{ color: "#FF6B6B", fontSize: 13, marginBottom: 14, padding: "8px 12px", background: "rgba(255,107,107,0.08)", borderRadius: 8 }}>
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !password || !confirm}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 10, border: "none",
                background: password && confirm ? accent : "#2A2A2A",
                color: password && confirm ? "#0F0F0F" : "#606060",
                fontWeight: 700, fontSize: 15,
                cursor: password && confirm ? "pointer" : "not-allowed",
                opacity: submitting ? 0.7 : 1, transition: "all 0.15s",
              }}
            >
              {submitting ? "Creating Account..." : "Create My Account"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <p style={{ color: "#505050", fontSize: 12 }}>
              Already have an account? <a href="/sign-in" style={{ color: accent, textDecoration: "none" }}>Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F0F0F" }}>
        <div style={{ color: "#A0A0A0", fontSize: 14 }}>Loading...</div>
      </div>
    }>
      <AcceptInviteForm />
    </Suspense>
  );
}
