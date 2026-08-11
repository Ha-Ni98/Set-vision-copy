import type {
  CardDTO,
  CardDetailDTO,
  AvailableCardsBySetDTO,
  DistributorCardDTO,
  GetCardsQuery,
  GetAvailableCardsQuery,
  GetDistributorCardsQuery,
  PaginatedResult,
} from '@my-app/contract';

export interface ICardService {
  getAll(query: GetCardsQuery): Promise<PaginatedResult<CardDTO>>;
  getAvailableForLot(query: GetAvailableCardsQuery): Promise<AvailableCardsBySetDTO>;
  getById(id: string): Promise<CardDetailDTO>;
  delete(id: string, actorId: string): Promise<void>;
  disable(id: string): Promise<CardDTO>;
  enable(id: string): Promise<CardDTO>;
  revoke(id: string, actorId: string): Promise<CardDTO>;
  getMine(
    principalUserId: string,
    query: GetDistributorCardsQuery,
  ): Promise<PaginatedResult<DistributorCardDTO>>;
  getMineById(principalUserId: string, id: string): Promise<DistributorCardDTO>;
}
