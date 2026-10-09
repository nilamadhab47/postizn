import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.",
  "metadata.google.internal",
  "metadata",
]);

export function isPrivateIp(ip: string) {
  const value = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (value === "::1" || value === "0.0.0.0") return true;
  if (value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) {
    return true;
  }
  const ipv4 = value.includes(":") ? mappedIpv4(value) : value;
  if (!ipv4 || !isIP(ipv4)) {
    return value.includes(":");
  }
  const parts = ipv4.split(".").map(Number);
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function mappedIpv4(ip: string) {
  const match = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return match?.[1] ?? null;
}

export function hostAllowed(host: string, allowedHosts: string[]) {
  const name = host.toLowerCase().replace(/\.$/, "");
  if (!allowedHosts.length) return false;
  return allowedHosts.some((row) => row.toLowerCase() === name);
}

export async function assertSafeMediaUrl(url: string, allowedHosts: string[]) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Media URL is not valid");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Media URL must be http(s)");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Media URL must not include credentials");
  }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".localhost")) {
    throw new Error("Media host is not allowed");
  }
  if (!hostAllowed(host, allowedHosts)) {
    throw new Error("Media host is not allowed");
  }
  const ips = isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map((row) => row.address);
  if (!ips.length || ips.some(isPrivateIp)) {
    throw new Error("Media host is not allowed");
  }
}
