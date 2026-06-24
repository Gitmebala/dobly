import { isIP } from "node:net";

function isBlockedIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224;
}

function isBlockedIpv6(address: string) {
  const raw = address.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  let normalized = raw;
  try { normalized = new URL(`http://[${raw}]`).hostname.replace(/^\[|\]$/g, ""); } catch { return true; }
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice(7);
    if (mapped.includes(".")) return isBlockedIpv4(mapped);
    const words = mapped.split(":").filter(Boolean).map((part) => Number.parseInt(part, 16));
    if (words.length === 2 && words.every((word) => Number.isInteger(word) && word >= 0 && word <= 0xffff)) {
      return isBlockedIpv4(`${words[0] >> 8}.${words[0] & 255}.${words[1] >> 8}.${words[1] & 255}`);
    }
    return true;
  }
  return normalized === "::" || normalized === "::1" ||
    /^::[0-9a-f]/.test(normalized) ||
    normalized.startsWith("fc") || normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) || normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:") ||
    normalized.startsWith("2002:") || normalized.startsWith("64:ff9b:1:");
}

export function isBlockedNetworkAddress(address: string) {
  const normalized = address.replace(/^\[|\]$/g, "");
  const family = isIP(normalized);
  return family === 4 ? isBlockedIpv4(normalized) : family === 6 ? isBlockedIpv6(normalized) : true;
}
