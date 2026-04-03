"use client";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F0F0F",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <SignUp routing="hash" fallbackRedirectUrl="/dashboard" />
    </div>
  );
}