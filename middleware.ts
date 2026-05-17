import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PREFIXES = ["/login", "/setup", "/api/auth", "/_next", "/favicon"];

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

function unauthorized(req: NextRequest) {
  // API routes get a JSON 401; page routes get a login redirect
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next();
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  const token = req.cookies.get("session")?.value;
  if (!token) return unauthorized(req);

  try {
    await jwtVerify(token, secret());
    const res = NextResponse.next();
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch {
    const res = unauthorized(req);
    res.cookies.set({ name: "session", value: "", maxAge: 0, path: "/" });
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
