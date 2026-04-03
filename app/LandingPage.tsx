"use client";
import Link from "next/link";

const ACCENT = "#C8F04A";

const PROBLEMS = [
  { title: "Clients ghost after signing", desc: "You close the deal but they never complete onboarding. Documents go missing. Calls get ignored. The deal falls apart." },
  { title: "You're chasing manually", desc: "Texting reminders, following up by email, checking spreadsheets. You're spending hours on admin instead of growing." },
  { title: "No visibility into who's at risk", desc: "You find out a client is about to cancel only after they tell you. By then it's too late to save the relationship." },
];

const FEATURES = [
  { icon: "📋", title: "Onboarding Flows", desc: "Build a step-by-step onboarding process your clients follow automatically. Forms, agreements, tasks, and resources all in one place." },
  { icon: "🖥️", title: "Client Portal", desc: "Every client gets their own branded portal showing exactly what they need to do next. Professional, clean, and easy to use." },
  { icon: "📊", title: "Progress Tracking", desc: "See every client's status in real time. Know who is on track, who needs attention, and who is at risk before they churn." },
  { icon: "⚡", title: "Automated Reminders", desc: "Stop chasing. Set up rules that automatically remind clients when something is overdue or when they go quiet." },
];

const AUDIENCES = ["Marketing Agencies", "Insurance Agents", "Sales Organizations", "Coaching Businesses", "Consulting Firms"];

const PLAN_FEATURES = [
  "Unlimited onboarding flows",
  "Client portal with your branding",
  "Progress tracking dashboard",
  "Automated reminders",
  "Document collection",
  "Team member access",
  "Priority support",
];

// TODO: Replace these placeholder testimonials with real ones
const TESTIMONIALS = [
  { name: "Sarah K.", role: "Marketing Agency Owner", text: "ClientFlow cut our client onboarding time in half. We used to lose 20% of new clients in the first month — now it's under 5%." },
  { name: "Marcus J.", role: "Insurance Agent", text: "I stopped chasing clients for documents. They just submit everything through the portal. It's been a game changer for my workflow." },
  { name: "Lisa R.", role: "Sales Team Lead", text: "We finally have visibility into every client's status. No more spreadsheets, no more guessing who needs follow-up." },
];

