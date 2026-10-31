import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes: Array<[string, string[]]> = [
  ["/student", ["student"]],
  ["/teacher", ["teacher"]],
  ["/officer", ["election_officer"]],
  ["/admin", ["administrator", "super_admin"]],
  ["/super-admin", ["super_admin"]],
  ["/auditor", ["auditor"]],
  ["/account", ["student", "teacher", "election_officer", "administrator", "super_admin", "auditor"]],
];

function normalizeRole(role: unknown): string | null {
  if (typeof role !== "string") return null;
  const normalized = role.trim().toLowerCase();
  const aliases: Record<string, string> = {
    admin: "administrator",
    officer: "election_officer",
    superadmin: "super_admin",
  };
  const canonical = aliases[normalized] ?? normalized;
  return [
    "student",
    "teacher",
    "election_officer",
    "administrator",
    "super_admin",
    "auditor",
  ].includes(canonical)
    ? canonical
    : null;
}

function requiredRoles(pathname: string): string[] | null {
  const match = protectedRoutes.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match?.[1] ?? null;
}

function loginRedirect(request: NextRequest, clearSession = false) {
  const login = new URL("/auth/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  const response = NextResponse.redirect(login);
  if (clearSession) {
    response.cookies.set("session_id", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });
  }
  return response;
}

function unavailableResponse() {
  return NextResponse.json(
    {
      error: "IDENTITY_SERVICE_UNAVAILABLE",
      message: "This workspace is temporarily unavailable. No private content was rendered.",
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

async function validateProtectedSession(request: NextRequest, roles: string[]) {
  const session =
    request.cookies.get("session_id")?.value ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!session) return loginRedirect(request);

  const configuredIdentityBase =
    process.env.IDENTITY_SERVICE_URL ||
    process.env.NEXT_PUBLIC_IDENTITY_API_BASE ||
    process.env.NEXT_PUBLIC_IDENTITY_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://127.0.0.1:8080";

  let identityUrl: URL;
  try {
    identityUrl = new URL("/v1/auth/me", configuredIdentityBase);
  } catch {
    return unavailableResponse();
  }

  try {
    const identityResponse = await fetch(identityUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session}`,
        Cookie: `session_id=${encodeURIComponent(session)}`,
      },
      cache: "no-store",
    });

    if (identityResponse.status === 401 || identityResponse.status === 403) {
      return loginRedirect(request, true);
    }
    if (!identityResponse.ok) return unavailableResponse();

    const profile: unknown = await identityResponse.json();
    if (
      !profile ||
      typeof profile !== "object" ||
      !("roles" in profile) ||
      !Array.isArray(profile.roles)
    ) {
      return unavailableResponse();
    }

    const grantedRoles = profile.roles
      .map(normalizeRole)
      .filter((role): role is string => Boolean(role));
    if (!roles.some((role) => grantedRoles.includes(role))) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Your authenticated account is not authorized for this workspace.",
        },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch {
    return unavailableResponse();
  }

  return null;
}

export async function middleware(request: NextRequest) {
  // Static assets must bypass request-header rewriting. Passing a page CSP as
  // an upstream request header can make Next's asset handler treat the request
  // as malformed and return its generic 400 page.
  if (request.nextUrl.pathname.startsWith("/_next/") || request.nextUrl.pathname === "/favicon.ico") {
    return NextResponse.next();
  }
  const nonce = btoa(crypto.randomUUID());
  const isDevelopment = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' http://localhost:8080 http://127.0.0.1:8080 https://api.himvote.example.in https://cast.himvote.example.in",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const roles = requiredRoles(request.nextUrl.pathname);
  if (roles) {
    const authResponse = await validateProtectedSession(request, roles);
    if (authResponse) return authResponse;
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
