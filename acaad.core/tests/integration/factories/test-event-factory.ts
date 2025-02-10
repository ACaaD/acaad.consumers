import { ComponentCommandOutcomeEvent } from '../../../src/model/events/ComponentCommandOutcomeEvent';
import { AcaadOutcome, ComponentType } from '../../../src';

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
