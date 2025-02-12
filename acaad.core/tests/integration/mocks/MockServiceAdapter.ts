import { IAcaadIntegrationTestContext } from '../types';
import { AcaadAuthentication, ComponentDescriptor, AcaadHost } from '@acaad/abstractions';

export function setupConnectedServiceMock(
  intTestContext: IAcaadIntegrationTestContext,
  serverMultiplier: number = 1
) {
  const { serviceAdapterMock } = intTestContext;

  const authentication: AcaadAuthentication | undefined = undefined;

  serviceAdapterMock.getConnectedServersAsync.mockImplementation((as: AbortSignal) => {
    if (serverMultiplier === 1) {
      return Promise.resolve(intTestContext.getHosts());
    }

    const result = Array.from({ length: serverMultiplier })
      .map((_) => intTestContext.getHosts())
      .reduce((prev, curr) => [...prev, ...curr], [])
      .map(
        (host, idx: number) =>
          new AcaadHost(
            `${host.friendlyName}-multiplied-${idx}`,
            host.host,
            host.port,
            host.authentication,
            host.signalrPort
          )
      );

    return Promise.resolve(result);
  });

  serviceAdapterMock.registerStateChangeCallbackAsync.mockResolvedValue();

  serviceAdapterMock.getAllowedConcurrency.mockReturnValue(16);
  serviceAdapterMock.createServerModelAsync.mockResolvedValue();
  serviceAdapterMock.createComponentModelAsync.mockResolvedValue();
  serviceAdapterMock.onServerConnectedAsync.mockResolvedValue();
  serviceAdapterMock.onServerDisconnectedAsync.mockResolvedValue();
  serviceAdapterMock.updateComponentStateAsync.mockResolvedValue();

  serviceAdapterMock.getComponentDescriptorByComponent.mockImplementation(
    (c) => new ComponentDescriptor(c.name)
  );
}
