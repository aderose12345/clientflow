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
  console.log("[email] sendClientInvite called with:", {
    toEmail,
    toName,
    coachName,
    businessName,
    programName,
  });

  if (!process.env.RESEND_API_KEY) {
    console.error("[email] RESEND_API_KEY is NOT set — email will NOT be sent");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  console.log("[email] RESEND_API_KEY is set, length:", process.env.RESEND_API_KEY.length);

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/sign-up?redirect_url=/portal&email=${encodeURIComponent(toEmail)}`;

  console.log("[email] Sending invite email to:", toEmail, "with inviteUrl:", inviteUrl);

  try {
    const result = await resend.emails.send({
      from: "ClientFlow <hello@clientflow.name>",
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

    console.log("[email] Resend API response:", JSON.stringify(result));
    return { success: true, data: result };
  } catch (err) {
    console.error("[email] Resend API error:", err);
    return { success: false, error: String(err) };
  }
}

export async function sendAgencyNotification({
  toEmail,
  clientName,
  stepTitle,
  programName,
}: {
  toEmail: string;
  clientName: string;
  stepTitle: string;
  programName: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    await resend.emails.send({
      from: `ClientFlow <hello@clientflow.name>`,
      to: toEmail,
      subject: `${clientName} just completed: ${stepTitle}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0F0F0F;color:#F0F0F0;padding:40px;border-radius:12px;">
          <div style="margin-bottom:24px;">
            <span style="background:#C8F04A;color:#0F0F0F;font-weight:900;font-size:18px;padding:6px 14px;border-radius:6px;">CF</span>
          </div>
          <h2 style="font-size:20px;font-weight:600;margin:0 0 12px;color:#C8F04A;">Step Completed!</h2>
          <p style="color:#A0A0A0;margin:0 0 20px;line-height:1.6;">
            <strong style="color:#F0F0F0;">${clientName}</strong> just completed a step in their onboarding journey.
          </p>
          <div style="background:#161616;border:1px solid #2A2A2A;border-radius:10px;padding:16px;margin-bottom:20px;">
            <div style="color:#606060;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Step</div>
            <div style="color:#F0F0F0;font-size:15px;font-weight:500;">${stepTitle}</div>
            <div style="color:#606060;font-size:12px;margin-top:6px;">Program: ${programName}</div>
            <div style="color:#606060;font-size:12px;margin-top:2px;">Completed: ${new Date().toLocaleString()}</div>
          </div>
          <a href="${appUrl}/dashboard" style="display:inline-block;background:#C8F04A;color:#0F0F0F;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">
            View Progress →
          </a>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] Agency notification failed:", err);
  }
}

export async function sendAutomationEmail({
  toEmail,
  subject,
  bodyHtml,
  brandColor,
  logoUrl,
}: {
  toEmail: string;
  subject: string;
  bodyHtml: string;
  brandColor?: string;
  logoUrl?: string | null;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const accent = brandColor || "#C8F04A";

  try {
    await resend.emails.send({
      from: "ClientFlow <hello@clientflow.name>",
      to: toEmail,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0F0F0F;color:#F0F0F0;padding:40px;border-radius:12px;">
          <div style="margin-bottom:24px;">
            ${logoUrl
              ? `<img src="${logoUrl}" alt="Logo" style="height:36px;border-radius:6px;" />`
              : `<span style="background:${accent};color:#0F0F0F;font-weight:900;font-size:18px;padding:6px 14px;border-radius:6px;">CF</span>`
            }
          </div>
          <div style="color:#F0F0F0;font-size:15px;line-height:1.6;margin-bottom:24px;">
            ${bodyHtml}
          </div>
          <a href="${appUrl}/portal" style="display:inline-block;background:${accent};color:#0F0F0F;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">
            View Portal →
          </a>
          <p style="color:#505050;font-size:11px;margin-top:32px;">
            This is an automated message from ClientFlow.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] Automation email failed:", err);
  }
}
