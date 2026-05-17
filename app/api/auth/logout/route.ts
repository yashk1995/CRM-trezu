import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload?.jti) {
      const expiresAt = new Date((payload.exp ?? Math.floor(Date.now() / 1000) + 8 * 3600) * 1000);
      // Blacklist token and clean up expired entries in one transaction
      await prisma.$transaction([
        prisma.tokenBlacklist.upsert({
          where:  { jti: payload.jti },
          create: { jti: payload.jti, expiresAt },
          update: {},
        }),
        prisma.tokenBlacklist.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      ]);
      await audit("logout", { userId: payload.userId });
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: "session", value: "", maxAge: 0, path: "/", httpOnly: true, sameSite: "strict" });
  return res;
}
