import type {
  CardDTO,
  CardDetailDTO,
  AvailableCardDTO,
  GetCardsQuery,
  GetAvailableCardsQuery,
  PaginatedResult,
} from '@my-app/contract';

export interface ICardService {
  getAll(query: GetCardsQuery): Promise<PaginatedResult<CardDTO>>;
  getAvailableForLot(query: GetAvailableCardsQuery): Promise<AvailableCardDTO[]>;
  getById(id: string): Promise<CardDetailDTO>;
  delete(id: string, actorId: string): Promise<void>;
  disable(id: string): Promise<CardDTO>;
  enable(id: string): Promise<CardDTO>;
  revoke(id: string, actorId: string): Promise<CardDTO>;
}
