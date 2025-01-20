export class ComponentDescriptor {
  public name: string;

  public constructor(name: string) {
    this.name = name;
  }

  public toIdentifier(): string {
    return this.name;
  }
}
