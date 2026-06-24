export const TOP_UP_OPERATING_RATIO_BPS = 7_000;

export function createFundingIdempotencyKey(provider: string, kind: "plan" | "topup", reference: string) {
  return `${kind}:${provider}:${reference}`;
}

export function calculateTopUpOperatingAmount(paidAmountMinor: number) {
  return Math.max(0, Math.floor((paidAmountMinor * TOP_UP_OPERATING_RATIO_BPS) / 10_000));
}

export function deriveCapacityStatus(spendableMinor: number, allowanceMinor: number) {
  const ratio = allowanceMinor > 0 ? spendableMinor / allowanceMinor : 0;
  return {
    remainingPercent: Math.max(0, Math.min(100, Math.round(ratio * 100))),
    status: spendableMinor <= 0 ? "exhausted" : ratio <= 0.1 ? "critical" : ratio <= 0.25 ? "warning" : "healthy",
  } as const;
}

export function failedProviderCharge(input: {
  paidRail: boolean;
  estimatedMinor: number;
  errorMessage: string;
}) {
  if (!input.paidRail || input.errorMessage.toLowerCase().includes("not configured")) return 0;
  return Math.max(0, Math.round(input.estimatedMinor));
}
