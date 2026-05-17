import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "login_success" | "login_failed" | "login_locked" | "login_ratelimited"
  | "logout"
  | "impersonate_start" | "impersonate_exit"
  | "user_create" | "user_delete" | "user_role_change"
  | "password_change";

export async function audit(
  action: AuditAction,
  opts: { userId?: string; targetId?: string; meta?: Record<string, string | number | boolean | null>; ip?: string }
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId:   opts.userId ?? null,
        targetId: opts.targetId ?? null,
        meta:     opts.meta ? (opts.meta as object) : undefined,
        ip:       opts.ip ?? null,
      },
    });
  } catch {
    // Never let audit logging break the main flow
  }
}
