import { describe, it, expect } from 'vitest';

describe('Verificar que Vitest funciona', () => {
  it('suma basica', () => {
    expect(1 + 1).toBe(2);
  });

  it('resta basica', () => {
    expect(5 - 3).toBe(2);
  });

  it('string correcto', () => {
    expect('HilosApp').toBe('HilosApp');
  });
});