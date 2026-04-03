export async function sendClientInvite({
  toEmail,
  toName,
  coachName,
  businessName,
  programName,
}: {
  toEmail: string;
  toName: string;
  coachName: string;
  businessName: string;
  programName?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping invite email");
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/sign-up?redirect_url=/portal`;

  await resend.emails.send({
    from: "ClientFlow <onboarding@resend.dev>",
    to: toEmail,
    subject: `You've been invited to ${businessName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0F0F0F;color:#F0F0F0;padding:40px;border-radius:12px;">
        <div style="margin-bottom:24px;">
          <span style="background:#C8F04A;color:#0F0F0F;font-weight:900;font-size:18px;padding:6px 14px;border-radius:6px;">CF</span>
        </div>
        <h2 style="font-size:22px;font-weight:600;margin:0 0 8px;">Hi ${toName} 👋</h2>
        <p style="color:#A0A0A0;margin:0 0 24px;">
          ${coachName} from <strong style="color:#F0F0F0;">${businessName}</strong> has invited you to their client portal${programName ? ` for the <strong style="color:#F0F0F0;">${programName}</strong> program` : ""}.
        </p>
        <a href="${inviteUrl}" style="display:inline-block;background:#C8F04A;color:#0F0F0F;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:15px;">
          Access Your Portal →
        </a>
        <p style="color:#606060;font-size:12px;margin-top:32px;">
          Already have an account? <a href="${appUrl}/sign-in?redirect_url=/portal" style="color:#C8F04A;">Sign in here</a>.
        </p>
      </div>
    `,
  });
}
