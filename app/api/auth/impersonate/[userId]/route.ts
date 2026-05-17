import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, signToken, sessionCookieOptions } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  if (session.impersonatedBy)
    return NextResponse.json({ error: "Already impersonating — exit first" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Save admin's original token in a separate cookie
  const adminToken = req.cookies.get("session")?.value ?? "";

  const impersonationToken = await signToken({
    userId: target.id,
    email:  target.email,
    name:   target.name,
    role:   target.role,
    impersonatedBy: { userId: session.userId, name: session.name },
  });

  await audit("impersonate_start", { userId: session.userId, targetId: target.id, meta: { targetName: target.name } });
  const res = NextResponse.json({ ok: true, name: target.name });
  res.cookies.set(sessionCookieOptions(impersonationToken));
  res.cookies.set({
    name: "admin_session",
    value: adminToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return res;
}
