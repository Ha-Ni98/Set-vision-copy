import type {
  ActivationEmailDTO,
  PaginatedActivationEmails,
  ActivationEmailOptionDTO,
  GetActivationEmailsQuery,
  GetActivationEmailPoolQuery,
  CreateActivationEmailCommand,
} from '@my-app/contract';

export interface IActivationEmailService {
  getAll(query: GetActivationEmailsQuery): Promise<PaginatedActivationEmails>;
  getPool(query: GetActivationEmailPoolQuery): Promise<ActivationEmailOptionDTO[]>;
  create(cmd: CreateActivationEmailCommand, actorId: string): Promise<ActivationEmailDTO>;
  delete(id: string, actorId: string): Promise<void>;
}
