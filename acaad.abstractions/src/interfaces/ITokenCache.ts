import { OAuth2Token, AcaadAuthentication } from '../model';
import { Option } from 'effect';

export interface ITokenCache {
  getAsync(authentication: AcaadAuthentication): Promise<Option.Option<OAuth2Token>>;
}
