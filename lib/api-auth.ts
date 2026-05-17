import { NextResponse } from "next/server";
import { getSession, SessionPayload } from "@/lib/auth";

export const UNAUTH = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
export const FORBIDDEN = () => NextResponse.json({ error: "Admin access required" }, { status: 403 });

export async function requireAuth(): Promise<SessionPayload | null> {
  return getSession();
}

export async function requireAdmin(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}
