import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/generated/prisma/enums";
import { getEnv } from "./env";

export const sessionCookieName = "sistema-fitness_session";

export type AppSession = {
  userId: string;
  email: string;
  name: string;
  role: Role;
};

function sessionSecret() {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

export async function createSessionToken(session: AppSession) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionSecret());
}

export async function readSessionToken(token?: string | null): Promise<AppSession | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (!payload.userId || !payload.email || !payload.name || !payload.role) return null;
    return payload as AppSession;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  return readSessionToken(store.get(sessionCookieName)?.value);
}

export async function setSessionCookie(session: AppSession) {
  const store = await cookies();
  const token = await createSessionToken(session);
  store.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
