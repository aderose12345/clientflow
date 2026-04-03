import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const body = await req.json();
  const { priceId } = body;
  if (!priceId) return NextResponse.json({ error: "priceId is required" }, { status: 400 });

  let customerId = workspace.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { workspaceId: workspace.id } });
    customerId = customer.id;
    await prisma.workspace.update({ where: { id: workspace.id }, data: { stripeCustomerId: customerId } });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?success=true`,
    cancel_url:  `${appUrl}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
