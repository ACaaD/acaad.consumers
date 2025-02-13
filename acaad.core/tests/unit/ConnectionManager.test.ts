import { ConnectionManager } from '../../src/ConnectionManager';
import { IConnectedServiceAdapter, ICsLogger, ITokenCache } from '@acaad/abstractions';
import { QueueWrapper } from '../../src/QueueWrapper';
import { mock, Mock } from 'ts-jest-mocker';
import { Effect, TestContext } from 'effect';
import { setupConnectedServiceMockInstance } from '../integration/mocks/MockServiceAdapter';
import { setupLoggerMock } from './mocks/utility';
import { makeExternalSpan } from '@effect/opentelemetry/Tracer';

describe('ConnectionManager', () => {
  let loggerMock: Mock<ICsLogger>;
  let tokenCacheMock: Mock<ITokenCache>;
  let queueWrapperMock: Mock<QueueWrapper>;
  let connectedServiceMock: Mock<IConnectedServiceAdapter>;

  let instance: ConnectionManager;

  beforeAll(() => {
    loggerMock = mock<ICsLogger>();
    tokenCacheMock = mock<ITokenCache>();
    queueWrapperMock = mock<QueueWrapper>();
    connectedServiceMock = mock<IConnectedServiceAdapter>();

    setupLoggerMock(loggerMock);
    setupConnectedServiceMockInstance(connectedServiceMock);

    instance = new ConnectionManager(loggerMock, tokenCacheMock, connectedServiceMock, queueWrapperMock);
  });

  describe('getTraceHeaders', () => {
    it('should generate request headers', () => {
      const traceId = 'mocked-trace-id';

      const entrySpan = makeExternalSpan({
        traceId,
        spanId: 'unused'
      });

      const result = Effect.runSync(
        instance.getTraceHeaders().pipe(
          Effect.withSpan('test-span', {
            parent: entrySpan
          }),
          Effect.provide(TestContext.TestContext)
        )
      );

      expect(result.traceparent).toMatch(traceId);
    });

    it('should use fallback span if none is provided through context', () => {
      const result = Effect.runSync(instance.getTraceHeaders().pipe(Effect.provide(TestContext.TestContext)));

      // https://www.w3.org/TR/trace-context/
      expect(result.traceparent).toMatch(new RegExp('^\\w{2}-\\w{32}-\\w{16}-\\w{2}$'));
      expect(loggerMock.logError).toHaveBeenCalled();
    });
  });
});
