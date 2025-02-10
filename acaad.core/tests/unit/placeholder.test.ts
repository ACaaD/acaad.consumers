import { DependencyInjectionTokens } from '../../src';

describe('DependencyInjectionTokens', () => {
  describe('constants', () => {
    it('should define ConnectionManager', () => {
      expect(DependencyInjectionTokens.ConnectionManager).toBe('connection-manager');
    });
  });
});
