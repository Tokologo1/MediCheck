import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, checkRateLimit, RATE_LIMITS } from "@/lib/auth";
import { medicationCreateSchema } from "@/lib/validators";

// GET /api/medications — List all medications (auth required)
export async function GET(request: NextRequest) {
  try {
    const session = requireAuth(request);
    if (session instanceof NextResponse) return session;

    const { searchParams } = request.nextUrl;
    const category = searchParams.get("category") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where = category ? { category } : {};

    const [medications, total] = await Promise.all([
      prisma.medication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.medication.count({ where }),
    ]);

    return NextResponse.json({
      medications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get medications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch medications" },
      { status: 500 }
    );
  }
}

// POST /api/medications — Create medication (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = requireAdmin(request);
    if (session instanceof NextResponse) return session;

    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = checkRateLimit(`create-med:${clientIp}`, RATE_LIMITS.general);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = medicationCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const medication = await prisma.medication.create({
      data: validation.data,
    });

    return NextResponse.json({ medication }, { status: 201 });
  } catch (error) {
    console.error("Create medication error:", error);
    return NextResponse.json(
      { error: "Failed to create medication" },
      { status: 500 }
    );
  }
}
