import { ServerMocks } from './index';

let servers: ServerMocks | undefined;
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
    .then((s) => console.log('started'))
    .catch((err) => console.error('An error occurred starting servers.', err));
});

process.on('SIGINT', () => {
  console.log('Caught interrupt signal');

  servers
    ?.disposeAsync()
    .then(() => console.log('Successfully stopped servers.'))
    .catch((reason) => console.error('An error occurred stopping servers.', reason))
    .finally(() => process.exit());
});
