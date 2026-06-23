import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, checkRateLimit, RATE_LIMITS } from "@/lib/auth";

// GET /api/search — Search medications with availability across dispensaries
export async function GET(request: NextRequest) {
  try {
    const session = requireAuth(request);
    if (session instanceof NextResponse) return session;

    // Rate limiting
    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = checkRateLimit(`search:${session.userId || clientIp}`, RATE_LIMITS.search);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many search requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)) } }
      );
    }

    const { searchParams } = request.nextUrl;
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || undefined;

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Search medications with inventory data
    const medications = await prisma.medication.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { manufacturer: { contains: query, mode: "insensitive" } },
            ],
          },
          category ? { category } : {},
        ],
      },
      include: {
        inventory: {
          include: {
            dispensary: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                operatingHours: true,
              },
            },
          },
          orderBy: { quantityInStock: "desc" },
        },
      },
      orderBy: { name: "asc" },
      take: 50,
    });

    // Transform data for frontend
    const results = medications.map((med) => ({
      id: med.id,
      name: med.name,
      category: med.category,
      dosage: med.dosage,
      manufacturer: med.manufacturer,
      description: med.description,
      requiresPrescription: med.requiresPrescription,
      availableAt: med.inventory.map((inv) => ({
        dispensaryId: inv.dispensary.id,
        dispensaryName: inv.dispensary.name,
        dispensaryAddress: inv.dispensary.address,
        dispensaryPhone: inv.dispensary.phone,
        operatingHours: inv.dispensary.operatingHours,
        quantityInStock: inv.quantityInStock,
        price: inv.price,
        inStock: inv.quantityInStock > 0,
        lastRestocked: inv.lastRestocked,
      })),
    }));

    return NextResponse.json({
      results,
      total: results.length,
      query: searchParams.get("q"),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
