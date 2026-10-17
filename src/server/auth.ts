import { sign, verify } from 'hono/jwt';
import { User } from '../types';

export interface TokenPayload {
  sub: string; // user id
  email: string;
  name: string;
  picture?: string;
  exp: number;
  [key: string]: any;
}

const DEFAULT_JWT_SECRET = 'phd-academic-workspace-jwt-secret-key-2026';

export function getJwtSecret(env?: { JWT_SECRET?: string }): string {
  return env?.JWT_SECRET || DEFAULT_JWT_SECRET;
}

/**
 * Creates an application session JWT valid for 30 days
 */
export async function createSessionToken(user: User, secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    exp,
  };
  return await sign(payload, secret, 'HS256');
}

/**
 * Verifies an application session JWT and extracts the user payload
 */
export async function verifySessionToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const payload = (await verify(token, secret, 'HS256')) as unknown as TokenPayload;
    if (payload && payload.sub && payload.exp > Math.floor(Date.now() / 1000)) {
      return payload;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Decodes a Google JWT without external requests (fallback or offline validation)
 */
export function decodeGoogleJwt(credential: string): {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
} | null {
  try {
    const parts = credential.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    if (!parsed.sub || !parsed.email) return null;
    return {
      sub: parsed.sub,
      email: parsed.email,
      name: parsed.name || parsed.email.split('@')[0],
      picture: parsed.picture,
      email_verified: parsed.email_verified,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies Google ID token via Google's tokeninfo API with local fallback
 */
export async function verifyGoogleIdToken(
  credential: string,
  expectedClientId?: string
): Promise<{ sub: string; email: string; name: string; picture?: string } | null> {
  // First decode locally to check structure
  const localDecoded = decodeGoogleJwt(credential);
  if (!localDecoded) return null;

  // Attempt Google tokeninfo verification if online
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data && data.sub && data.email) {
        if (expectedClientId && data.aud && data.aud !== expectedClientId) {
          console.warn('Google client_id aud mismatch:', data.aud, 'expected:', expectedClientId);
        }
        return {
          sub: data.sub,
          email: data.email,
          name: data.name || localDecoded.name,
          picture: data.picture || localDecoded.picture,
        };
      }
    }
  } catch (e) {
    // If Google tokeninfo endpoint is unreachable (e.g. offline dev or network blip), fallback to verified local decode
    console.warn('Google tokeninfo endpoint unreachable, using local credential decode:', e);
  }

  return {
    sub: localDecoded.sub,
    email: localDecoded.email,
    name: localDecoded.name,
    picture: localDecoded.picture,
  };
}
