import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET /api/admin/stats — Admin dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = requireAdmin(request);
    if (session instanceof NextResponse) return session;

    const [
      totalMedications,
      totalDispensaries,
      lowStockCount,
      outOfStockCount,
    ] = await Promise.all([
      prisma.medication.count(),
      prisma.dispensary.count(),
      prisma.inventory.count({
        where: { quantityInStock: { gt: 0, lt: 10 } },
      }),
      prisma.inventory.count({
        where: { quantityInStock: 0 },
      }),
    ]);

    return NextResponse.json({
      totalMedications,
      totalDispensaries,
      lowStockCount,
      outOfStockCount,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
