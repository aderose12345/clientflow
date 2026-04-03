import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return new NextResponse("Stripe not configured", { status: 503 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;

  // Verify webhook signature if secret is configured
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    if (!signature) {
      return new NextResponse("Missing stripe-signature header", { status: 400 });
    }
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Stripe webhook signature verification failed:", message);
      return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
    }
  } else {
    // No webhook secret — parse the event directly (dev/testing only)
    try {
      event = JSON.parse(body);
    } catch {
      return new NextResponse("Invalid JSON", { status: 400 });
    }
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (customerId && subscriptionId) {
        await prisma.workspace.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: "active",
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;
      const status = subscription.status as string;

      // Map Stripe statuses to our app statuses
      let appStatus = "active";
      if (status === "past_due") appStatus = "past_due";
      else if (status === "canceled" || status === "unpaid") appStatus = "cancelled";
      else if (status === "trialing") appStatus = "trial";

      await prisma.workspace.updateMany({
        where: { stripeCustomerId: customerId },
        data: { subscriptionStatus: appStatus },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = subscription.customer as string;

      await prisma.workspace.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          subscriptionStatus: "cancelled",
          stripeSubscriptionId: null,
        },
      });
      break;
    }
  }

  return new NextResponse("ok", { status: 200 });
}
