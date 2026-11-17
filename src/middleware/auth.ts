import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { adminAuth } from '../lib/firebase-admin.ts';
import {
  findProfileById,
  getOrCreateFirebaseUser,
  ProfileRecord,
} from '../db/users.ts';

const JWT_SECRET =
  process.env.AUTH_JWT_SECRET ||
  crypto
    .createHash('sha256')
    .update(process.env.SQL_PASSWORD || 'freshcart-local-dev-secret-key')
    .digest('hex');

export interface SessionJwtPayload {
  profileId: number;
  uid: string;
  email: string;
  type: 'session';
}

export interface AuthRequest extends Request {
  profile?: ProfileRecord;
}

export function signSessionToken(
  profile: ProfileRecord,
  rememberMe = true
): string {
  const payload: SessionJwtPayload = {
    profileId: profile.id,
    uid: profile.uid,
    email: profile.email,
    type: 'session',
  };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: rememberMe ? '30d' : '24h',
  });
}

export async function resolveProfileFromAuthHeader(
  authHeader?: string
): Promise<ProfileRecord | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  // 1. Try FreshCart session JWT first
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionJwtPayload;
    if (decoded?.type === 'session' && typeof decoded.profileId === 'number') {
      const profile = await findProfileById(decoded.profileId);
      if (profile) return profile;
    }
  } catch {
    // Fall through to Firebase ID Token verification
  }

  // 2. Try Firebase ID Token (Google Sign-In)
  try {
    const decodedFirebase = await adminAuth.verifyIdToken(token);
    if (decodedFirebase?.uid && decodedFirebase?.email) {
      return await getOrCreateFirebaseUser(
        decodedFirebase.uid,
        decodedFirebase.email,
        decodedFirebase.name
      );
    }
  } catch {
    return null;
  }

  return null;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const profile = await resolveProfileFromAuthHeader(
      req.headers.authorization
    );
    if (!profile) {
      return res
        .status(401)
        .json({ error: 'Unauthorized. Please sign in to continue.' });
    }
    req.profile = profile;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
};

export const requireVerified = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.profile) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (!req.profile.emailVerified) {
    return res.status(403).json({
      error: 'Please verify your email address before accessing this feature.',
      code: 'EMAIL_NOT_VERIFIED',
      email: req.profile.email,
    });
  }
  next();
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.profile) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.profile.role !== 'admin') {
    return res
      .status(403)
      .json({ error: 'Forbidden. Administrator access required.' });
  }
  next();
};
