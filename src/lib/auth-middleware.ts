import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "tantuve-jwt-secret";

export interface AuthUser {
  userId: string;
  role: string;
}

export async function verifyAuth(
  req: NextRequest,
): Promise<AuthUser | null> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    const encoder = new TextEncoder();
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    return {
      userId: payload.sub as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: NextRequest,
  allowedRoles?: string[],
): Promise<AuthUser | NextResponse> {
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }
  return user;
}