export default function LandingPage() {
  return (
    <div style={{ background: "#0F0F0F", color: "#F0F0F0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* ── Header / Nav ── */}
      <header style={{
        padding: "0 40px", height: 70, display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid #1A1A1A", position: "sticky", top: 0, background: "rgba(15,15,15,0.95)", backdropFilter: "blur(8px)", zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontWeight: 900, color: "#0F0F0F", fontSize: 16 }}>C</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>ClientFlow</span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="#features" style={{ color: "#A0A0A0", textDecoration: "none", fontSize: 14 }}>Features</a>
          <a href="#pricing" style={{ color: "#A0A0A0", textDecoration: "none", fontSize: 14 }}>Pricing</a>
          <Link href="/sign-in" style={{ color: "#A0A0A0", textDecoration: "none", fontSize: 14 }}>Sign In</Link>
          <Link href="/sign-up" style={{
            background: ACCENT, color: "#0F0F0F", fontWeight: 600,
            padding: "9px 20px", borderRadius: 8, textDecoration: "none", fontSize: 14,
          }}>Start Free Trial</Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section style={{
        padding: "100px 40px 80px", textAlign: "center", maxWidth: 820, margin: "0 auto",
        background: "radial-gradient(ellipse at center top, rgba(200,240,74,0.03) 0%, transparent 60%)",
      }}>
        <h1 style={{ fontSize: 52, fontWeight: 300, lineHeight: 1.15, marginBottom: 20, letterSpacing: "-0.03em" }}>
          Your clients said yes.<br /><span style={{ fontWeight: 600 }}>Now make sure they follow through.</span>
        </h1>
        <p style={{ fontSize: 18, color: "#A0A0A0", lineHeight: 1.6, maxWidth: 640, margin: "0 auto 36px" }}>
          ClientFlow is the post-sale onboarding and retention system for agencies, closers, and service businesses. Set up client journeys, track progress, and stop chasing people manually.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <Link href="/sign-up" style={{
            background: ACCENT, color: "#0F0F0F", fontWeight: 600,
            padding: "14px 32px", borderRadius: 10, textDecoration: "none", fontSize: 16,
          }}>Start Free Trial</Link>
          <a href="#features" style={{
            background: "transparent", color: "#A0A0A0",
            padding: "14px 32px", borderRadius: 10, textDecoration: "none", fontSize: 16,
            border: "1px solid #2A2A2A",
          }}>See How It Works</a>
        </div>
      </section>

      {/* ── Problem Section ── */}
      <section style={{ padding: "80px 40px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 300, textAlign: "center", marginBottom: 48, letterSpacing: "-0.02em" }}>
          The sale is just the <span style={{ fontWeight: 600 }}>beginning.</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {PROBLEMS.map(p => (
            <div key={p.title} style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 14, padding: 28 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10, color: "#F0F0F0" }}>{p.title}</div>
              <div style={{ color: "#A0A0A0", fontSize: 14, lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Solution / Features ── */}
      <section id="features" style={{ padding: "80px 40px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 300, textAlign: "center", marginBottom: 48, letterSpacing: "-0.02em" }}>
          One system for everything <span style={{ fontWeight: 600 }}>after the sale.</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 14, padding: 28 }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 8, color: "#F0F0F0" }}>{f.title}</div>
              <div style={{ color: "#A0A0A0", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who It's For ── */}
      <section style={{ padding: "80px 40px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 300, textAlign: "center", marginBottom: 48, letterSpacing: "-0.02em" }}>
          Built for businesses where <span style={{ fontWeight: 600 }}>follow-through matters.</span>
        </h2>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          {AUDIENCES.map(a => (
            <div key={a} style={{
              background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12,
              padding: "18px 28px", fontSize: 15, fontWeight: 500, color: "#A0A0A0",
            }}>{a}</div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: "80px 40px", maxWidth: 540, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 300, textAlign: "center", marginBottom: 48, letterSpacing: "-0.02em" }}>
          Simple pricing. <span style={{ fontWeight: 600 }}>No surprises.</span>
        </h2>
        <div style={{
          background: "#161616", border: "2px solid " + ACCENT,
          borderRadius: 18, padding: 40, textAlign: "center",
        }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>ClientFlow Pro</div>
          <div style={{ color: "#A0A0A0", fontSize: 14, marginBottom: 24 }}>Everything you need to onboard and retain clients</div>
          <div style={{ marginBottom: 28 }}>
            <span style={{ fontSize: 52, fontWeight: 200, letterSpacing: "-0.03em" }}>$137</span>
            <span style={{ color: "#606060", fontSize: 18 }}>/month</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 auto 32px", maxWidth: 320, textAlign: "left" }}>
            {PLAN_FEATURES.map(f => (
              <li key={f} style={{ padding: "7px 0", fontSize: 14, color: "#A0A0A0", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: ACCENT, fontSize: 13, flexShrink: 0 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/sign-up" style={{
            display: "inline-block", background: ACCENT, color: "#0F0F0F", fontWeight: 600,
            padding: "14px 40px", borderRadius: 10, textDecoration: "none", fontSize: 16,
          }}>Start Free Trial</Link>
          <div style={{ color: "#606060", fontSize: 13, marginTop: 14 }}>No credit card required to start</div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      {/* TODO: Replace placeholder testimonials with real ones */}
      <section style={{ padding: "80px 40px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 300, textAlign: "center", marginBottom: 48, letterSpacing: "-0.02em" }}>
          Trusted by <span style={{ fontWeight: 600 }}>service businesses</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 14, padding: 28 }}>
              <div style={{ color: "#A0A0A0", fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>&ldquo;{t.text}&rdquo;</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#F0F0F0" }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "#606060" }}>{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid #1A1A1A", padding: "40px",
        maxWidth: 1000, margin: "0 auto",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontWeight: 900, color: "#0F0F0F", fontSize: 14 }}>C</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>ClientFlow</span>
        </div>
        <nav style={{ display: "flex", gap: 24 }}>
          <a href="#features" style={{ color: "#606060", textDecoration: "none", fontSize: 13 }}>Features</a>
          <a href="#pricing" style={{ color: "#606060", textDecoration: "none", fontSize: 13 }}>Pricing</a>
          <Link href="/sign-in" style={{ color: "#606060", textDecoration: "none", fontSize: 13 }}>Sign In</Link>
          <Link href="/sign-up" style={{ color: "#606060", textDecoration: "none", fontSize: 13 }}>Sign Up</Link>
        </nav>
        <div style={{ color: "#3A3A3A", fontSize: 12 }}>
          &copy; 2024 ClientFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
