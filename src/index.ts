import { loadConfig } from './config.js';
import { BaliseDatabase } from './db.js';
import { IncidentTracker } from './incidents.js';
import { getNetworkContext } from './network/context.js';
import { collectProbeSample } from './probes.js';
import { buildServer } from './server.js';

const config = loadConfig();
const db = new BaliseDatabase(config.dbPath);
const tracker = new IncidentTracker(db, config.failureThreshold, config.recoveryThreshold);
const server = buildServer(db);

let running = true;
let collecting = false;

async function collectOnce(): Promise<void> {
  if (collecting) return;
  collecting = true;
  try {
    const context = await getNetworkContext();
    const sample = await collectProbeSample(context);
    db.insertSample(sample);
    tracker.process(sample);
  } catch (error) {
    server.log.error({ err: error }, 'Probe cycle failed');
  } finally {
    collecting = false;
  }
}

async function main(): Promise<void> {
  db.pruneSamples(config.retentionDays);
  await collectOnce();
  const timer = setInterval(() => void collectOnce(), config.intervalMs);

  const shutdown = async (signal: string) => {
    if (!running) return;
    running = false;
    clearInterval(timer);
    server.log.info({ signal }, 'Stopping Balise');
    await server.close();
    db.close();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await server.listen({ host: config.host, port: config.port });
  server.log.info(`Balise is available on http://${config.host}:${config.port}`);
}

void main();
