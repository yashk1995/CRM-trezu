import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { z } from "zod";

const createUserSchema = z.object({
  name:  z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Invalid email address"),
  role:  z.enum(["admin", "member"]).optional().default("member"),
});

function generateTempPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin")
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { name, email, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
    select: { id: true, name: true, email: true, role: true },
  });

  await audit("user_create", { userId: session.userId, targetId: user.id, meta: { email, role } });
  return NextResponse.json({ ...user, tempPassword }, { status: 201 });
}
