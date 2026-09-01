import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { cartUpdateSchema } from "@/lib/validators";

// PATCH /api/cart/[itemId] — update quantity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = requireAuth(request);
    if (session instanceof NextResponse) return session;
    const { itemId } = await params;

    const body = await request.json();
    const validation = cartUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { quantity } = validation.data;

    // Verify ownership
    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item || item.cart.userId !== session.userId) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    // Check stock
    const inventory = await prisma.inventory.findUnique({
      where: { dispensaryId_medicationId: { dispensaryId: item.dispensaryId, medicationId: item.medicationId } },
    });
    if (!inventory || inventory.quantityInStock < quantity) {
      return NextResponse.json({ error: `Only ${inventory?.quantityInStock ?? 0} units in stock` }, { status: 409 });
    }

    const updated = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { medication: { select: { name: true } }, dispensary: { select: { name: true } } },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error('Update cart item error:', error);
    return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
  }
}

// DELETE /api/cart/[itemId] — remove item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = requireAuth(request);
    if (session instanceof NextResponse) return session;
    const { itemId } = await params;

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });
    if (!item || item.cart.userId !== session.userId) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    await prisma.cartItem.delete({ where: { id: itemId } });
    return NextResponse.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove cart item error:', error);
    return NextResponse.json({ error: 'Failed to remove cart item' }, { status: 500 });
  }
}
