import type {
  LotDTO,
  CreateLotCommand,
  GetLotsQuery,
  GetAvailableLotsQuery,
  PaginatedResult,
} from '@my-app/contract';

export interface ILotService {
  getAll(query: GetLotsQuery): Promise<PaginatedResult<LotDTO>>;
  getAvailableForOrder(query: GetAvailableLotsQuery): Promise<LotDTO[]>;
  create(cmd: CreateLotCommand, actorId: string): Promise<LotDTO>;
  delete(id: string, actorId: string): Promise<void>;
}
