import "server-only";

import { timingSafeEqual } from "node:crypto";

export function secureSecretMatches(expected: string | null | undefined, provided: string | null | undefined) {
  if (!expected || !provided) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}
