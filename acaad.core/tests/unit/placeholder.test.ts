import { DependencyInjectionTokens } from '../../src/model/DependencyInjectionTokens';

describe('DependencyInjectionTokens', () => {
  describe('constants', () => {
    it('should define ConnectionManager', () => {
      expect(DependencyInjectionTokens.ConnectionManager).toBe('connection-manager');
    });
  });
});
