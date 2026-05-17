import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  impersonatedBy?: { userId: string; name: string };
}

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET environment variable is not set");
  if (s.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(randomUUID())       // unique ID per token — enables blacklisting
    .setExpirationTime("8h")
    .sign(secret());
}

export async function verifyToken(token: string): Promise<(SessionPayload & { jti?: string; exp?: number }) | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as (SessionPayload & { jti?: string; exp?: number });
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get("session")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const { prisma } = await import("@/lib/prisma");

  // Parallel: confirm user still exists + token not blacklisted
  const [user, blacklisted] = await Promise.all([
    prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } }),
    payload.jti
      ? prisma.tokenBlacklist.findUnique({ where: { jti: payload.jti } })
      : Promise.resolve(null),
  ]);

  if (!user || blacklisted) return null;
  return payload;
}

export function sessionCookieOptions(token: string) {
  return {
    name: "session",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 60 * 60 * 8,
    path: "/",
  };
}
