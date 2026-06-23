import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET /api/medications/[id] — Get single medication
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const medication = await prisma.medication.findUnique({
      where: { id },
      include: {
        inventory: {
          include: {
            dispensary: true,
          },
        },
      },
    });

    if (!medication) {
      return NextResponse.json(
        { error: "Medication not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ medication });
  } catch (error) {
    console.error("Get medication error:", error);
    return NextResponse.json(
      { error: "Failed to fetch medication" },
      { status: 500 }
    );
  }
}

// PUT /api/medications/[id] — Update medication (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireAdmin(request);
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const body = await request.json();

    const medication = await prisma.medication.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ medication });
  } catch (error) {
    console.error("Update medication error:", error);
    return NextResponse.json(
      { error: "Failed to update medication" },
      { status: 500 }
    );
  }
}

// DELETE /api/medications/[id] — Delete medication (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireAdmin(request);
    if (session instanceof NextResponse) return session;

    const { id } = await params;

    await prisma.medication.delete({ where: { id } });

    return NextResponse.json({ message: "Medication deleted successfully" });
  } catch (error) {
    console.error("Delete medication error:", error);
    return NextResponse.json(
      { error: "Failed to delete medication" },
      { status: 500 }
    );
  }
}
