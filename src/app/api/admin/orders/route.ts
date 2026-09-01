import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const orderStatusUpdateSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(['PENDING_PAYMENT', 'PAID', 'READY_FOR_COLLECTION', 'COLLECTED', 'CANCELLED']),
});

// GET /api/admin/orders
export async function GET(request: NextRequest) {
  try {
    const session = requireAdmin(request);
    if (session instanceof NextResponse) return session;

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') || undefined;
    const dispensaryId = searchParams.get('dispensaryId') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20', 10));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (dispensaryId) where.dispensaryId = dispensaryId;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          dispensary: { select: { id: true, name: true } },
          items: {
            include: { medication: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({ orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Admin get orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// PATCH /api/admin/orders — update order status
export async function PATCH(request: NextRequest) {
  try {
    const session = requireAdmin(request);
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const validation = orderStatusUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { orderId, status } = validation.data;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If marking as PAID, decrement inventory
    if (status === 'PAID' && order.status !== 'PAID') {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId },
      });
      await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({ where: { id: orderId }, data: { status } });
        for (const item of orderItems) {
          await tx.inventory.updateMany({
            where: { dispensaryId: order.dispensaryId, medicationId: item.medicationId },
            data: { quantityInStock: { decrement: item.quantity } },
          });
        }
        return updated;
      });
    } else if (status === 'CANCELLED' && order.status === 'PENDING_PAYMENT') {
      await prisma.order.update({ where: { id: orderId }, data: { status } });
    } else {
      await prisma.order.update({ where: { id: orderId }, data: { status } });
    }

    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { name: true, email: true } },
        dispensary: { select: { name: true } },
        items: { include: { medication: { select: { name: true } } } },
      },
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error('Admin update order error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
