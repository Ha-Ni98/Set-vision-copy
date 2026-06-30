import type { PrismaClient } from '@prisma/client';
import ms, { type StringValue } from 'ms';
import type { IAuthService } from './auth.interface';
import { AuthMapper } from './auth.mapper';
import { AppError, AuthError } from '@common/errors';
import { comparePassword } from '@common/utils/password.utils';
import { generateToken, generateOpaqueToken, hashRefreshToken } from '@common/utils/token.utils';
import { env } from '../../env';
import { ErrorCode, UserRole } from '@my-app/contract';
import type { LoginCommand, RefreshTokenCommand, AuthTokensDTO, SessionUserDTO, JWTPayload } from '@my-app/contract';

const invalidCredentials = () =>
  new AppError(401, ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid credentials');

export class AuthService implements IAuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async login(cmd: LoginCommand): Promise<AuthTokensDTO> {
    const user = await this.prisma.user.findUnique({ where: { username: cmd.username } });

    if (!user || user.deletedAt !== null || !user.isEnabled) throw invalidCredentials();

    const valid = await comparePassword(cmd.password, user.password);
    if (!valid) throw invalidCredentials();

    const rawRefreshToken = generateOpaqueToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const expiredAt = new Date(Date.now() + ms(env.REFRESH_TOKEN_EXPIRATION as StringValue));

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiredAt },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = generateToken({ id: user.id, role: user.role });
    return AuthMapper.toAuthTokensDTO(accessToken, rawRefreshToken, user.role as UserRole);
  }

  async refresh(cmd: RefreshTokenCommand): Promise<AuthTokensDTO> {
    const tokenHash = hashRefreshToken(cmd.refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, role: true } } },
    });

    if (!stored) throw new AuthError('Invalid or expired refresh token');

    if (stored.expiredAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { tokenHash } });
      throw new AuthError('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { tokenHash } });

    const rawRefreshToken = generateOpaqueToken();
    const newHash = hashRefreshToken(rawRefreshToken);
    const expiredAt = new Date(Date.now() + ms(env.REFRESH_TOKEN_EXPIRATION as StringValue));

    await this.prisma.refreshToken.create({
      data: { userId: stored.user.id, tokenHash: newHash, expiredAt },
    });

    const accessToken = generateToken({ id: stored.user.id, role: stored.user.role });
    return AuthMapper.toAuthTokensDTO(accessToken, rawRefreshToken, stored.user.role as UserRole);
  }

  async logout(cmd: RefreshTokenCommand): Promise<void> {
    const tokenHash = hashRefreshToken(cmd.refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }

  async me(principal: JWTPayload): Promise<SessionUserDTO> {
    const user = await this.prisma.user.findUnique({ where: { id: principal.id } });
    if (!user) throw new AuthError('User not found');

    let profile: { fullName: string };

    if (user.role === UserRole.ADMIN) {
      const admin = await this.prisma.admin.findUnique({
        where: { userId: user.id },
        select: { fullName: true },
      });
      if (!admin) throw new AuthError('Admin profile not found');
      profile = admin;
    } else {
      const activator = await this.prisma.activator.findUnique({
        where: { userId: user.id },
        select: { fullName: true },
      });
      if (!activator) throw new AuthError('Activator profile not found');
      profile = activator;
    }

    return AuthMapper.toSessionUserDTO(user, profile);
  }
}
