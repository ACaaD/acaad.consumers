import { AcaadUnitOfMeasure } from './AcaadUnitOfMeasure';

export class AcaadDataMetadata {
  public unitOfMeasureHint?: AcaadUnitOfMeasure;

  public constructor(unitOfMeasureHint?: AcaadUnitOfMeasure) {
    this.unitOfMeasureHint = unitOfMeasureHint;
  }
}
