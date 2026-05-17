import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken, sessionCookieOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const MAX_ATTEMPTS    = 20;  // per IP per 15 min
const LOCKOUT_AFTER   = 5;   // failed attempts before account lockout
const LOCKOUT_MINUTES = 15;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  // IP-level rate limit
  const { allowed } = await checkRateLimit(`login:${ip}`, MAX_ATTEMPTS);
  if (!allowed) {
    await audit("login_ratelimited", { ip });
    return NextResponse.json({ error: "Too many login attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Account lockout check
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    await audit("login_locked", { userId: user.id, ip });
    return NextResponse.json({ error: `Account locked. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.` }, { status: 403 });
  }

  const valid = user && await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    // Track failed attempts
    if (user) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= LOCKOUT_AFTER;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60000) : null,
        },
      });
      if (shouldLock) {
        await audit("login_locked", { userId: user.id, ip, meta: { attempts } });
        return NextResponse.json({ error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.` }, { status: 403 });
      }
    }
    await audit("login_failed", { userId: user?.id, ip, meta: { email } });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Success — reset lockout counters
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  const token = await signToken({ userId: user.id, email: user.email, name: user.name, role: user.role });
  await audit("login_success", { userId: user.id, ip });

  const res = NextResponse.json({ ok: true, name: user.name });
  res.cookies.set(sessionCookieOptions(token));
  return res;
}
