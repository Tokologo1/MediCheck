import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/checkout/create-payment-intent
 *
 * Creates a Stripe PaymentIntent from the user's current cart.
 * Returns { clientSecret, orderId } to the client.
 *
 * Flow:
 *  1. Load cart → validate stock still available
 *  2. Create an Order (status: PENDING_PAYMENT) in DB
 *  3. Create a Stripe PaymentIntent linked to that orderId
 *  4. Return clientSecret to client for Stripe.js confirmation
 */
export async function POST(request: NextRequest) {
  try {
    const session = requireAuth(request);
    if (session instanceof NextResponse) return session;

    // Load cart with full details
    const cart = await prisma.cart.findUnique({
      where: { userId: session.userId },
      include: {
        items: {
          include: {
            medication: true,
            dispensary: { select: { id: true, name: true, address: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
    }

    // Block prescription-only items
    const rxItems = cart.items.filter((i) => i.medication.requiresPrescription);
    if (rxItems.length > 0) {
      return NextResponse.json(
        {
          error: "Cart contains prescription-only medications. Cannot proceed to payment.",
          prescriptionItems: rxItems.map((i) => i.medication.name),
        },
        { status: 422 }
      );
    }

    const dispensaryId = cart.items[0].dispensaryId;
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.priceAtAdd * item.quantity,
      0
    );

    // Validate stock is still available for all items
    for (const item of cart.items) {
      const inventory = await prisma.inventory.findUnique({
        where: {
          dispensaryId_medicationId: {
            dispensaryId: item.dispensaryId,
            medicationId: item.medicationId,
          },
        },
      });
      if (!inventory || inventory.quantityInStock < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${item.medication.name}. Available: ${inventory?.quantityInStock ?? 0}`,
            medicationId: item.medicationId,
          },
          { status: 409 }
        );
      }
    }

    // Create the Order in the DB (PENDING_PAYMENT)
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: session.userId,
          dispensaryId,
          totalAmount,
          status: "PENDING_PAYMENT",
          items: {
            create: cart.items.map((item) => ({
              medicationId: item.medicationId,
              quantity: item.quantity,
              unitPrice: item.priceAtAdd,
            })),
          },
        },
      });

      // Clear the cart
      await tx.cart.delete({ where: { id: cart.id } });

      return newOrder;
    });

    // Create Stripe PaymentIntent
    // Amount must be in the smallest currency unit (cents for ZAR = rands × 100)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // ZAR cents
      currency: "zar",
      metadata: {
        orderId: order.id,
        userId: session.userId,
        dispensaryId,
      },
      description: `MediCheck order ${order.id.slice(-8).toUpperCase()} — ${cart.items.length} item(s)`,
    });

    // Store the PaymentIntent ID on the order for webhook reconciliation
    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentId: paymentIntent.id },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      totalAmount,
    });
  } catch (error) {
    console.error("Create payment intent error:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
