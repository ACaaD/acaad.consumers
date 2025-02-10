import { AcaadEvent, AcaadEventSchema } from './AcaadEvent';
import { AcaadOutcome, AcaadOutcomeSchema } from '../AcaadOutcome';
import { Schema } from 'effect';
import { ComponentSchema } from '../Component';
import { AcaadComponentMetadata } from '../AcaadComponentManager';
import { ComponentType } from '../ComponentType';
export const ComponentCommandOutcomeEventSchema = Schema.Struct({
  ...AcaadEventSchema.fields,
  topic: Schema.Literal('Events'),
  type: Schema.Literal('Outcome'),
  name: Schema.Literal('ComponentCommandOutcomeEvent'),
  component: ComponentSchema,

  outcome: AcaadOutcomeSchema
});

export class ComponentCommandOutcomeEvent extends AcaadEvent {
  public outcome: AcaadOutcome;
  public component: AcaadComponentMetadata;

  public constructor(obj: Schema.Schema.Type<typeof ComponentCommandOutcomeEventSchema>) {
    super(obj.topic, obj.type, obj.name);
    this.outcome = new AcaadOutcome(obj.outcome);
    this.component = new AcaadComponentMetadata(obj.component.type, obj.component.name); // TODO: Check if the CS should be asked to give the CD
  }

  public static Create(
    componentType: ComponentType,
    componentName: string,
    outcome: AcaadOutcome
  ): ComponentCommandOutcomeEvent {
    return new ComponentCommandOutcomeEvent({
      topic: 'Events',
      type: 'Outcome',
      name: 'ComponentCommandOutcomeEvent',
      component: {
        type: componentType,
        name: componentName
      },
      outcome: {
        success: outcome.success,
        outcomeRaw: outcome.outcomeRaw
      }
    });
  }
}
