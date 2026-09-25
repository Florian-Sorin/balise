export type ProbeName =
  | 'gateway'
  | 'ipv4'
  | 'ipv6'
  | 'dnsSystem'
  | 'dnsExternal'
  | 'http';

export interface ProbeResult {
  name: ProbeName;
  ok: boolean;
  latencyMs: number | null;
  target: string;
  detail?: string;
}

export interface NetworkContext {
  platform: NodeJS.Platform;
  interfaceAlias: string | null;
  localAddress: string | null;
  gateway: string | null;
  ssid: string | null;
  bssid: string | null;
  signalPercent: number | null;
  channel: number | null;
  radioType: string | null;
}

export interface ProbeSample {
  id?: number;
  capturedAt: string;
  context: NetworkContext;
  results: Record<ProbeName, ProbeResult>;
  diagnosis: Diagnosis;
}

export type IncidentClassification =
  | 'healthy'
  | 'local-network'
  | 'wan-or-routing'
  | 'dns-system'
  | 'dns-upstream'
  | 'application-layer'
  | 'ipv6-degraded'
  | 'client-device'
  | 'unknown';

export interface Diagnosis {
  isIncident: boolean;
  classification: IncidentClassification;
  summary: string;
  hints: string[];
}

export interface Incident {
  id: number;
  startedAt: string;
  endedAt: string | null;
  status: 'open' | 'closed';
  trigger: 'automatic' | 'manual';
  classification: IncidentClassification;
  summary: string;
}
