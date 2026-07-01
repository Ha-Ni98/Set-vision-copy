import { describe, it, expect } from 'vitest';
import { DeliveryCompanyMapper } from '../../../../src/modules/delivery-company/delivery-company.mapper';
import { DeliveryCompanyResponseSchema } from '@my-app/contract';

const entity = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  name: 'Fast Delivery',
  registeredName: 'Fast Delivery SARL',
  isActive: true,
  orders: [],
};

describe('DeliveryCompanyMapper.toDTO', () => {
  it('produces a DTO that parses DeliveryCompanyResponseSchema', () => {
    const dto = DeliveryCompanyMapper.toDTO(entity);
    expect(() => DeliveryCompanyResponseSchema.parse(dto)).not.toThrow();
  });

  it('maps all fields correctly', () => {
    const dto = DeliveryCompanyMapper.toDTO(entity);
    expect(dto.id).toBe(entity.id);
    expect(dto.name).toBe(entity.name);
    expect(dto.registeredName).toBe(entity.registeredName);
    expect(dto.isActive).toBe(entity.isActive);
  });
});

describe('DeliveryCompanyMapper.toPersistence', () => {
  it('trims name and registeredName', () => {
    const result = DeliveryCompanyMapper.toPersistence({ name: '  Trimmed  ', registeredName: '  Also trimmed  ' });
    expect(result.name).toBe('Trimmed');
    expect(result.registeredName).toBe('Also trimmed');
  });

  it('omits undefined fields', () => {
    const result = DeliveryCompanyMapper.toPersistence({ name: 'Only name' });
    expect(result.name).toBe('Only name');
    expect(result.registeredName).toBeUndefined();
  });
});
