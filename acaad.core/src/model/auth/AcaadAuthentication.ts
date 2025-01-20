export class AcaadAuthentication {
    public tokenEndpoint: string;
    public clientId: string;
    public clientSecret: string;
    public grants: string[];

    public constructor(tokenEndpoint: string, clientId: string, clientSecret: string, grants: string[]) {
        this.tokenEndpoint = tokenEndpoint;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.grants = grants;
    }
}
