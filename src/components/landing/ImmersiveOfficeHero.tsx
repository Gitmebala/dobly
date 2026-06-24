"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  Clock3,
  MailCheck,
  Sparkles,
  Waves,
} from "lucide-react";

const PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  size: 4 + (index % 4) * 2,
  left: 8 + (index * 5) % 84,
  top: 10 + (index * 7) % 72,
  delay: `${(index % 6) * 0.7}s`,
  duration: `${7 + (index % 5)}s`,
}));

const ORBIT_NODES = [
  {
    label: "Customer Office",
    body: "Leads answered in 2 min",
    className: "left-[8%] top-[17%]",
  },
  {
    label: "Finance Office",
    body: "Collections pushed automatically",
    className: "right-[10%] top-[20%]",
  },
  {
    label: "Growth Office",
    body: "Signal surfaced for campaign launch",
    className: "left-[15%] bottom-[14%]",
  },
  {
    label: "Operations",
    body: "Supplier handoff completed",
    className: "right-[14%] bottom-[12%]",
  },
];

export default function ImmersiveOfficeHero() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const transforms = useMemo(
    () => ({
      core: {
        transform: `translate3d(${pointer.x * 14}px, ${pointer.y * 12}px, 0) rotateX(${
          pointer.y * -4
        }deg) rotateY(${pointer.x * 5}deg)`,
      },
      orbit: {
        transform: `translate3d(${pointer.x * 10}px, ${pointer.y * 10}px, 0) rotateX(${
          pointer.y * -2
        }deg)`,
      },
      halo: {
        transform: `translate3d(${pointer.x * 18}px, ${pointer.y * 16}px, 0)`,
      },
    }),
    [pointer.x, pointer.y],
  );

  return (
    <div
      className="hero-depth-stage relative min-h-[640px] overflow-hidden rounded-[34px] border border-[rgba(242,232,220,0.1)] bg-[radial-gradient(circle_at_50%_18%,rgba(255,221,186,0.16),transparent_24%),radial-gradient(circle_at_18%_22%,rgba(196,80,26,0.18),transparent_30%),radial-gradient(circle_at_78%_30%,rgba(94,184,255,0.18),transparent_24%),linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4 shadow-[0_48px_160px_rgba(0,0,0,0.35)] sm:p-6"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        setPointer({ x, y });
      }}
      onMouseLeave={() => setPointer({ x: 0, y: 0 })}
    >
      <div className="pointer-events-none absolute inset-0">
        {PARTICLES.map((particle) => (
          <span
            key={particle.id}
            className="hero-particle"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-12 top-8 h-40 rounded-full bg-[radial-gradient(circle,rgba(255,224,194,0.2),transparent_68%)] blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 rounded-[30px] border border-[rgba(242,232,220,0.08)]"
        style={transforms.halo}
      />

      <div className="relative h-full min-h-[590px] perspective-[2200px]">
        <div className="absolute inset-0" style={transforms.orbit}>
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(242,232,220,0.09)] hero-orbit-ring" />
          <div className="absolute left-1/2 top-1/2 h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(196,80,26,0.18)] hero-orbit-ring-delayed" />
          <div className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(94,184,255,0.18)] hero-orbit-ring-slow" />
        </div>

        {ORBIT_NODES.map((node) => (
          <div
            key={node.label}
            className={`absolute ${node.className} w-[220px] rounded-[24px] border border-[rgba(242,232,220,0.1)] bg-[rgba(17,17,16,0.46)] p-4 backdrop-blur-2xl hero-floating-card`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--dobly-text-dim)]">
                Worker live
              </span>
              <ArrowUpRight className="h-4 w-4 text-[var(--dobly-accent)]" />
            </div>
            <div className="mt-3 text-sm font-semibold text-[var(--dobly-text)]">{node.label}</div>
            <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">{node.body}</p>
          </div>
        ))}

        <div
          className="absolute left-1/2 top-1/2 w-full max-w-[360px] -translate-x-1/2 -translate-y-1/2"
          style={transforms.core}
        >
          <div className="hero-core-shell relative overflow-hidden rounded-[30px] border border-[rgba(242,232,220,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[0_32px_110px_rgba(0,0,0,0.34)]">
            <div className="absolute inset-x-10 top-0 h-16 rounded-full bg-[radial-gradient(circle,rgba(255,226,196,0.26),transparent_72%)] blur-2xl" />
            <div className="rounded-[24px] border border-[rgba(242,232,220,0.08)] bg-[rgba(20,20,18,0.66)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(196,80,26,0.24)] bg-[rgba(196,80,26,0.11)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--dobly-accent)]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Dobly core
                  </div>
                  <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[var(--dobly-text)]">
                    Operating the business
                  </div>
                </div>
                <div className="rounded-full bg-[rgba(84,186,123,0.16)] px-3 py-1 text-xs font-semibold text-[#8ce0a6]">
                  17 workers live
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="hero-core-band rounded-[22px] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
                  <div className="flex items-center justify-between text-xs text-[var(--dobly-text-muted)]">
                    <span>Owner brief interpreted</span>
                    <Clock3 className="h-4 w-4 text-[var(--dobly-accent)]" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--dobly-text)]">
                    Qualify every inbound lead, book the strong ones, follow up on missed calls, and escalate VIP risk.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.035)] p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">
                      <MailCheck className="h-4 w-4 text-[var(--dobly-accent)]" />
                      Revenue flow
                    </div>
                    <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--dobly-text)]">
                      12
                    </div>
                    <p className="mt-1 text-xs text-[var(--dobly-text-secondary)]">Qualified conversations on autopilot</p>
                  </div>

                  <div className="rounded-[22px] border border-[rgba(242,232,220,0.08)] bg-[rgba(255,255,255,0.035)] p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">
                      <Activity className="h-4 w-4 text-[#76d6ff]" />
                      Signal field
                    </div>
                    <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--dobly-text)]">
                      3
                    </div>
                    <p className="mt-1 text-xs text-[var(--dobly-text-secondary)]">Opportunities waiting for approval</p>
                  </div>
                </div>

                <div className="rounded-[22px] border border-[rgba(242,232,220,0.08)] bg-[linear-gradient(135deg,rgba(196,80,26,0.12),rgba(94,184,255,0.08))] p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--dobly-text-dim)]">
                    <Waves className="h-4 w-4 text-[var(--dobly-accent)]" />
                    Movement
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-[var(--dobly-text)]">Cross-office coordination is active</div>
                      <p className="mt-2 text-xs leading-5 text-[var(--dobly-text-secondary)]">
                        Reception routed a high-intent lead, Sales booked the call, Finance opened the payment path.
                      </p>
                    </div>
                    <BriefcaseBusiness className="mt-1 h-5 w-5 shrink-0 text-[var(--dobly-accent)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
