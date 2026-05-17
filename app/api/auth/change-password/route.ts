import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 5 attempts per user per 15 min
  const { allowed } = await checkRateLimit(`change-password:${session.userId}`, 5);
  if (!allowed)
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword)
    return NextResponse.json({ error: "Both fields required" }, { status: 400 });
  if (newPassword.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!(await bcrypt.compare(currentPassword, user.passwordHash)))
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: session.userId }, data: { passwordHash } });
  await audit("password_change", { userId: session.userId });
  return NextResponse.json({ ok: true });
}
