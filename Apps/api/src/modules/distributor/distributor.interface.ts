import type {
  DistributorDTO,
  DistributorDetailDTO,
  DistributorWithCredentialsDTO,
  DistributorDashboardDTO,
  PaginatedDistributors,
  GetDistributorsQuery,
  CreateDistributorCommand,
  UpdateDistributorCommand,
  CreateDistributorAccountCommand,
} from '@my-app/contract';

export interface IDistributorService {
  getAll(query: GetDistributorsQuery): Promise<PaginatedDistributors>;
  create(cmd: CreateDistributorCommand, actorId: string): Promise<DistributorDTO>;
  getById(id: string): Promise<DistributorDetailDTO>;
  update(id: string, cmd: UpdateDistributorCommand, actorId: string): Promise<DistributorDTO>;
  toggle(id: string, actorId: string): Promise<DistributorDTO>;
  delete(id: string, actorId: string): Promise<void>;
  createAccount(
    id: string,
    cmd: CreateDistributorAccountCommand,
    actorId: string,
  ): Promise<DistributorWithCredentialsDTO>;
  unlinkAccount(id: string, actorId: string): Promise<DistributorDTO>;
  myDashboard(principalUserId: string): Promise<DistributorDashboardDTO>;
}
