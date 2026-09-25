import type { Diagnosis, ProbeResult, ProbeName } from './domain.js';

type Results = Record<ProbeName, ProbeResult>;

export function diagnose(results: Results): Diagnosis {
  const gateway = results.gateway.ok;
  const ipv4 = results.ipv4.ok;
  const ipv6 = results.ipv6.ok;
  const dnsSystem = results.dnsSystem.ok;
  const dnsExternal = results.dnsExternal.ok;
  const http = results.http.ok;

  if (!gateway) {
    return {
      isIncident: true,
      classification: 'local-network',
      summary: "La passerelle locale ne répond plus.",
      hints: ['Wi-Fi/LAN', 'interface réseau', 'Livebox locale']
    };
  }

  if (!ipv4) {
    return {
      isIncident: true,
      classification: 'wan-or-routing',
      summary: "La Livebox répond, mais Internet IPv4 n'est plus joignable.",
      hints: ['WAN', 'routage', 'fibre', 'Livebox']
    };
  }

  if (!dnsSystem && dnsExternal) {
    return {
      isIncident: true,
      classification: 'dns-system',
      summary: 'Internet par IP fonctionne, mais le DNS utilisé par le système échoue.',
      hints: ['DNS Livebox', 'configuration DNS du client']
    };
  }

  if (!dnsSystem && !dnsExternal) {
    return {
      isIncident: true,
      classification: 'dns-upstream',
      summary: 'Internet par IP fonctionne, mais les résolutions DNS testées échouent.',
      hints: ['DNS', 'routage UDP/TCP 53', 'Livebox']
    };
  }

  if (!http) {
    return {
      isIncident: true,
      classification: 'application-layer',
      summary: 'IP et DNS fonctionnent, mais le contrôle HTTPS échoue.',
      hints: ['HTTPS/TLS', 'routage applicatif', 'coupure partielle']
    };
  }

  if (!ipv6) {
    return {
      isIncident: false,
      classification: 'ipv6-degraded',
      summary: 'La connectivité principale fonctionne, mais le contrôle IPv6 échoue.',
      hints: ['IPv6 peut être indisponible ou désactivé sans provoquer une panne IPv4.']
    };
  }

  return {
    isIncident: false,
    classification: 'healthy',
    summary: 'Les contrôles principaux sont opérationnels.',
    hints: []
  };
}
