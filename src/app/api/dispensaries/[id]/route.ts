import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET /api/dispensaries/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const dispensary = await prisma.dispensary.findUnique({
      where: { id },
      include: {
        inventory: {
          include: {
            medication: true,
          },
        },
      },
    });

    if (!dispensary) {
      return NextResponse.json(
        { error: "Dispensary not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ dispensary });
  } catch (error) {
    console.error("Get dispensary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispensary" },
      { status: 500 }
    );
  }
}

// PUT /api/dispensaries/[id] — Update (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireAdmin(request);
    if (session instanceof NextResponse) return session;

    const { id } = await params;
    const body = await request.json();

    const dispensary = await prisma.dispensary.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ dispensary });
  } catch (error) {
    console.error("Update dispensary error:", error);
    return NextResponse.json(
      { error: "Failed to update dispensary" },
      { status: 500 }
    );
  }
}

// DELETE /api/dispensaries/[id] — Delete (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireAdmin(request);
    if (session instanceof NextResponse) return session;

    const { id } = await params;

    await prisma.dispensary.delete({ where: { id } });

    return NextResponse.json({ message: "Dispensary deleted successfully" });
  } catch (error) {
    console.error("Delete dispensary error:", error);
    return NextResponse.json(
      { error: "Failed to delete dispensary" },
      { status: 500 }
    );
  }
}
