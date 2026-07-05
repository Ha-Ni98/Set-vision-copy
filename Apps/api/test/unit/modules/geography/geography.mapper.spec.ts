import { describe, it, expect } from 'vitest';
import { GeographyMapper } from '../../../../src/modules/geography/geography.mapper';
import { WilayaResponseSchema, CommuneResponseSchema } from '@my-app/contract';

const wilayaEntity = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  wilayaCode: '01',
  frName: 'Adrar',
  arName: 'أدرار',
  communes: [],
  distributors: [],
  orders: [],
};

const communeEntity = {
  id: 'b1ffcd00-0d1c-4f19-bc7e-7cc0ce491b22',
  communeCode: '010101',
  wilayaId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  frName: 'Adrar',
  arName: 'أدرار',
  wilaya: {} as never,
  distributors: [],
  orders: [],
};

describe('GeographyMapper.toWilayaDTO', () => {
  it('produces a DTO that parses WilayaResponseSchema', () => {
    const dto = GeographyMapper.toWilayaDTO(wilayaEntity);
    expect(() => WilayaResponseSchema.parse(dto)).not.toThrow();
  });

  it('includes both frName and arName', () => {
    const dto = GeographyMapper.toWilayaDTO(wilayaEntity);
    expect(dto.frName).toBe('Adrar');
    expect(dto.arName).toBe('أدرار');
  });

  it('maps id and wilayaCode correctly', () => {
    const dto = GeographyMapper.toWilayaDTO(wilayaEntity);
    expect(dto.id).toBe(wilayaEntity.id);
    expect(dto.wilayaCode).toBe(wilayaEntity.wilayaCode);
  });
});

describe('GeographyMapper.toCommuneDTO', () => {
  it('produces a DTO that parses CommuneResponseSchema', () => {
    const dto = GeographyMapper.toCommuneDTO(communeEntity);
    expect(() => CommuneResponseSchema.parse(dto)).not.toThrow();
  });

  it('includes both frName and arName', () => {
    const dto = GeographyMapper.toCommuneDTO(communeEntity);
    expect(dto.frName).toBe('Adrar');
    expect(dto.arName).toBe('أدرار');
  });

  it('includes wilayaId', () => {
    const dto = GeographyMapper.toCommuneDTO(communeEntity);
    expect(dto.wilayaId).toBe(communeEntity.wilayaId);
  });
});
