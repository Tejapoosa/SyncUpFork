import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ connected: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ connected: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      connected: user.gmailConnected || false,
    });
  } catch (error) {
    console.error("Error fetching Gmail status:", error);
    return NextResponse.json({ connected: false, error: "Failed to fetch status" }, { status: 500 });
  }
}
