import Fastify from 'fastify';
import type { BaliseDatabase } from './db.js';
import { APP_HTML } from './ui.js';

export function buildServer(db: BaliseDatabase) {
  const app = Fastify({ logger: true });

  app.get('/', async (_request, reply) => {
    reply.type('text/html; charset=utf-8').send(APP_HTML);
  });

  app.get('/api/status', async () => ({
    sample: db.latestSample(),
    activeIncident: db.getOpenAutomaticIncident()
  }));

  app.get('/api/incidents', async (request) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(Math.max(Number(query.limit ?? 50) || 50, 1), 200);
    return db.listIncidents(limit);
  });

  app.get('/api/samples', async (request) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(Math.max(Number(query.limit ?? 240) || 240, 1), 2000);
    return db.listSamples(limit);
  });

  app.get('/api/observations', async () => db.listObservations());

  app.post('/api/observations', async (request, reply) => {
    const body = request.body as { kind?: string; note?: string; device?: string };
    if (!body?.kind) return reply.code(400).send({ error: 'kind is required' });
    const id = db.addObservation({ kind: body.kind, note: body.note, device: body.device });
    return reply.code(201).send({ id });
  });

  app.post('/api/observations/phone-loss', async (_request, reply) => {
    const now = new Date().toISOString();
    const sample = db.latestSample();
    const pcLooksHealthy = sample ? !sample.diagnosis.isIncident : false;
    const classification = pcLooksHealthy ? 'client-device' : (sample?.diagnosis.classification ?? 'unknown');
    const summary = pcLooksHealthy
      ? 'Perte Internet signalée sur le téléphone alors que le PC paraît connecté.'
      : `Perte Internet signalée sur le téléphone. État PC : ${sample?.diagnosis.summary ?? 'inconnu'}`;
    const incidentId = db.createIncident({ startedAt: now, trigger: 'manual', classification, summary, closed: true });
    const observationId = db.addObservation({ kind: 'phone-internet-loss', device: 'téléphone', incidentId });
    return reply.code(201).send({ incidentId, observationId });
  });

  app.get('/api/experiments', async () => db.listExperiments());

  app.post('/api/experiments', async (request, reply) => {
    const body = request.body as { title?: string; hypothesis?: string; changeDescription?: string };
    if (!body?.title || !body.hypothesis || !body.changeDescription) {
      return reply.code(400).send({ error: 'title, hypothesis and changeDescription are required' });
    }
    const id = db.createExperiment({
      title: body.title,
      hypothesis: body.hypothesis,
      changeDescription: body.changeDescription
    });
    return reply.code(201).send({ id });
  });

  return app;
}
