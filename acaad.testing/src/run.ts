import { getTestLogger, ServerMocks } from './index';

let servers: ServerMocks | undefined;

const log = getTestLogger('Servers');

const serverPromise = ServerMocks.createMockServersAsync(
  undefined,
  {
    switchCount: 0,
    sensorCount: 1,
    buttonCount: 0
  },
  {
    api: 15000,
    adminApi: 25000,
    signalr: 16000
  }
).then((s) => {
  servers = s;
  servers
    .startAsync()
    .then((s) => log('started'))
    .catch((err) => log('An error occurred starting servers.', err));
});

process.on('SIGINT', () => {
  log('Caught interrupt signal');

  servers
    ?.disposeAsync()
    .then(() => log('Successfully stopped servers.'))
    .catch((reason) => log('An error occurred stopping servers.', reason))
    .finally(() => process.exit());
});
