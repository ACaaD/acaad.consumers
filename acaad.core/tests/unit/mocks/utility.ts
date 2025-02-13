import { ICsLogger } from '@acaad/abstractions';
import { Mock } from 'ts-jest-mocker';

export function setupLoggerMock(loggerMock: Mock<ICsLogger>): void {
  loggerMock.logTrace.mockReturnValue(undefined);
  loggerMock.logDebug.mockReturnValue(undefined);
  loggerMock.logInformation.mockReturnValue(undefined);
  loggerMock.logWarning.mockReturnValue(undefined);
  loggerMock.logError.mockReturnValue(undefined);
}
