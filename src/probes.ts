import { execFile } from 'node:child_process';
import dns from 'node:dns';
import { performance } from 'node:perf_hooks';
import { promisify } from 'node:util';
import { diagnose } from './diagnostics.js';
import type { NetworkContext, ProbeName, ProbeResult, ProbeSample } from './domain.js';

const execFileAsync = promisify(execFile);

async function timedProbe(name: ProbeName, target: string, fn: () => Promise<void>): Promise<ProbeResult> {
  const started = performance.now();
  try {
    await fn();
    return { name, target, ok: true, latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    return {
      name,
      target,
      ok: false,
      latencyMs: Math.round(performance.now() - started),
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

async function ping(target: string, family: 4 | 6): Promise<void> {
  const args = process.platform === 'win32'
    ? [...(family === 6 ? ['-6'] : ['-4']), '-n', '1', '-w', '1500', target]
    : [...(family === 6 ? ['-6'] : ['-4']), '-c', '1', '-W', '2', target];
  await execFileAsync('ping', args, { timeout: 2500, windowsHide: true });
}

async function externalDns(): Promise<void> {
  const resolver = new dns.promises.Resolver();
  resolver.setServers(['1.1.1.1', '1.0.0.1']);
  await resolver.resolve4('example.com');
}

async function httpsProbe(): Promise<void> {
  const response = await fetch('https://connectivitycheck.gstatic.com/generate_204', {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(3000),
    cache: 'no-store'
  });
  if (response.status !== 204 && !response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

export async function collectProbeSample(context: NetworkContext): Promise<ProbeSample> {
  const gatewayTarget = context.gateway ?? '192.168.1.1';

  const [gateway, ipv4, ipv6, dnsSystem, dnsExternal, http] = await Promise.all([
    timedProbe('gateway', gatewayTarget, () => ping(gatewayTarget, 4)),
    timedProbe('ipv4', '1.1.1.1', () => ping('1.1.1.1', 4)),
    timedProbe('ipv6', '2606:4700:4700::1111', () => ping('2606:4700:4700::1111', 6)),
    timedProbe('dnsSystem', 'example.com (system)', async () => { await dns.promises.resolve4('example.com'); }),
    timedProbe('dnsExternal', 'example.com @ 1.1.1.1', externalDns),
    timedProbe('http', 'connectivitycheck.gstatic.com', httpsProbe)
  ]);

  const results = { gateway, ipv4, ipv6, dnsSystem, dnsExternal, http };
  return {
    capturedAt: new Date().toISOString(),
    context,
    results,
    diagnosis: diagnose(results)
  };
}
