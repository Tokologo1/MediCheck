import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, checkRateLimit, RATE_LIMITS } from "@/lib/auth";
import { dispensaryCreateSchema } from "@/lib/validators";

// GET /api/dispensaries — List all dispensaries (auth required)
export async function GET(request: NextRequest) {
  try {
    const session = requireAuth(request);
    if (session instanceof NextResponse) return session;

    const dispensaries = await prisma.dispensary.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { inventory: true },
        },
      },
    });

    return NextResponse.json({ dispensaries });
  } catch (error) {
    console.error("Get dispensaries error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispensaries" },
      { status: 500 }
    );
  }
}

// POST /api/dispensaries — Create dispensary (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = requireAdmin(request);
    if (session instanceof NextResponse) return session;

    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = checkRateLimit(`create-disp:${clientIp}`, RATE_LIMITS.general);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = dispensaryCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const dispensary = await prisma.dispensary.create({
      data: validation.data,
    });

    return NextResponse.json({ dispensary }, { status: 201 });
  } catch (error) {
    console.error("Create dispensary error:", error);
    return NextResponse.json(
      { error: "Failed to create dispensary" },
      { status: 500 }
    );
  }
}
