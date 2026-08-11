import type { PrismaClient } from '@prisma/client';
import { LogActionType, UserRole } from '@my-app/contract';
import type {
  AdminDTO,
  AdminWithCredentialsDTO,
  AdminGeneratedPasswordDTO,
  CreateAdminCommand,
  UpdateAdminCommand,
  GetAdminsQuery,
  PaginatedResult,
} from '@my-app/contract';
import type { IAdminService } from './admin.interface';
import { AdminMapper } from './admin.mapper';
import { hashPassword } from '@common/utils/password.utils';
import { generateTempPassword } from '@common/utils/password-generator.util';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import { NotFoundError, ConflictError, ForbiddenError } from '@common/errors';

export class AdminService implements IAdminService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAll(query: GetAdminsQuery): Promise<PaginatedResult<AdminDTO>> {
    const where = {
      AND: [
        { user: { deletedAt: null } },
        ...(query.search
          ? [
              {
                OR: [
                  { fullName: { contains: query.search, mode: 'insensitive' as const } },
                  { phone: { contains: query.search, mode: 'insensitive' as const } },
                  { user: { username: { contains: query.search, mode: 'insensitive' as const } } },
                ],
              },
            ]
          : []),
      ],
    };

    const [rows, total] = await Promise.all([
      this.prisma.admin.findMany({ where, include: { user: true }, ...toSkipTake(query) }),
      this.prisma.admin.count({ where }),
    ]);

    return {
      items: rows.map((r) => AdminMapper.toDTO(r, r.user)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async create(cmd: CreateAdminCommand, actorId: string): Promise<AdminWithCredentialsDTO> {
    const persistence = AdminMapper.toPersistence(cmd);

    const existing = await this.prisma.user.findUnique({
      where: { username: persistence.username! },
    });
    if (existing) throw new ConflictError('Username already taken');

    const tempPassword = generateTempPassword();
    const hashed = await hashPassword(tempPassword);

    const [newUser, newAdmin] = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: persistence.username!,
          password: hashed,
          role: UserRole.ADMIN,
          isEnabled: true,
        },
      });
      const admin = await tx.admin.create({
        data: { userId: user.id, fullName: persistence.fullName!, phone: persistence.phone! },
      });
      await tx.log.create({
        data: {
          actionType: LogActionType.CHANGE_USER_INFORMATION,
          actionDescription: `Created admin: ${user.username}`,
          userId: actorId,
        },
      });
      return [user, admin] as const;
    });

    return AdminMapper.toWithCredentialsDTO(newAdmin, newUser, tempPassword);
  }

  async getById(id: string): Promise<AdminDTO> {
    const result = await this.prisma.admin.findFirst({
      where: { id, user: { deletedAt: null } },
      include: { user: true },
    });
    if (!result) throw new NotFoundError('Admin not found');
    return AdminMapper.toDTO(result, result.user);
  }

  async update(id: string, cmd: UpdateAdminCommand, actorId: string): Promise<AdminDTO> {
    const result = await this.prisma.admin.findFirst({
      where: { id, user: { deletedAt: null } },
      include: { user: true },
    });
    if (!result) throw new NotFoundError('Admin not found');

    const persistence = AdminMapper.toPersistence(cmd);
    const { username, ...adminFields } = persistence;

    if (username !== undefined && username !== result.user.username) {
      const conflict = await this.prisma.user.findUnique({ where: { username } });
      if (conflict) throw new ConflictError('Username already taken');
    }

    // Optional new password (Set 14) — hashed here and folded into the same user update
    // below. Absent = leave the password untouched.
    const hashedPassword = cmd.password ? await hashPassword(cmd.password) : undefined;
    const userData = {
      ...(username !== undefined && { username }),
      ...(hashedPassword !== undefined && { password: hashedPassword }),
    };

    const [updatedUser, updatedAdmin] = await this.prisma.$transaction(async (tx) => {
      const user =
        Object.keys(userData).length > 0
          ? await tx.user.update({ where: { id: result.userId }, data: userData })
          : result.user;

      const admin =
        Object.keys(adminFields).length > 0
          ? await tx.admin.update({ where: { id }, data: adminFields })
          : result;

      await tx.log.create({
        data: {
          actionType: hashedPassword
            ? LogActionType.CHANGE_USER_PASSWORD
            : LogActionType.CHANGE_USER_INFORMATION,
          actionDescription: hashedPassword
            ? `Updated admin information (incl. password): ${user.username}`
            : `Updated admin information: ${user.username}`,
          userId: actorId,
        },
      });

      return [user, admin] as const;
    });

    return AdminMapper.toDTO(updatedAdmin, updatedUser);
  }

  async toggle(id: string, actorId: string): Promise<AdminDTO> {
    const result = await this.prisma.admin.findFirst({
      where: { id, user: { deletedAt: null } },
      include: { user: true },
    });
    if (!result) throw new NotFoundError('Admin not found');

    const newEnabled = !result.user.isEnabled;

    const [updatedUser, updatedAdmin] = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: result.userId },
        data: { isEnabled: newEnabled },
      });
      const admin = await tx.admin.update({
        where: { id },
        data: { isEnabled: newEnabled },
      });
      await tx.log.create({
        data: {
          actionType: LogActionType.CHANGE_USER_STAT,
          actionDescription: `Admin ${newEnabled ? 'enabled' : 'disabled'}: ${user.username}`,
          userId: actorId,
        },
      });
      return [user, admin] as const;
    });

    return AdminMapper.toDTO(updatedAdmin, updatedUser);
  }

  async resetPassword(id: string, actorId: string): Promise<AdminGeneratedPasswordDTO> {
    const result = await this.prisma.admin.findFirst({
      where: { id, user: { deletedAt: null } },
      select: { userId: true, user: { select: { username: true } } },
    });
    if (!result) throw new NotFoundError('Admin not found');

    const tempPassword = generateTempPassword();
    const hashed = await hashPassword(tempPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: result.userId },
        data: { password: hashed },
      });
      await tx.log.create({
        data: {
          actionType: LogActionType.CHANGE_USER_PASSWORD,
          actionDescription: `Admin password reset: ${result.user.username}`,
          userId: actorId,
        },
      });
    });

    return AdminMapper.toGeneratedPasswordDTO(tempPassword);
  }

  async delete(id: string, actorId: string): Promise<void> {
    const result = await this.prisma.admin.findFirst({
      where: { id, user: { deletedAt: null } },
      select: { userId: true },
    });
    if (!result) throw new NotFoundError('Admin not found');

    if (result.userId === actorId) throw new ForbiddenError('Cannot delete yourself');

    const enabledCount = await this.prisma.user.count({
      where: { role: UserRole.ADMIN, isEnabled: true, deletedAt: null },
    });
    if (enabledCount <= 1) throw new ConflictError('Cannot delete the last enabled admin');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: result.userId },
        data: { deletedAt: new Date(), isEnabled: false },
      });
      await tx.admin.update({
        where: { id },
        data: { isEnabled: false },
      });
    });
  }
}
