import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/orders/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireAuth(request);
    if (session instanceof NextResponse) return session;
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        dispensary: { select: { id: true, name: true, address: true, phone: true, operatingHours: true } },
        items: {
          include: { medication: { select: { id: true, name: true, category: true, dosage: true } } },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Users can only see their own orders; admins can see all
    if (session.role !== 'ADMIN' && order.userId !== session.userId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
