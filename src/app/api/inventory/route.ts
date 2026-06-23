import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, checkRateLimit, RATE_LIMITS } from "@/lib/auth";
import { inventoryUpdateSchema } from "@/lib/validators";

// PUT /api/inventory — Update inventory (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = requireAdmin(request);
    if (session instanceof NextResponse) return session;

    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = checkRateLimit(`inventory:${clientIp}`, RATE_LIMITS.general);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    const validation = inventoryUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { dispensaryId, medicationId, quantityInStock, price } = validation.data;

    // Upsert inventory record
    const inventory = await prisma.inventory.upsert({
      where: {
        dispensaryId_medicationId: { dispensaryId, medicationId },
      },
      update: {
        quantityInStock,
        price,
        lastRestocked: quantityInStock > 0 ? new Date() : undefined,
      },
      create: {
        dispensaryId,
        medicationId,
        quantityInStock,
        price,
      },
      include: {
        dispensary: { select: { name: true } },
        medication: { select: { name: true } },
      },
    });

    return NextResponse.json({ inventory });
  } catch (error) {
    console.error("Update inventory error:", error);
    return NextResponse.json(
      { error: "Failed to update inventory" },
      { status: 500 }
    );
  }
}
