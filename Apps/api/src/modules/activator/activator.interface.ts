import type {
  ActivatorDTO,
  ActivatorDetailDTO,
  ActivatorWithCredentialsDTO,
  ActivatorGeneratedPasswordDTO,
  ActivatorPerformanceDTO,
  ActivatorDashboardDTO,
  GetActivatorsQuery,
  CreateActivatorCommand,
  UpdateActivatorCommand,
  ActivatorPerformanceQuery,
  PaginatedResult,
} from '@my-app/contract';

export interface IActivatorService {
  getAll(query: GetActivatorsQuery): Promise<PaginatedResult<ActivatorDTO>>;
  create(cmd: CreateActivatorCommand, actorId: string): Promise<ActivatorWithCredentialsDTO>;
  getById(id: string): Promise<ActivatorDetailDTO>;
  update(id: string, cmd: UpdateActivatorCommand, actorId: string): Promise<ActivatorDTO>;
  toggle(id: string, actorId: string): Promise<ActivatorDTO>;
  resetPassword(id: string, actorId: string): Promise<ActivatorGeneratedPasswordDTO>;
  delete(id: string, actorId: string): Promise<void>;
  performance(id: string, query: ActivatorPerformanceQuery): Promise<ActivatorPerformanceDTO>;
  myStats(principalUserId: string): Promise<ActivatorDashboardDTO>;
}
