import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function checkRateLimit(key: string, maxAttempts: number): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const entry = await prisma.rateLimitEntry.findUnique({ where: { key } });

  if (!entry || entry.windowStart < windowStart) {
    // No entry or outside window — reset
    await prisma.rateLimitEntry.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  await prisma.rateLimitEntry.update({ where: { key }, data: { count: { increment: 1 } } });
  return { allowed: true, remaining: maxAttempts - entry.count - 1 };
}
