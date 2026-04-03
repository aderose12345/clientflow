"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Workspace = {
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

const PLANS = [
  {
    name: "Starter",
    price: "$29",
    period: "/mo",
    description: "For solo coaches just getting started",
    features: [
      "Up to 10 active clients",
      "1 program",
      "Client portal",
      "Task & milestone tracking",
      "Email notifications",
    ],
    priceEnv: "NEXT_PUBLIC_STRIPE_PRICE_STARTER",
    accent: false,
  },
  {
    name: "Growth",
    price: "$59",
    period: "/mo",
    description: "For growing coaching businesses",
    features: [
      "Up to 50 active clients",
      "Unlimited programs",
      "Client portal",
      "Check-in templates",
      "Automation rules",
      "Priority support",
    ],
    priceEnv: "NEXT_PUBLIC_STRIPE_PRICE_GROWTH",
    accent: true,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/mo",
    description: "For agencies & high-volume practices",
    features: [
      "Unlimited clients",
      "Unlimited programs",
      "Client portal with branding",
      "Check-in templates",
      "Full automation suite",
      "Intake forms & agreements",
      "White-label portal",
      "Dedicated support",
    ],
    priceEnv: "NEXT_PUBLIC_STRIPE_PRICE_PRO",
    accent: false,
  },
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

  const [workspace, setWorkspace]   = useState<Workspace | null>(null);
  const [loading, setLoading]       = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workspace")
      .then(r => r.json())
      .then(d => setWorkspace(d.workspace))
      .finally(() => setLoading(false));
  }, []);

  async function startCheckout(priceEnvKey: string) {
    // Price IDs must be set as NEXT_PUBLIC_ env vars to be available client-side
    const envMap: Record<string, string | undefined> = {
      NEXT_PUBLIC_STRIPE_PRICE_STARTER: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER,
      NEXT_PUBLIC_STRIPE_PRICE_GROWTH:  process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH,
      NEXT_PUBLIC_STRIPE_PRICE_PRO:     process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    };
    const priceId = envMap[priceEnvKey];
    if (!priceId) {
      alert("Stripe price IDs are not configured yet. Add " + priceEnvKey + " to your .env file.");
      return;
    }
    setCheckingOut(priceEnvKey);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });
    const data = await res.json();
    setCheckingOut(null);
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

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
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
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: 32, fontWeight: 300, marginBottom: 8 }}>
            Choose your <span style={{ color: "#C8F04A", fontWeight: 600 }}>plan</span>
          </h1>
          <p style={{ color: "#A0A0A0", fontSize: 16, margin: 0 }}>
            Scale your coaching business with the right tools.
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

        {/* Plans */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {PLANS.map(plan => (
            <div key={plan.name} style={{
              background: "#161616",
              border: plan.accent ? "2px solid #C8F04A" : "1px solid #2A2A2A",
              borderRadius: 16, padding: 32,
              position: "relative",
              display: "flex", flexDirection: "column",
            }}>
              {plan.accent && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: "#C8F04A", color: "#0F0F0F", fontSize: 11, fontWeight: 700,
                  padding: "3px 14px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  Most Popular
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ color: "#606060", fontSize: 13 }}>{plan.description}</div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 42, fontWeight: 200 }}>{plan.price}</span>
                <span style={{ color: "#606060", fontSize: 14 }}>{plan.period}</span>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px 0", flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ padding: "5px 0", fontSize: 13, color: "#A0A0A0", display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ color: "#C8F04A", fontSize: 12, marginTop: 2, flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => startCheckout(plan.priceEnv)}
                disabled={checkingOut === plan.priceEnv}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
                  cursor: checkingOut === plan.priceEnv ? "not-allowed" : "pointer",
                  fontWeight: 600, fontSize: 14,
                  background: plan.accent ? "#C8F04A" : "transparent",
                  color: plan.accent ? "#0F0F0F" : "#C8F04A",
                  ...(plan.accent ? {} : { border: "1px solid rgba(200,240,74,0.3)" }),
                  opacity: checkingOut === plan.priceEnv ? 0.7 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {checkingOut === plan.priceEnv ? "Redirecting..." : isPaid ? "Change Plan" : "Get Started"}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ / note */}
        <div style={{ marginTop: 48, textAlign: "center" }}>
          <p style={{ color: "#606060", fontSize: 13 }}>
            All plans include a 14-day free trial. Cancel anytime. Prices in USD.
          </p>
          <p style={{ color: "#3A3A3A", fontSize: 12, marginTop: 8 }}>
            Payments powered by Stripe. Need a custom plan? Contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
