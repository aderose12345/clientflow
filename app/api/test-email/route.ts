import { NextResponse } from "next/server";

export async function GET() {
  console.log("[test-email] Route hit");

  const apiKey = process.env.RESEND_API_KEY;
  console.log("[test-email] RESEND_API_KEY set:", !!apiKey, "length:", apiKey?.length ?? 0);

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "RESEND_API_KEY is not set in environment variables",
        env_check: {
          RESEND_API_KEY: false,
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "(not set)",
        },
      },
      { status: 500 }
    );
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    console.log("[test-email] Calling resend.emails.send...");

    const result = await resend.emails.send({
      from: "ClientFlow <hello@clientflow.name>",
      to: "a.derose12345@gmail.com",
      subject: "ClientFlow Test Email",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0F0F0F;color:#F0F0F0;padding:40px;border-radius:12px;">
          <div style="margin-bottom:24px;">
            <span style="background:#C8F04A;color:#0F0F0F;font-weight:900;font-size:18px;padding:6px 14px;border-radius:6px;">CF</span>
          </div>
          <h2 style="font-size:22px;font-weight:600;margin:0 0 8px;">Test Email</h2>
          <p style="color:#A0A0A0;margin:0 0 24px;">
            If you're reading this, Resend is working correctly.
          </p>
          <p style="color:#606060;font-size:12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    console.log("[test-email] Resend response:", JSON.stringify(result));

    return NextResponse.json({
      success: true,
      message: "Test email sent to a.derose12345@gmail.com",
      resend_response: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[test-email] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: String(err),
        message: "Resend API call failed — check the API key and domain verification",
      },
      { status: 500 }
    );
  }
}
