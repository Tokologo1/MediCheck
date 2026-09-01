import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { cartAddSchema } from "@/lib/validators";

// GET /api/cart
export async function GET(request: NextRequest) {
  try {
    const session = requireAuth(request);
    if (session instanceof NextResponse) return session;

    const cart = await prisma.cart.findUnique({
      where: { userId: session.userId },
      include: {
        items: {
          include: {
            medication: { select: { id: true, name: true, category: true, requiresPrescription: true, dosage: true } },
            dispensary: { select: { id: true, name: true, address: true, operatingHours: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ cart: { id: null, items: [], total: 0, itemCount: 0 } });
    }

    const total = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    return NextResponse.json({ cart: { ...cart, total, itemCount } });
  } catch (error) {
    console.error('Get cart error:', error);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

// POST /api/cart
export async function POST(request: NextRequest) {
  try {
    const session = requireAuth(request);
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const validation = cartAddSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { medicationId, dispensaryId, quantity } = validation.data;

    // Check inventory exists and has stock
    const inventory = await prisma.inventory.findUnique({
      where: { dispensaryId_medicationId: { dispensaryId, medicationId } },
      include: { medication: { select: { name: true, requiresPrescription: true } } },
    });

    if (!inventory) {
      return NextResponse.json({ error: 'Medication not available at this dispensary' }, { status: 404 });
    }
    if (inventory.quantityInStock < quantity) {
      return NextResponse.json({ error: `Only ${inventory.quantityInStock} units available in stock` }, { status: 409 });
    }

    // Upsert cart
    let cart = await prisma.cart.findUnique({ where: { userId: session.userId }, include: { items: true } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: session.userId }, include: { items: true } });
    }

    // Enforce one-dispensary-per-cart
    if (cart.items.length > 0 && cart.items[0].dispensaryId !== dispensaryId) {
      return NextResponse.json({
        error: 'Your cart already has items from a different dispensary. Please clear your cart or complete your current order first.',
        code: 'DISPENSARY_MISMATCH',
      }, { status: 409 });
    }

    // Upsert cart item
    const existingItem = cart.items.find(i => i.medicationId === medicationId && i.dispensaryId === dispensaryId);
    let item;
    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (inventory.quantityInStock < newQty) {
        return NextResponse.json({ error: `Only ${inventory.quantityInStock} units available in stock` }, { status: 409 });
      }
      item = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
        include: { medication: { select: { name: true } }, dispensary: { select: { name: true } } },
      });
    } else {
      item = await prisma.cartItem.create({
        data: { cartId: cart.id, medicationId, dispensaryId, quantity, priceAtAdd: inventory.price },
        include: { medication: { select: { name: true } }, dispensary: { select: { name: true } } },
      });
    }

    return NextResponse.json({ item, message: 'Item added to cart' }, { status: 201 });
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json({ error: 'Failed to add item to cart' }, { status: 500 });
  }
}

// DELETE /api/cart — clear entire cart
export async function DELETE(request: NextRequest) {
  try {
    const session = requireAuth(request);
    if (session instanceof NextResponse) return session;

    await prisma.cart.deleteMany({ where: { userId: session.userId } });
    return NextResponse.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 });
  }
}
