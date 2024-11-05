import { ResultCodes, ResultCodingsDescriptions } from '../helpers/Result';

export type TriggeredBy = 'schedule' | 'manual';

export class ReportMetric {
  private triggeredBy?: TriggeredBy;
  private triggeredStart?: number;
  private triggeredEnd?: number;
  private totalFacilities?: number;
  private facilitiesEvaluated = 0;
  private facilitiesNotEvaluated: Record<string, number> = {};
  private facilitiesEvaluatedModified: Record<string, Record<string, number>> = {};
  private facilitiesEvaluatedNotModified: Record<string, number> = {};
  private configId: string;
  private generalErrors?: Array<string>

  constructor(configId: string) {
    this.configId = configId;
  }

  public updateStart(triggeredBy: TriggeredBy = 'schedule') {
    this.triggeredBy = triggeredBy;
    this.triggeredStart = Date.now();
  }

  public updateEnd() {
    this.triggeredEnd = Date.now();
  }

  private updateMetric(
    fieldName: 'facilitiesEvaluatedNotModified',
    resultCode: ResultCodes | string,
    value?: number
  ) {
    const fieldAccessor = fieldName;
    if (this[fieldAccessor][resultCode] === undefined) {
      this[fieldAccessor][resultCode] = 0;
    }
    if (value) {
      this[fieldAccessor][resultCode] = value;
    } else {
      this[fieldAccessor][resultCode]++;
    }
  }

  public updateGeneralError(errorMessage: string){
    if(this.generalErrors === undefined){
      this.generalErrors = []
    }
    this.generalErrors.push(errorMessage)
  }

  public updateTotalFacilities(value: number) {
    this.totalFacilities = value;
  }

  public updateFacilitiesEvaluated() {
    this.facilitiesEvaluated += 1;
  }

  public updateFacilitiesNotEvaluated(code: ResultCodes | string, value: number) {
    this.facilitiesNotEvaluated[code] = value;
  }

  public updateEvaluatedNotModified(resultCode: ResultCodes | string, value?: number) {
    this.updateMetric('facilitiesEvaluatedNotModified', resultCode, value);
  }

  public updateEvaluatedModified(resultCode: ResultCodes | string, color: string, value?: number) {
    if (this.facilitiesEvaluatedModified[resultCode] === undefined) {
      this.facilitiesEvaluatedModified[resultCode] = {};
    }
    if (this.facilitiesEvaluatedModified[resultCode][color] === undefined) {
      this.facilitiesEvaluatedModified[resultCode][color] = 0;
    }
    this.facilitiesEvaluatedModified[resultCode][color]++;
  }

  public generateJsonReport(closeReport = false) {
    if (closeReport) {
      this.updateEnd();
    }

    const modified = Object.values(this.facilitiesEvaluatedModified).reduce(
      (acc, value) => {
        for (const [key, val] of Object.entries(value)){
            acc.total += val;
            acc[key] = val
        }
        return acc
      },
      { total: 0 } as any
    );

    const notModified = Object.entries(this.facilitiesEvaluatedNotModified).reduce((acc, [key, value]) => {
        acc.total += value;
        acc[key] = {
            total: value,
            description: ResultCodingsDescriptions[key] as string
        }
        return acc
    }, { total: 0 } as any)


    const notEvaluated = Object.entries(this.facilitiesNotEvaluated).reduce((acc, [key, value]) => {
        acc.total += value;
        acc[key] = {
            total: value,
            description: ResultCodingsDescriptions[key] as string
        }
        return acc;
    }, {total: 0} as any)

    return {
      configId: this.configId,
      trigger: {
        by: this.triggeredBy,
        from: this.triggeredStart,
        to: this.triggeredEnd,
        tookMills:
          this.triggeredEnd && this.triggeredStart
            ? ((this.triggeredEnd - this.triggeredStart))
            : undefined
      },
      totalFacilities: this.totalFacilities,
      totalFacilitiesEvaluated: this.facilitiesEvaluated,
      facilitiesEvaluated: {
        total: modified.total + notModified.total,
        modified: {
          ...modified
        },
        notModified: {
          ...notModified
        }
      },
      facilitiesNotEvaluated: {
        ...notEvaluated
      },
      generalErrors: this.generalErrors,
    };
  }
}

export interface JSONMetricReport {
  configId: string;
  trigger: {
    by: TriggeredBy;
    from: number;
    to?: number;
    tookMills?: number;
  };
}

/** Needs some re-achitecturing */
