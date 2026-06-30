import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '../../env';

export const generateToken = (payload: object): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRATION as StringValue });

export const verifyToken = (token: string): jwt.JwtPayload =>
  jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

// Returns a cryptographically random 64-char hex string — the raw value sent to the client.
export const generateOpaqueToken = (): string =>
  crypto.randomBytes(32).toString('hex');

// Deterministic SHA-256 hash used for DB storage and lookup (RefreshToken.tokenHash @unique).
// Must NOT use argon2/bcrypt (salted → not queryable).
export const hashRefreshToken = (raw: string): string =>
  crypto.createHash('sha256').update(raw).digest('hex');
