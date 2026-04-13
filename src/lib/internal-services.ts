export interface DoblyInternalServiceStatus {
  id: string;
  label: string;
  configured: boolean;
  description: string;
}

export function getDoblyInternalServices(): DoblyInternalServiceStatus[] {
  return [
    {
      id: "anthropic",
      label: "Anthropic",
      configured: Boolean(process.env.ANTHROPIC_API_KEY),
      description: "AI planning and plain-English explanation layer.",
    },
    {
      id: "resend",
      label: "Resend",
      configured: Boolean(process.env.RESEND_API_KEY),
      description: "Transactional email delivery used by Dobly.",
    },
    {
      id: "stripe",
      label: "Stripe platform",
      configured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      description: "Dobly billing and checkout infrastructure.",
    },
    {
      id: "supabase",
      label: "Supabase",
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      description: "Auth, storage, and workflow runtime state.",
    },
    {
      id: "encryption",
      label: "Encryption key",
      configured: Boolean(process.env.ENCRYPTION_KEY),
      description: "Encrypts connection secrets and verification material.",
    },
    {
      id: "worker",
      label: "Worker secret",
      configured: Boolean(process.env.WORKER_SECRET),
      description: "Protects internal worker and service routes.",
    },
    {
      id: "mpesa",
      label: "M-PESA callback",
      configured: Boolean(process.env.MPESA_CALLBACK_URL),
      description: "Receives Daraja payment callbacks for M-PESA flows.",
    },
  ];
}

export function assertDoblyInternalServicesReady() {
  const missing = getDoblyInternalServices()
    .filter((service) => !service.configured)
    .map((service) => service.label);

  return {
    ready: missing.length === 0,
    missing,
  };
}
