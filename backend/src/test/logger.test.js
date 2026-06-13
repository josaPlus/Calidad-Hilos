import { describe, it, expect } from 'vitest';
import { generateCorrelationId } from '../utils/logger.js';

describe('logger - generateCorrelationId', () => {
  it('genera un ID único', () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();
    expect(id1).not.toBe(id2);
  });

  it('genera un UUID válido', () => {
    const id = generateCorrelationId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(id)).toBe(true);
  });

  it('genera un string no vacío', () => {
    const id = generateCorrelationId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('genera un ID con 36 caracteres (UUID estándar)', () => {
    const id = generateCorrelationId();
    expect(id.length).toBe(36);
  });

  it('genera IDs diferentes en llamadas consecutivas', () => {
    const ids = Array.from({ length: 5 }, () => generateCorrelationId());
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
  });
});
