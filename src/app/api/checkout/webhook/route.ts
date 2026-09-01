import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/checkout/webhook
 *
 * Stripe webhook handler. Verifies signature, then:
 * - payment_intent.succeeded  → mark order PAID, decrement inventory
 * - payment_intent.payment_failed → mark order CANCELLED
 *
 * This route is EXEMPT from CSRF (added to CSRF_EXEMPT in proxy.ts).
 * Raw body must be used for Stripe signature verification — Next.js App Router
 * gives us the raw Request body via request.text().
 */

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;

      if (!orderId) {
        console.error("No orderId in PaymentIntent metadata:", paymentIntent.id);
        return NextResponse.json({ received: true });
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        console.error("Order not found for PaymentIntent:", paymentIntent.id, "orderId:", orderId);
        return NextResponse.json({ received: true });
      }

      if (order.status !== "PENDING_PAYMENT") {
        // Already processed (idempotency)
        return NextResponse.json({ received: true });
      }

      // Mark order as PAID and decrement inventory in a transaction
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "PAID", stripePaymentId: paymentIntent.id },
        });

        for (const item of order.items) {
          await tx.inventory.updateMany({
            where: {
              dispensaryId: order.dispensaryId,
              medicationId: item.medicationId,
            },
            data: { quantityInStock: { decrement: item.quantity } },
          });
        }
      });

      console.log(`Order ${orderId} marked as PAID`);
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;

      if (orderId) {
        await prisma.order.updateMany({
          where: { id: orderId, status: "PENDING_PAYMENT" },
          data: { status: "CANCELLED" },
        });
        console.log(`Order ${orderId} marked as CANCELLED (payment failed)`);
      }
    }
    // Other event types are silently acknowledged
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
