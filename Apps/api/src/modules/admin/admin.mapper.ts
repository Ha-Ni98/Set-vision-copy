import type { Admin, User } from '@prisma/client';
import {
  AdminResponseSchema,
  AdminWithCredentialsResponseSchema,
  AdminGeneratedPasswordResponseSchema,
  type AdminDTO,
  type AdminWithCredentialsDTO,
  type AdminGeneratedPasswordDTO,
  type CreateAdminCommand,
  type UpdateAdminCommand,
} from '@my-app/contract';

export class AdminMapper {
  static toDTO(admin: Admin, user: User): AdminDTO {
    const dto: AdminDTO = {
      id: admin.id,
      userId: admin.userId,
      fullName: admin.fullName,
      phone: admin.phone,
      username: user.username,
      isEnabled: user.isEnabled,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
    return AdminResponseSchema.parse(dto);
  }

  static toWithCredentialsDTO(
    admin: Admin,
    user: User,
    generatedPassword: string,
  ): AdminWithCredentialsDTO {
    return AdminWithCredentialsResponseSchema.parse({
      admin: AdminMapper.toDTO(admin, user),
      generatedPassword,
    });
  }

  static toGeneratedPasswordDTO(generatedPassword: string): AdminGeneratedPasswordDTO {
    return AdminGeneratedPasswordResponseSchema.parse({ generatedPassword });
  }

  static toPersistence(cmd: Partial<CreateAdminCommand | UpdateAdminCommand>): {
    fullName?: string;
    username?: string;
    phone?: string;
  } {
    return {
      ...(cmd.fullName !== undefined && { fullName: cmd.fullName.trim() }),
      ...(cmd.username !== undefined && { username: cmd.username.trim() }),
      ...(cmd.phone !== undefined && { phone: cmd.phone.trim() }),
    };
  }
}
