import { AcaadOutcome, ComponentType, ComponentCommandOutcomeEvent } from '@acaad/abstractions';

export class TestEventFactory {
  public static createComponentOutcomeEvent(
    componentName: string,
    componentType: ComponentType = ComponentType.Sensor,
    outcomeRaw: string = 'test-outcome'
  ) {
    return ComponentCommandOutcomeEvent.Create(
      componentType,
      componentName,
      new AcaadOutcome({
        success: true,
        outcomeRaw: outcomeRaw
      })
    );
  }
}
