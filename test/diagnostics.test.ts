import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnose } from '../src/diagnostics.js';
import type { ProbeName, ProbeResult } from '../src/domain.js';

function result(name: ProbeName, ok: boolean): ProbeResult {
  return { name, ok, latencyMs: 1, target: 'test' };
}

function state(overrides: Partial<Record<ProbeName, boolean>> = {}) {
  const values: Record<ProbeName, boolean> = {
    gateway: true,
    ipv4: true,
    ipv6: true,
    dnsSystem: true,
    dnsExternal: true,
    http: true,
    ...overrides
  };
  return Object.fromEntries(
    Object.entries(values).map(([name, ok]) => [name, result(name as ProbeName, ok)])
  ) as Record<ProbeName, ProbeResult>;
}

test('healthy network is not an incident', () => {
  assert.equal(diagnose(state()).classification, 'healthy');
  assert.equal(diagnose(state()).isIncident, false);
});

test('gateway loss is classified as local network', () => {
  const diagnosis = diagnose(state({ gateway: false, ipv4: false }));
  assert.equal(diagnosis.classification, 'local-network');
  assert.equal(diagnosis.isIncident, true);
});

test('IPv4 loss with gateway alive is WAN/routing', () => {
  assert.equal(diagnose(state({ ipv4: false })).classification, 'wan-or-routing');
});

test('system DNS failure with external DNS alive is DNS system', () => {
  assert.equal(diagnose(state({ dnsSystem: false })).classification, 'dns-system');
});

test('IPv6-only degradation does not open an incident', () => {
  const diagnosis = diagnose(state({ ipv6: false }));
  assert.equal(diagnosis.classification, 'ipv6-degraded');
  assert.equal(diagnosis.isIncident, false);
});
