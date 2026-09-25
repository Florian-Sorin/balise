import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Incident, IncidentClassification, ProbeSample } from './domain.js';

export class BaliseDatabase {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS probe_samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        captured_at TEXT NOT NULL,
        context_json TEXT NOT NULL,
        results_json TEXT NOT NULL,
        diagnosis_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_probe_samples_captured_at ON probe_samples(captured_at DESC);

      CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        status TEXT NOT NULL CHECK(status IN ('open','closed')),
        trigger TEXT NOT NULL CHECK(trigger IN ('automatic','manual')),
        classification TEXT NOT NULL,
        summary TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_incidents_started_at ON incidents(started_at DESC);

      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        kind TEXT NOT NULL,
        note TEXT,
        device TEXT,
        incident_id INTEGER REFERENCES incidents(id)
      );

      CREATE TABLE IF NOT EXISTS experiments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        hypothesis TEXT NOT NULL,
        change_description TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        status TEXT NOT NULL DEFAULT 'running',
        result TEXT,
        conclusion TEXT
      );

      CREATE TABLE IF NOT EXISTS configuration_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        captured_at TEXT NOT NULL,
        source TEXT NOT NULL,
        snapshot_json TEXT NOT NULL
      );
    `);
  }

  insertSample(sample: ProbeSample): number {
    const info = this.db.prepare(`
      INSERT INTO probe_samples(captured_at, context_json, results_json, diagnosis_json)
      VALUES (?, ?, ?, ?)
    `).run(
      sample.capturedAt,
      JSON.stringify(sample.context),
      JSON.stringify(sample.results),
      JSON.stringify(sample.diagnosis)
    );
    return Number(info.lastInsertRowid);
  }

  latestSample(): ProbeSample | null {
    const row = this.db.prepare('SELECT * FROM probe_samples ORDER BY id DESC LIMIT 1').get() as any;
    if (!row) return null;
    return {
      id: row.id,
      capturedAt: row.captured_at,
      context: JSON.parse(row.context_json),
      results: JSON.parse(row.results_json),
      diagnosis: JSON.parse(row.diagnosis_json)
    };
  }

  listSamples(limit = 240): ProbeSample[] {
    const rows = this.db.prepare('SELECT * FROM probe_samples ORDER BY id DESC LIMIT ?').all(limit) as any[];
    return rows.map((row) => ({
      id: row.id,
      capturedAt: row.captured_at,
      context: JSON.parse(row.context_json),
      results: JSON.parse(row.results_json),
      diagnosis: JSON.parse(row.diagnosis_json)
    }));
  }

  createIncident(input: {
    startedAt: string;
    trigger: 'automatic' | 'manual';
    classification: IncidentClassification;
    summary: string;
    closed?: boolean;
  }): number {
    const endedAt = input.closed ? input.startedAt : null;
    const info = this.db.prepare(`
      INSERT INTO incidents(started_at, ended_at, status, trigger, classification, summary)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      input.startedAt,
      endedAt,
      input.closed ? 'closed' : 'open',
      input.trigger,
      input.classification,
      input.summary
    );
    return Number(info.lastInsertRowid);
  }

  updateIncident(id: number, classification: IncidentClassification, summary: string): void {
    this.db.prepare('UPDATE incidents SET classification = ?, summary = ? WHERE id = ?').run(classification, summary, id);
  }

  closeIncident(id: number, endedAt: string): void {
    this.db.prepare("UPDATE incidents SET ended_at = ?, status = 'closed' WHERE id = ?").run(endedAt, id);
  }

  getOpenAutomaticIncident(): Incident | null {
    const row = this.db.prepare(
      "SELECT * FROM incidents WHERE status = 'open' AND trigger = 'automatic' ORDER BY id DESC LIMIT 1"
    ).get() as any;
    return row ? mapIncident(row) : null;
  }

  listIncidents(limit = 50): Incident[] {
    const rows = this.db.prepare('SELECT * FROM incidents ORDER BY id DESC LIMIT ?').all(limit) as any[];
    return rows.map(mapIncident);
  }

  addObservation(input: { kind: string; note?: string; device?: string; incidentId?: number }): number {
    const info = this.db.prepare(`
      INSERT INTO observations(created_at, kind, note, device, incident_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(new Date().toISOString(), input.kind, input.note ?? null, input.device ?? null, input.incidentId ?? null);
    return Number(info.lastInsertRowid);
  }

  listObservations(limit = 50): unknown[] {
    return this.db.prepare('SELECT * FROM observations ORDER BY id DESC LIMIT ?').all(limit);
  }

  createExperiment(input: { title: string; hypothesis: string; changeDescription: string }): number {
    const info = this.db.prepare(`
      INSERT INTO experiments(title, hypothesis, change_description, started_at)
      VALUES (?, ?, ?, ?)
    `).run(input.title, input.hypothesis, input.changeDescription, new Date().toISOString());
    return Number(info.lastInsertRowid);
  }

  listExperiments(): unknown[] {
    return this.db.prepare('SELECT * FROM experiments ORDER BY id DESC').all();
  }

  pruneSamples(retentionDays: number): number {
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
    return this.db.prepare('DELETE FROM probe_samples WHERE captured_at < ?').run(cutoff).changes;
  }

  close(): void {
    this.db.close();
  }
}

function mapIncident(row: any): Incident {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status,
    trigger: row.trigger,
    classification: row.classification,
    summary: row.summary
  };
}
