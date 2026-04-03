import { NextRequest, NextResponse } from "next/server";

// TODO: Implement full Stripe webhook handling
// 1. Verify Stripe-Signature header using STRIPE_WEBHOOK_SECRET
// 2. Handle checkout.session.completed → update workspace.subscriptionStatus + stripeSubscriptionId
// 3. Handle customer.subscription.updated → update subscriptionStatus
// 4. Handle customer.subscription.deleted → set subscriptionStatus to "cancelled"

export async function POST(req: NextRequest) {
  // Stripe webhooks bypass Clerk middleware (configured in middleware.ts matcher exclusions)
  void req;
  return new NextResponse("ok", { status: 200 });
}
