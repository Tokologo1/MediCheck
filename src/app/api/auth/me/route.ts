import { NextRequest, NextResponse } from "next/server";
import { requireAuth, verifyUserExists } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = requireAuth(request);

    if (session instanceof NextResponse) {
      return session;
    }

    const user = await verifyUserExists(session.userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get current user error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
