export class AcaadError {
    public _tag: string = "AcaadError";

    public error: any;
    public message?: string;
    
    public constructor(
        error: any, 
        message?: string,
    ) {
        this.error = error;
        this.message = message
    }
}
