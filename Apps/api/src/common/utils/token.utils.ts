import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '../../env';

export const generateToken = (payload: object): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRATION as StringValue });

export const verifyToken = (token: string): jwt.JwtPayload =>
  jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
