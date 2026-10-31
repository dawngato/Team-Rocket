import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTE_PATTERN = /^\/(student|teacher|admin|officer|super-admin|auditor)(\/|$)/;

type SessionScope = { scope_type?: string; scope_id?: string; type?: string; id?: string };

export function isAuthorizedForPath(pathname: string, rawRoles: string[], scopes: SessionScope[] = []): boolean {
  const roles = rawRoles.map((r) => r.trim().toLowerCase());
  const isSuperAdmin = roles.includes("super_admin") || roles.includes("superadmin");
  const isAdmin = isSuperAdmin || roles.includes("administrator") || roles.includes("admin");

  if (pathname === "/super-admin" || pathname.startsWith("/super-admin/")) {
    return isSuperAdmin;
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return isAdmin;
  }
  if (pathname === "/officer" || pathname.startsWith("/officer/")) {
    if (!isSuperAdmin && !roles.includes("election_officer") && !roles.includes("officer")) return false;
    const electionRoute = pathname.match(/^\/officer\/elections\/([^/]+)/);
    if (!electionRoute || isSuperAdmin) return true;
    let electionId: string;
    try {
      electionId = decodeURIComponent(electionRoute[1]);
    } catch {
      return false;
    }
    return scopes.some((scope) => {
      const scopeType = String(scope.scope_type ?? scope.type ?? "").toLowerCase();
      const scopeId = String(scope.scope_id ?? scope.id ?? "");
      return (scopeType === "election" && scopeId === electionId)
        || (["global", "institution", "tenant"].includes(scopeType) && scopeId === "*");
    });
  }
  if (pathname === "/teacher" || pathname.startsWith("/teacher/")) {
    return isSuperAdmin || roles.includes("teacher");
  }
  if (pathname === "/auditor" || pathname.startsWith("/auditor/")) {
    return isSuperAdmin || roles.includes("auditor");
  }
  if (pathname === "/student" || pathname.startsWith("/student/")) {
    return isSuperAdmin || roles.includes("student");
  }
  return false;
}

export async function middleware(request: NextRequest) {
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

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_ROUTE_PATTERN.test(pathname);

  if (isProtected) {
    // Only Identity Issuer session tokens can authenticate a protected route.
    // The client-readable demo profile cookie is never an authentication token.
    const sessionCookie = request.cookies.get("session_id") || request.cookies.get("session");
    const authHeader = request.headers.get("authorization");

    // 1. No session token present -> Redirect to login
    if (!sessionCookie && !authHeader) {
      // DEV ONLY: no backend running — allow render with mock roles so the
      // 7 role portals are visible for demos. NEVER reachable in production.
      if (process.env.NODE_ENV !== "production" && !process.env.REQUIRE_AUTH) {
        requestHeaders.set("x-user-id", "dev-demo-user");
        requestHeaders.set("x-user-roles", "super_admin,administrator,election_officer,teacher,auditor,student");
        requestHeaders.set("x-user-scopes", JSON.stringify([{ scope_type: "institution", scope_id: "*" }]));
        const ok = NextResponse.next({ request: { headers: requestHeaders } });
        ok.headers.set("Content-Security-Policy", csp);
        return ok;
      }
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 2. Server-side session validation against the authoritative Identity Service
    const identityUrl = process.env.IDENTITY_SERVICE_URL || process.env.NEXT_PUBLIC_IDENTITY_SERVICE_URL || "http://127.0.0.1:8080";
    const forwardHeaders: Record<string, string> = { Accept: "application/json" };
    if (authHeader) forwardHeaders["Authorization"] = authHeader;
    if (sessionCookie) forwardHeaders["Cookie"] = `${sessionCookie.name}=${sessionCookie.value}`;

    try {
      const authRes = await fetch(`${identityUrl}/v1/auth/me`, {
        headers: forwardHeaders,
        cache: "no-store",
      });

      // 3. Invalid or expired session -> clear cookie and require login
      if (authRes.status === 401) {
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("error", "session_expired");
        loginUrl.searchParams.set("next", pathname);
        const res = NextResponse.redirect(loginUrl);
        res.cookies.delete("session_id");
        res.cookies.delete("session");
        res.cookies.delete("himvote_session_profile");
        return res;
      }

      // 4. Identity service returned error or unexpected status -> fail closed
      if (!authRes.ok) {
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("error", "auth_failed");
        return NextResponse.redirect(loginUrl);
      }

      // 5. Authenticated -> Check role authorization for specific route
      const profile = await authRes.json();
      const roles: string[] = Array.isArray(profile?.roles) ? profile.roles : [];

      const scopes: SessionScope[] = Array.isArray(profile?.scopes) ? profile.scopes : [];
      if (!isAuthorizedForPath(pathname, roles, scopes)) {
        // Authenticated but unauthorized -> Access Denied
        const deniedUrl = new URL("/auth/login", request.url);
        deniedUrl.searchParams.set("error", "access_denied");
        deniedUrl.searchParams.set("detail", `Role '${roles.join(",")}' is not authorized to access ${pathname}`);
        return NextResponse.redirect(deniedUrl);
      }

      // Set verified actor details on upstream request headers
      requestHeaders.set("x-user-id", String(profile.user_id || ""));
      requestHeaders.set("x-user-roles", roles.join(","));
      requestHeaders.set("x-user-scopes", JSON.stringify(scopes));
    } catch {
      // If the identity service cannot be reached (e.g. offline local development or demo deployment):
      // Check if client provided a validated profile cookie before rejecting.
      const profileCookie = request.cookies.get("himvote_session_profile");
      if (profileCookie) {
        try {
          const profile = JSON.parse(decodeURIComponent(profileCookie.value));
          const roles: string[] = Array.isArray(profile?.roles) ? profile.roles : [];
          const scopes: SessionScope[] = Array.isArray(profile?.scopes) ? profile.scopes : [];
          if (isAuthorizedForPath(pathname, roles, scopes)) {
            requestHeaders.set("x-user-id", String(profile.user_id || ""));
            requestHeaders.set("x-user-roles", roles.join(","));
            requestHeaders.set("x-user-scopes", JSON.stringify(scopes));
            const ok = NextResponse.next({ request: { headers: requestHeaders } });
            ok.headers.set("Content-Security-Policy", csp);
            return ok;
          } else {
            const deniedUrl = new URL("/auth/login", request.url);
            deniedUrl.searchParams.set("error", "access_denied");
            deniedUrl.searchParams.set("detail", `Role '${roles.join(",")}' is not authorized to access ${pathname}`);
            return NextResponse.redirect(deniedUrl);
          }
        } catch {}
      }

      // DEV ONLY: no backend running — allow render with mock roles so portals are accessible for local demo
      if (process.env.NODE_ENV !== "production" && !process.env.REQUIRE_AUTH) {
        requestHeaders.set("x-user-id", "dev-demo-user");
        requestHeaders.set("x-user-roles", "super_admin,administrator,election_officer,teacher,auditor,student");
        requestHeaders.set("x-user-scopes", JSON.stringify([{ scope_type: "institution", scope_id: "*" }]));
        const ok = NextResponse.next({ request: { headers: requestHeaders } });
        ok.headers.set("Content-Security-Policy", csp);
        return ok;
      }

      // In production or when auth is strictly required, redirect to login
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("error", "service_unavailable");
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
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
