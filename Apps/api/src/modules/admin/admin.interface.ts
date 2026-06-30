import type {
  AdminDTO,
  AdminWithCredentialsDTO,
  AdminGeneratedPasswordDTO,
  CreateAdminCommand,
  UpdateAdminCommand,
  GetAdminsQuery,
  PaginatedResult,
} from '@my-app/contract';

export interface IAdminService {
  getAll(query: GetAdminsQuery): Promise<PaginatedResult<AdminDTO>>;
  create(cmd: CreateAdminCommand, actorId: string): Promise<AdminWithCredentialsDTO>;
  getById(id: string): Promise<AdminDTO>;
  update(id: string, cmd: UpdateAdminCommand, actorId: string): Promise<AdminDTO>;
  toggle(id: string, actorId: string): Promise<AdminDTO>;
  resetPassword(id: string, actorId: string): Promise<AdminGeneratedPasswordDTO>;
  delete(id: string, actorId: string): Promise<void>;
}
