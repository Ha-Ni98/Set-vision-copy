import { describe, it, expect } from 'vitest';
import { DistributorMapper } from '@modules/distributor/distributor.mapper';
import { DistributorResponseSchema, DistributorDetailResponseSchema } from '@my-app/contract';

const WILAYA_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const COMMUNE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DIST_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const baseDistributor = {
  id: DIST_ID,
  fullName: 'John Doe',
  storeName: 'My Store',
  phone: '+213555123456',
  wilayaId: WILAYA_ID,
  communeId: COMMUNE_ID,
  isEnabled: true,
  nbOfActiveCards: 5,
  nbOfActivation: 10,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  updatedAt: new Date('2024-01-15T10:00:00.000Z'),
  deletedAt: null,
  wilaya: {
    id: WILAYA_ID,
    wilayaCode: '01',
    frName: 'Adrar',
    arName: 'أدرار',
  },
  commune: {
    id: COMMUNE_ID,
    communeCode: '010101',
    wilayaId: WILAYA_ID,
    frName: 'Adrar City',
    arName: 'مدينة أدرار',
  },
};

describe('DistributorMapper.toDTO', () => {
  it('parses DistributorResponseSchema without throwing', () => {
    const dto = DistributorMapper.toDTO(baseDistributor as never, 3);
    expect(() => DistributorResponseSchema.parse(dto)).not.toThrow();
  });

  it('resolves wilayaName and communeName while keeping ids', () => {
    const dto = DistributorMapper.toDTO(baseDistributor as never, 3);
    expect(dto.wilayaId).toBe(WILAYA_ID);
    expect(dto.wilayaName).toBe('Adrar');
    expect(dto.communeId).toBe(COMMUNE_ID);
    expect(dto.communeName).toBe('Adrar City');
  });

  it('maps phone when present', () => {
    const dto = DistributorMapper.toDTO(baseDistributor as never, 0);
    expect(dto.phone).toBe('+213555123456');
  });

  it('coerces null phone to empty string', () => {
    const dto = DistributorMapper.toDTO({ ...baseDistributor, phone: null } as never, 0);
    expect(dto.phone).toBe('');
  });

  it('passes deliveredOrdersCount through', () => {
    const dto = DistributorMapper.toDTO(baseDistributor as never, 7);
    expect(dto.deliveredOrdersCount).toBe(7);
  });

  it('serializes createdAt to ISO string', () => {
    const dto = DistributorMapper.toDTO(baseDistributor as never, 0);
    expect(dto.createdAt).toBe('2024-01-15T10:00:00.000Z');
  });

  it('does not expose updatedAt or deletedAt', () => {
    const dto = DistributorMapper.toDTO(baseDistributor as never, 0) as Record<string, unknown>;
    expect(dto['updatedAt']).toBeUndefined();
    expect(dto['deletedAt']).toBeUndefined();
  });
});

describe('DistributorMapper.toDetailDTO', () => {
  it('parses DistributorDetailResponseSchema without throwing', () => {
    const dto = DistributorMapper.toDetailDTO(baseDistributor as never, 2, 15, 8);
    expect(() => DistributorDetailResponseSchema.parse(dto)).not.toThrow();
  });

  it('includes soldKeys and ordersCount', () => {
    const dto = DistributorMapper.toDetailDTO(baseDistributor as never, 2, 15, 8);
    expect(dto.soldKeys).toBe(15);
    expect(dto.ordersCount).toBe(8);
  });

  it('includes base DTO fields (ids + names both present)', () => {
    const dto = DistributorMapper.toDetailDTO(baseDistributor as never, 2, 15, 8);
    expect(dto.wilayaId).toBe(WILAYA_ID);
    expect(dto.wilayaName).toBe('Adrar');
    expect(dto.communeId).toBe(COMMUNE_ID);
    expect(dto.communeName).toBe('Adrar City');
  });

  it('passes derived fields through as integers', () => {
    const dto = DistributorMapper.toDetailDTO(baseDistributor as never, 0, 0, 0);
    expect(Number.isInteger(dto.soldKeys)).toBe(true);
    expect(Number.isInteger(dto.ordersCount)).toBe(true);
    expect(Number.isInteger(dto.deliveredOrdersCount)).toBe(true);
  });
});
