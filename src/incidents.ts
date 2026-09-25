import type { BaliseDatabase } from './db.js';
import type { ProbeSample } from './domain.js';

export class IncidentTracker {
  private failures = 0;
  private recoveries = 0;
  private firstFailureAt: string | null = null;
  private activeIncidentId: number | null = null;

  constructor(
    private readonly db: BaliseDatabase,
    private readonly failureThreshold: number,
    private readonly recoveryThreshold: number
  ) {
    this.activeIncidentId = db.getOpenAutomaticIncident()?.id ?? null;
  }

  process(sample: ProbeSample): void {
    if (sample.diagnosis.isIncident) {
      this.recoveries = 0;
      this.failures += 1;
      this.firstFailureAt ??= sample.capturedAt;

      if (this.activeIncidentId !== null) {
        this.db.updateIncident(this.activeIncidentId, sample.diagnosis.classification, sample.diagnosis.summary);
        return;
      }

      if (this.failures >= this.failureThreshold) {
        this.activeIncidentId = this.db.createIncident({
          startedAt: this.firstFailureAt,
          trigger: 'automatic',
          classification: sample.diagnosis.classification,
          summary: sample.diagnosis.summary
        });
      }
      return;
    }

    this.failures = 0;
    this.firstFailureAt = null;

    if (this.activeIncidentId === null) return;

    this.recoveries += 1;
    if (this.recoveries >= this.recoveryThreshold) {
      this.db.closeIncident(this.activeIncidentId, sample.capturedAt);
      this.activeIncidentId = null;
      this.recoveries = 0;
    }
  }
}
