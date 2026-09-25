import path from 'node:path';

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export interface Config {
  host: string;
  port: number;
  intervalMs: number;
  dbPath: string;
  retentionDays: number;
  failureThreshold: number;
  recoveryThreshold: number;
}

export function loadConfig(): Config {
  return {
    host: process.env.BALISE_HOST ?? '127.0.0.1',
    port: intEnv('BALISE_PORT', 3210),
    intervalMs: intEnv('BALISE_INTERVAL_MS', 5000),
    dbPath: path.resolve(process.env.BALISE_DB_PATH ?? './data/balise.db'),
    retentionDays: intEnv('BALISE_RETENTION_DAYS', 14),
    failureThreshold: intEnv('BALISE_FAILURE_THRESHOLD', 2),
    recoveryThreshold: intEnv('BALISE_RECOVERY_THRESHOLD', 2)
  };
}
