import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "./jwt";
import { prisma } from "./prisma";

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Extract and verify the JWT from the Authorization header.
 * Returns null if the token is missing or invalid.
 */
export function getSession(request: NextRequest): AuthUser | null {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    return verifyAccessToken(token) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Verify the user session and return an unauthorized response if invalid.
 * Use in API route handlers.
 */
export function requireAuth(request: NextRequest): NextResponse | AuthUser {
  const session = getSession(request);

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  return session;
}

/**
 * Verify the user is an admin and return a forbidden response if not.
 */
export function requireAdmin(request: NextRequest): NextResponse | AuthUser {
  const session = getSession(request);

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Access denied. Admin privileges required." },
      { status: 403 }
    );
  }

  return session;
}

/**
 * Verify the user exists in the database.
 */
export async function verifyUserExists(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, name: true },
  });

  return user;
}

/**
 * Create a rate limiter store (in-memory, per-process).
 * In production, use Redis for distributed rate limiting.
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Simple in-memory rate limiter.
 * Checks if the given key has exceeded the rate limit.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    rateLimitStore.forEach((entry, k) => {
      if (now > entry.resetTime) rateLimitStore.delete(k);
    });
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  if (record.count >= config.maxRequests) {
    const resetIn = record.resetTime - now;
    return { allowed: false, remaining: 0, resetIn };
  }

  record.count++;
  return { allowed: true, remaining: config.maxRequests - record.count, resetIn: record.resetTime - now };
}

// Rate limit configs
export const RATE_LIMITS = {
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 },       // 5 per 15 min
  register: { maxRequests: 3, windowMs: 15 * 60 * 1000 },    // 3 per 15 min
  search: { maxRequests: 30, windowMs: 15 * 60 * 1000 },     // 30 per 15 min
  general: { maxRequests: 100, windowMs: 15 * 60 * 1000 },   // 100 per 15 min
};
