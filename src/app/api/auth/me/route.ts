import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get("healthstory_session")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, { status: 401 });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "INVALID_SESSION", message: "Session expired" } }, { status: 401 });
  }

  return NextResponse.json({ success: true, data: { user } });
}