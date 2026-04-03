import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAutomationEmail } from "@/lib/email";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function replacePlaceholders(
  template: string,
  clientName: string,
  businessName: string,
  portalLink: string
): string {
  return template
    .replace(/\[client_name\]/gi, clientName)
    .replace(/\[business_name\]/gi, businessName)
    .replace(/\[portal_link\]/gi, portalLink);
}

async function wasRecentlySent(
  workspaceId: string,
  clientId: string,
  ruleType: string,
  cooldownMs: number
): Promise<boolean> {
  const since = new Date(Date.now() - cooldownMs);
  const log = await prisma.automationLog.findFirst({
    where: { workspaceId, clientId, ruleType, sentAt: { gte: since } },
  });
  return !!log;
}

async function logSend(workspaceId: string, clientId: string, ruleType: string) {
  await prisma.automationLog.create({
    data: { workspaceId, clientId, ruleType },
  });
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const portalLink = `${appUrl}/portal`;
  const now = Date.now();
  let emailsSent = 0;
  let errCount = 0;

  // Fetch all workspaces with active rules and their clients
  const workspaces = await prisma.workspace.findMany({
    where: { automationRules: { some: { active: true } } },
    include: {
      automationRules: { where: { active: true } },
      clients: {
        include: {
          program: { include: { steps: { orderBy: { position: "asc" } } } },
          stepCompletions: true,
          tasks: true,
          checkInSubmissions: { orderBy: { submittedAt: "desc" }, take: 1 },
          formSubmissions: true,
          agreementAcceptances: true,
        },
      },
    },
  });

  for (const ws of workspaces) {
    const rules = ws.automationRules;
    const ruleMap = new Map(rules.map(r => [r.triggerType, r]));

    for (const client of ws.clients) {
      const clientName = `${client.firstName} ${client.lastName}`;
      const invitedMs = client.invitedAt ? now - new Date(client.invitedAt).getTime() : 0;
      const lastActiveMs = client.lastActivityAt ? now - new Date(client.lastActivityAt).getTime() : Infinity;

      try {
        // ── intake_not_submitted ──
        const intakeRule = ruleMap.get("intake_not_submitted");
        if (intakeRule && invitedMs > DAY) {
          const intakeStep = client.program?.steps.find(s => s.type === "intake_form");
          if (intakeStep) {
            const hasSubmission = client.stepCompletions.some(sc => sc.stepId === intakeStep.id);
            if (!hasSubmission) {
              const sent = await wasRecentlySent(ws.id, client.id, "intake_not_submitted", DAY);
              if (!sent) {
                const body = replacePlaceholders(intakeRule.messageTemplate, clientName, ws.businessName, portalLink);
                await sendAutomationEmail({
                  toEmail: client.email,
                  subject: `Reminder: Complete your intake form — ${ws.businessName}`,
                  bodyHtml: body,
                  brandColor: ws.brandColor,
                  logoUrl: ws.logoUrl,
                });
                await logSend(ws.id, client.id, "intake_not_submitted");
                emailsSent++;
              }
            }
          }
        }

        // ── agreement_not_signed ──
        const agreeRule = ruleMap.get("agreement_not_signed");
        if (agreeRule) {
          const agreeStep = client.program?.steps.find(s => s.type === "agreement");
          const intakeStep = client.program?.steps.find(s => s.type === "intake_form");
          if (agreeStep) {
            const intakeDone = !intakeStep || client.stepCompletions.some(sc => sc.stepId === intakeStep.id);
            const agreeDone = client.stepCompletions.some(sc => sc.stepId === agreeStep.id);
            if (intakeDone && !agreeDone && invitedMs > DAY) {
              const sent = await wasRecentlySent(ws.id, client.id, "agreement_not_signed", DAY);
              if (!sent) {
                const body = replacePlaceholders(agreeRule.messageTemplate, clientName, ws.businessName, portalLink);
                await sendAutomationEmail({
                  toEmail: client.email,
                  subject: `Reminder: Sign your agreement — ${ws.businessName}`,
                  bodyHtml: body,
                  brandColor: ws.brandColor,
                  logoUrl: ws.logoUrl,
                });
                await logSend(ws.id, client.id, "agreement_not_signed");
                emailsSent++;
              }
            }
          }
        }

        // ── task_overdue ──
        const taskRule = ruleMap.get("task_overdue");
        if (taskRule) {
          const overdueTasks = client.tasks.filter(
            t => t.status !== "complete" && t.dueDate && new Date(t.dueDate).getTime() < now
          );
          for (const task of overdueTasks) {
            const ruleKey = `task_overdue_${task.id}`;
            const sent = await wasRecentlySent(ws.id, client.id, ruleKey, DAY);
            if (!sent) {
              const body = replacePlaceholders(
                taskRule.messageTemplate,
                clientName,
                ws.businessName,
                portalLink
              ) + `<br/><br/><strong style="color:#F0F0F0;">Overdue task:</strong> ${task.title}`;
              await sendAutomationEmail({
                toEmail: client.email,
                subject: `Task overdue: ${task.title} — ${ws.businessName}`,
                bodyHtml: body,
                brandColor: ws.brandColor,
                logoUrl: ws.logoUrl,
              });
              await logSend(ws.id, client.id, ruleKey);
              emailsSent++;
            }
          }
        }

        // ── client_inactive_7d → email to OWNER ──
        const inactive7Rule = ruleMap.get("client_inactive_7d");
        if (inactive7Rule && ws.ownerEmail && lastActiveMs > 7 * DAY && client.status !== "churned") {
          const sent = await wasRecentlySent(ws.id, client.id, "client_inactive_7d", 7 * DAY);
          if (!sent) {
            const body = replacePlaceholders(inactive7Rule.messageTemplate, clientName, ws.businessName, portalLink);
            await sendAutomationEmail({
              toEmail: ws.ownerEmail,
              subject: `Client inactive: ${clientName} — 7+ days`,
              bodyHtml: `<strong style="color:#F0F0F0;">${clientName}</strong> has been inactive for over 7 days.<br/><br/>${body}`,
              brandColor: ws.brandColor,
              logoUrl: ws.logoUrl,
            });
            await logSend(ws.id, client.id, "client_inactive_7d");
            emailsSent++;
          }
        }

        // ── client_inactive_14d → email to OWNER ──
        const inactive14Rule = ruleMap.get("client_inactive_14d");
        if (inactive14Rule && ws.ownerEmail && lastActiveMs > 14 * DAY && client.status !== "churned") {
          const sent = await wasRecentlySent(ws.id, client.id, "client_inactive_14d", 7 * DAY);
          if (!sent) {
            const body = replacePlaceholders(inactive14Rule.messageTemplate, clientName, ws.businessName, portalLink);
            await sendAutomationEmail({
              toEmail: ws.ownerEmail,
              subject: `URGENT: ${clientName} inactive 14+ days`,
              bodyHtml: `<span style="color:#FF6B6B;font-weight:700;">URGENT:</span> <strong style="color:#F0F0F0;">${clientName}</strong> has been inactive for over 14 days.<br/><br/>${body}`,
              brandColor: ws.brandColor,
              logoUrl: ws.logoUrl,
            });
            await logSend(ws.id, client.id, "client_inactive_14d");
            emailsSent++;
          }
        }

        // ── weekly_checkin (missed) ──
        const checkinRule = ruleMap.get("weekly_checkin");
        if (checkinRule) {
          const hasCheckinStep = client.program?.steps.some(s => s.type === "checkin");
          if (hasCheckinStep) {
            const lastCheckin = client.checkInSubmissions[0];
            const lastCheckinMs = lastCheckin ? now - new Date(lastCheckin.submittedAt).getTime() : Infinity;
            if (lastCheckinMs > 7 * DAY) {
              const sent = await wasRecentlySent(ws.id, client.id, "weekly_checkin", 7 * DAY);
              if (!sent) {
                const body = replacePlaceholders(checkinRule.messageTemplate, clientName, ws.businessName, portalLink);
                await sendAutomationEmail({
                  toEmail: client.email,
                  subject: `Time for your progress update — ${ws.businessName}`,
                  bodyHtml: body,
                  brandColor: ws.brandColor,
                  logoUrl: ws.logoUrl,
                });
                await logSend(ws.id, client.id, "weekly_checkin");
                emailsSent++;
              }
            }
          }
        }

        // ── milestone_completed (check recent activity events) ──
        const milestoneRule = ruleMap.get("milestone_completed");
        if (milestoneRule) {
          const recentMilestones = await prisma.activityEvent.findMany({
            where: {
              workspaceId: ws.id,
              clientId: client.id,
              eventType: { startsWith: "step_completed_" },
              createdAt: { gte: new Date(now - HOUR) },
            },
          });
          for (const evt of recentMilestones) {
            const meta = evt.metadataJson ? JSON.parse(evt.metadataJson) : {};
            if (meta.stepType === "milestone") {
              const ruleKey = `milestone_completed_${meta.stepId}`;
              const sent = await wasRecentlySent(ws.id, client.id, ruleKey, 365 * DAY);
              if (!sent) {
                const body = replacePlaceholders(milestoneRule.messageTemplate, clientName, ws.businessName, portalLink);
                await sendAutomationEmail({
                  toEmail: client.email,
                  subject: `Milestone completed! — ${ws.businessName}`,
                  bodyHtml: body,
                  brandColor: ws.brandColor,
                  logoUrl: ws.logoUrl,
                });
                await logSend(ws.id, client.id, ruleKey);
                emailsSent++;
              }
            }
          }
        }
      } catch (err) {
        console.error(`[cron] Error processing client ${client.id}:`, err);
        errCount++;
      }
    }
  }

  console.log(`[cron] Automation run complete: ${emailsSent} emails sent, ${errCount} errors`);
  return NextResponse.json({
    success: true,
    emailsSent,
    errors: errCount,
    timestamp: new Date().toISOString(),
  });
}
