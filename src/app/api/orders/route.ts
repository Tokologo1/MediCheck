import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/orders — list user's orders
export async function GET(request: NextRequest) {
  try {
    const session = requireAuth(request);
    if (session instanceof NextResponse) return session;

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '10', 10));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: session.userId },
        include: {
          dispensary: { select: { id: true, name: true, address: true, phone: true } },
          items: {
            include: { medication: { select: { id: true, name: true, category: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: { userId: session.userId } }),
    ]);

    return NextResponse.json({ orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST /api/orders — create order from cart
export async function POST(request: NextRequest) {
  try {
    const session = requireAuth(request);
    if (session instanceof NextResponse) return session;

    // Load cart
    const cart = await prisma.cart.findUnique({
      where: { userId: session.userId },
      include: {
        items: {
          include: {
            medication: true,
            dispensary: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 });
    }

    // Check for prescription items
    const prescriptionItems = cart.items.filter(i => i.medication.requiresPrescription);
    if (prescriptionItems.length > 0) {
      return NextResponse.json({
        error: 'Your cart contains prescription-only medications. Please contact the dispensary directly.',
        prescriptionItems: prescriptionItems.map(i => i.medication.name),
      }, { status: 422 });
    }

    const dispensaryId = cart.items[0].dispensaryId;
    const totalAmount = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

    // Validate stock is still available for all items
    for (const item of cart.items) {
      const inventory = await prisma.inventory.findUnique({
        where: { dispensaryId_medicationId: { dispensaryId: item.dispensaryId, medicationId: item.medicationId } },
      });
      if (!inventory || inventory.quantityInStock < item.quantity) {
        return NextResponse.json({
          error: `Insufficient stock for ${item.medication.name}. Available: ${inventory?.quantityInStock ?? 0}`,
          medicationId: item.medicationId,
        }, { status: 409 });
      }
    }

    // Create order in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          userId: session.userId,
          dispensaryId,
          totalAmount,
          status: 'PENDING_PAYMENT',
          items: {
            create: cart.items.map(item => ({
              medicationId: item.medicationId,
              quantity: item.quantity,
              unitPrice: item.priceAtAdd,
            })),
          },
        },
        include: {
          dispensary: { select: { id: true, name: true, address: true } },
          items: { include: { medication: { select: { id: true, name: true } } } },
        },
      });

      // Clear the cart
      await tx.cart.delete({ where: { id: cart.id } });

      return newOrder;
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
