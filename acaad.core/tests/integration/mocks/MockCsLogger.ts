import { Cause } from 'effect';
import { ICsLogger } from '@acaad/abstractions';

export class MockCsLogger implements ICsLogger {
  logTrace(...data: any[]): void {
    this.log('trace', ...data);
  }

  logDebug(...data: any[]): void {
    this.log('debug', ...data);
  }

  logInformation(...data: any[]): void {
    this.log('info', ...data);
  }

  logWarning(...data: any[]): void {
    this.log('warn', ...data);
  }

  logError(cause?: Cause.Cause<unknown>, error?: Error, ...data: any[]): void {
    if (cause) {
      console.error(Cause.pretty(cause), cause.toJSON(), ...data);
      return;
    }

    if (error) {
      console.error(error, ...data);
      return;
    }

    console.error(...data);
  }

  private log(level: string, ...data: any[]): void {
    console.log(`[${level.padStart(5, ' ')}][${new Date().toISOString()}]`, ...data);
  }
}
