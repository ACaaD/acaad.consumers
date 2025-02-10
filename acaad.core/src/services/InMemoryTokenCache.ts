import { injectable } from 'tsyringe';
import { Option } from 'effect';

import { ITokenCache, AcaadAuthentication, OAuth2Token } from '@acaad/abstractions';

@injectable<ITokenCache>()
export class InMemoryTokenCache implements ITokenCache {
  getAsync(authentication: AcaadAuthentication): Promise<Option.Option<OAuth2Token>> {
    throw new Error('Method not implemented. This is a dummy change.');
  }
}
