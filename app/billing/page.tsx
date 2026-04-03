"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Workspace = {
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

const FEATURES = [
  "Unlimited clients",
  "Unlimited programs",
  "Client portal with branding",
  "Progress update templates",
  "Full automation suite",
  "Intake forms & agreements",
  "Task & milestone tracking",
  "Email notifications",
  "Priority support",
];

export default function BillingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0F0F0F" }} />}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";

  const [workspace, setWorkspace]     = useState<Workspace | null>(null);
  const [loading, setLoading]         = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    // Block portal clients from seeing billing — redirect them back
    fetch("/api/portal/me")
      .then(r => { if (r.ok) router.replace("/portal"); })
      .catch(() => {});

    fetch("/api/workspace")
      .then(r => r.json())
      .then(d => setWorkspace(d.workspace))
      .finally(() => setLoading(false));
  }, [router]);

  async function startCheckout() {
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    if (!priceId) {
      alert("Stripe is not configured yet. Add NEXT_PUBLIC_STRIPE_PRICE_ID to your environment.");
      return;
    }
    setCheckingOut(true);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });
    const data = await res.json();
    setCheckingOut(false);
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error ?? "Failed to start checkout");
    }
  }

  const isPaid = workspace?.subscriptionStatus && workspace.subscriptionStatus !== "trial";

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F0F", color: "#F0F0F0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <header style={{
        background: "#161616", borderBottom: "1px solid #2A2A2A",
        padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: "#C8F04A",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontWeight: 900, color: "#0F0F0F", fontSize: 16 }}>C</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>ClientFlow</span>
        </div>
        <button onClick={() => router.push("/dashboard")} style={{
          background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0",
          padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
        }}>← Back to Dashboard</button>
      </header>

      <div style={{ maxWidth: 540, margin: "0 auto", padding: "48px 24px" }}>
        {/* Success banner */}
        {success && (
          <div style={{
            background: "rgba(200,240,74,0.08)", border: "1px solid rgba(200,240,74,0.2)",
            borderRadius: 12, padding: "16px 24px", marginBottom: 32,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>🎉</span>
            <div>
              <div style={{ fontWeight: 600, color: "#C8F04A", marginBottom: 2 }}>Welcome aboard!</div>
              <div style={{ fontSize: 13, color: "#A0A0A0" }}>Your subscription is now active. Enjoy ClientFlow!</div>
            </div>
          </div>
        )}

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 300, marginBottom: 8, letterSpacing: "-0.02em" }}>
            Upgrade to <span style={{ color: "#C8F04A", fontWeight: 600 }}>ClientFlow Pro</span>
          </h1>
          <p style={{ color: "#A0A0A0", fontSize: 16, margin: 0, lineHeight: 1.5 }}>
            Everything you need to run your business.
          </p>
          {!loading && workspace && (
            <div style={{ marginTop: 14 }}>
              <span style={{
                display: "inline-block", fontSize: 12, fontWeight: 600,
                padding: "4px 14px", borderRadius: 99,
                background: isPaid ? "rgba(200,240,74,0.1)" : "rgba(240,169,74,0.1)",
                color: isPaid ? "#C8F04A" : "#F0A94A",
                textTransform: "capitalize",
              }}>
                Current: {workspace.subscriptionStatus}
              </span>
            </div>
          )}
        </div>

        {/* Single Plan Card */}
        <div style={{
          background: "#161616",
          border: "2px solid #C8F04A",
          borderRadius: 16, padding: 36,
          position: "relative",
        }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 6, letterSpacing: "-0.01em" }}>ClientFlow Pro</div>
            <div style={{ color: "#A0A0A0", fontSize: 14 }}>Full access to everything</div>
          </div>

          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <span style={{ fontSize: 48, fontWeight: 200, letterSpacing: "-0.03em" }}>$137</span>
            <span style={{ color: "#606060", fontSize: 16 }}>/mo</span>
          </div>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0" }}>
            {FEATURES.map(f => (
              <li key={f} style={{
                padding: "7px 0", fontSize: 14, color: "#A0A0A0",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ color: "#C8F04A", fontSize: 13, flexShrink: 0 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={startCheckout}
            disabled={checkingOut}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 10, border: "none",
              cursor: checkingOut ? "not-allowed" : "pointer",
              fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em",
              background: "#C8F04A", color: "#0F0F0F",
              opacity: checkingOut ? 0.7 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {checkingOut ? "Redirecting to Stripe..." : isPaid ? "Manage Subscription" : "Get Started"}
          </button>
        </div>

        {/* Note */}
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <p style={{ color: "#606060", fontSize: 13 }}>
            Cancel anytime. Prices in USD.
          </p>
          <p style={{ color: "#3A3A3A", fontSize: 12, marginTop: 8 }}>
            Payments powered by Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}
