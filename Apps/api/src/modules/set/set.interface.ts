import type {
  SetDTO,
  CreateSetCommand,
  TransitionSetCommand,
  GetSetsQuery,
  PaginatedResult,
} from '@my-app/contract';

export interface ISetService {
  getAll(query: GetSetsQuery): Promise<PaginatedResult<SetDTO>>;
  create(cmd: CreateSetCommand, actorId: string): Promise<SetDTO>;
  transition(id: string, cmd: TransitionSetCommand): Promise<SetDTO>;
  delete(id: string, actorId: string): Promise<void>;
}
