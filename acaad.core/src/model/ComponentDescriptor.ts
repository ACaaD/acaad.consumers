import { Component } from './Component';

export class ComponentDescriptor {
  public name: string;

  public constructor(name: string) {
    this.name = name;
  }

  public toIdentifier(): string {
    return this.name;
  }

  public is(other: ComponentDescriptor): boolean {
    return this.name === other.name;
  }

  public isComponent(component: Component): boolean {
    return this.name === component.name;
  }
}
