export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0F0F0F", color: "#F0F0F0", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {children}
    </div>
  );
}
