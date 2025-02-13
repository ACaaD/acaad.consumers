describe('api error handling', () => {
  beforeAll(async () => {});

  describe('server metadata query', () => {
    it('should handle unreachable server', async () => {});

    it('should handle invalid openapi response schema', async () => {});

    it('should handle empty server response', async () => {});

    it('should handle 4xx server response', async () => {
      // IDEA: Define on C# side that all 4xx/5xx responses return ProblemDetails,
      // then try to deserialize to that onError and fall back to generic deserialization
    });

    it('should handle 5xx server response', async () => {});

    it('should handle invalid authentication', async () => {
      // TODO
    });
  });

  describe('outbound events', () => {
    it('should handle 4xx server response', async () => {});

    it('should handle 5xx server response', async () => {});

    it('should handle invalid authentication', async () => {
      // TODO
    });
  });

  describe('signalr', () => {
    it('should handle unreachable server', async () => {});

    it('should handle server error on connect', async () => {
      // TODO: TBD how to force an error from the mock?
    });

    it('should handle server error on disconnect', async () => {
      // TODO: TBD how to force an error from the mock?
    });
  });
});
