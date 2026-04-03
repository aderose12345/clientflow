"use client";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F0F0F",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <SignIn routing="hash" fallbackRedirectUrl="/dashboard" />
    </div>
  );
}