import "server-only";

import { createHash } from "node:crypto";

export type EmergencyStop = "execution" | "billing" | "external_actions";

export function isEmergencyStopActive(stop: EmergencyStop) {
  return process.env[`DOBLY_KILL_${stop.toUpperCase()}`] === "true";
}

export function assertEmergencyStopInactive(stop: EmergencyStop) {
  if (isEmergencyStopActive(stop)) {
    throw new Error(`Dobly ${stop.replaceAll("_", " ")} is temporarily paused by operations.`);
  }
}

export function isFeatureEnabled(flag: string, subjectId: string, defaultPercentage = 0) {
  const key = `DOBLY_FEATURE_${flag.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
  const configured = process.env[key]?.trim().toLowerCase();
  if (configured === "true" || configured === "on") return true;
  if (configured === "false" || configured === "off") return false;

  const percentage = configured === undefined ? defaultPercentage : Number(configured);
  if (!Number.isFinite(percentage) || percentage <= 0) return false;
  if (percentage >= 100) return true;
  const bucket = createHash("sha256").update(`${flag}:${subjectId}`).digest().readUInt32BE(0) % 10_000;
  return bucket < Math.round(percentage * 100);
}
