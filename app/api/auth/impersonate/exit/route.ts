import { NextRequest, NextResponse } from "next/server";
import { sessionCookieOptions, verifyToken } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const adminToken = req.cookies.get("admin_session")?.value;
  if (!adminToken) return NextResponse.json({ error: "No admin session to return to" }, { status: 400 });

  // Log who was being impersonated
  const currentPayload = await verifyToken(req.cookies.get("session")?.value ?? "");
  if (currentPayload?.impersonatedBy) {
    await audit("impersonate_exit", {
      userId: currentPayload.impersonatedBy.userId,
      targetId: currentPayload.userId,
    });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieOptions(adminToken));
  res.cookies.set({ name: "admin_session", value: "", maxAge: 0, path: "/", httpOnly: true, sameSite: "strict" });
  return res;
}
