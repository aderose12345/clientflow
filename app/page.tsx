"use client";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LandingPage from "./LandingPage";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/auth/role")
      .then(r => r.json())
      .then(d => {
        if (d.role === "client") {
          router.replace("/portal");
        } else {
          router.replace("/dashboard");
        }
      })
      .catch(() => router.replace("/dashboard"));
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) return <div style={{ minHeight: "100vh", background: "#0F0F0F" }} />;
  if (isSignedIn) return <div style={{ minHeight: "100vh", background: "#0F0F0F" }} />;

  return <LandingPage />;
}
