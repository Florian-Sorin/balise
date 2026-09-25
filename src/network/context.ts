import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';
import type { NetworkContext } from '../domain.js';

const execFileAsync = promisify(execFile);

interface WindowsRouteInfo {
  InterfaceAlias?: string;
  IPv4Address?: string;
  NextHop?: string;
}

async function windowsRouteInfo(): Promise<WindowsRouteInfo> {
  const script = [
    "$r = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric,InterfaceMetric | Select-Object -First 1;",
    "if ($null -eq $r) { '{}' ; exit 0 }",
    '$ip = Get-NetIPAddress -InterfaceIndex $r.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {$_.IPAddress -notlike \'169.254.*\'} | Select-Object -First 1;',
    '[PSCustomObject]@{ InterfaceAlias=$r.InterfaceAlias; IPv4Address=$ip.IPAddress; NextHop=$r.NextHop } | ConvertTo-Json -Compress'
  ].join(' ');

  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', script], {
    windowsHide: true,
    timeout: 2500
  });
  return JSON.parse(stdout.trim() || '{}') as WindowsRouteInfo;
}

interface WifiInfo {
  ssid: string | null;
  bssid: string | null;
  signalPercent: number | null;
  channel: number | null;
  radioType: string | null;
}

function parseNetshWifi(output: string): WifiInfo {
  const lines = output.split(/\r?\n/).map((line) => line.trim());
  const valueAfterColon = (line: string): string => line.slice(line.indexOf(':') + 1).trim();

  const bssidLine = lines.find((line) => /BSSID\s*:/i.test(line));
  const signalLine = lines.find((line) => /Signal|Signal\s*:/i.test(line));
  const channelLine = lines.find((line) => /Channel|Canal/i.test(line));
  const radioLine = lines.find((line) => /Radio type|Type de radio/i.test(line));
  const ssidLine = lines.find((line) => /(^|\s)SSID\s*:/i.test(line) && !/BSSID/i.test(line));

  const signalMatch = signalLine?.match(/(\d{1,3})\s*%/);
  const channelMatch = channelLine?.match(/:\s*(\d+)/);

  return {
    ssid: ssidLine ? valueAfterColon(ssidLine) : null,
    bssid: bssidLine ? valueAfterColon(bssidLine) : null,
    signalPercent: signalMatch ? Number(signalMatch[1]) : null,
    channel: channelMatch ? Number(channelMatch[1]) : null,
    radioType: radioLine ? valueAfterColon(radioLine) : null
  };
}

async function windowsWifiInfo(): Promise<WifiInfo> {
  try {
    const { stdout } = await execFileAsync('netsh.exe', ['wlan', 'show', 'interfaces'], {
      windowsHide: true,
      timeout: 2500
    });
    return parseNetshWifi(stdout);
  } catch {
    return { ssid: null, bssid: null, signalPercent: null, channel: null, radioType: null };
  }
}

function fallbackContext(): NetworkContext {
  const interfaces = os.networkInterfaces();
  for (const [name, addresses] of Object.entries(interfaces)) {
    const address = addresses?.find((item) => item.family === 'IPv4' && !item.internal);
    if (address) {
      return {
        platform: process.platform,
        interfaceAlias: name,
        localAddress: address.address,
        gateway: null,
        ssid: null,
        bssid: null,
        signalPercent: null,
        channel: null,
        radioType: null
      };
    }
  }

  return {
    platform: process.platform,
    interfaceAlias: null,
    localAddress: null,
    gateway: null,
    ssid: null,
    bssid: null,
    signalPercent: null,
    channel: null,
    radioType: null
  };
}

export async function getNetworkContext(): Promise<NetworkContext> {
  if (process.platform !== 'win32') return fallbackContext();

  try {
    const [route, wifi] = await Promise.all([windowsRouteInfo(), windowsWifiInfo()]);
    return {
      platform: process.platform,
      interfaceAlias: route.InterfaceAlias ?? null,
      localAddress: route.IPv4Address ?? null,
      gateway: route.NextHop ?? null,
      ...wifi
    };
  } catch {
    return fallbackContext();
  }
}
