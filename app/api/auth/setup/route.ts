import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken, sessionCookieOptions } from "@/lib/auth";

export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({ hasUsers: count > 0 });
}

export async function POST(req: NextRequest) {
  const count = await prisma.user.count();
  if (count > 0)
    return NextResponse.json({ error: "Setup already complete" }, { status: 403 });

  const { name, email, password } = await req.json();
  if (!name || !email || !password)
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.toLowerCase().trim(), passwordHash, role: "admin" },
  });

  const token = await signToken({ userId: user.id, email: user.email, name: user.name, role: user.role });
  const res   = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieOptions(token));
  return res;
}
