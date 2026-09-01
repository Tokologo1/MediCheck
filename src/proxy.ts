import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/search", "/medications", "/cart", "/orders", "/checkout"];
// Routes that require admin role
const ADMIN_ROUTES = ["/admin"];
// API routes exempt from CSRF (external webhooks, auth bootstrap)
const CSRF_EXEMPT = ["/api/auth/login", "/api/auth/register", "/api/checkout/webhook"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // --- Security Headers ---
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  // Content Security Policy (Stripe-compatible)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.stripe.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);

  // --- CSRF Protection (Double Submit Cookie) ---
  if (request.method === "GET" && !pathname.startsWith("/api/")) {
    const csrfToken = crypto.randomUUID();
    response.cookies.set("csrf-token", csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
  }

  // Validate CSRF on mutating API requests
  if (pathname.startsWith("/api/") && request.method !== "GET") {
    const isExempt = CSRF_EXEMPT.some(
      (exempt) => pathname === exempt || pathname.startsWith(exempt + "/")
    );
    if (!isExempt) {
      const cookieCsrf = request.cookies.get("csrf-token")?.value;
      const headerCsrf = request.headers.get("x-csrf-token");
      if (!cookieCsrf || !headerCsrf || cookieCsrf !== headerCsrf) {
        return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
      }
    }
  }

  // --- Auth Protection for Pages (non-API) ---
  if (pathname.startsWith("/api/")) {
    return response;
  }

  const accessToken = request.cookies.get("access-token")?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isAdminRoute = ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtectedRoute && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && !accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
