"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useMemo } from "react";

const particles = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  size: 6 + (index % 4) * 4,
  left: 10 + ((index * 11) % 78),
  top: 8 + ((index * 7) % 82),
  delay: index * 0.22,
  duration: 4.8 + (index % 5) * 0.8,
}));

export default function DoblyHeroScene() {
  const rotateX = useSpring(0, { stiffness: 120, damping: 14, mass: 0.7 });
  const rotateY = useSpring(0, { stiffness: 120, damping: 14, mass: 0.7 });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(40);

  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.55), transparent 28%)`;

  const rings = useMemo(
    () =>
      Array.from({ length: 3 }, (_, index) => ({
        id: index,
        size: 220 + index * 90,
        duration: 9 + index * 2,
      })),
    [],
  );

  return (
    <motion.div
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        rotateY.set((px - 0.5) * 14);
        rotateX.set((0.5 - py) * 14);
        glareX.set(px * 100);
        glareY.set(py * 100);
      }}
      onPointerLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
        glareX.set(50);
        glareY.set(40);
      }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="group relative mx-auto w-full max-w-[620px] perspective-[1600px]"
    >
      <div className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,rgba(196,80,26,0.24),transparent_62%)] blur-3xl" />
      {rings.map((ring) => (
        <motion.div
          key={ring.id}
          animate={{ rotate: 360 }}
          transition={{ duration: ring.duration, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/2 top-1/2 rounded-full border border-[rgba(196,80,26,0.14)]"
          style={{
            width: ring.size,
            height: ring.size,
            marginLeft: -(ring.size / 2),
            marginTop: -(ring.size / 2),
            transform: `translateZ(${-40 * ring.id}px)`,
          }}
        />
      ))}

      <div className="relative overflow-hidden rounded-[34px] border border-[rgba(118,57,26,0.18)] bg-[linear-gradient(155deg,rgba(255,250,244,0.94),rgba(241,227,211,0.9)_35%,rgba(225,202,178,0.88)_100%)] p-5 shadow-[0_30px_80px_rgba(86,39,17,0.2)]">
        <div className="absolute inset-0 rounded-[34px] bg-[linear-gradient(160deg,rgba(255,255,255,0.28),transparent_28%,rgba(26,15,8,0.06)_100%)]" />
        <motion.div
          style={{ backgroundImage: glare }}
          className="absolute inset-0 rounded-[34px] opacity-80 mix-blend-screen"
        />

        {particles.map((particle) => (
          <motion.span
            key={particle.id}
            animate={{ y: [0, -14, 0], opacity: [0.2, 0.75, 0.2], scale: [0.92, 1.08, 0.92] }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: particle.delay,
            }}
            className="absolute rounded-full bg-[rgba(196,80,26,0.38)] blur-[1px]"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
            }}
          />
        ))}

        <div className="relative rounded-[28px] border border-[rgba(255,255,255,0.45)] bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.18))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_20px_38px_rgba(95,47,22,0.12)] [transform:translateZ(72px)]">
          <div className="rounded-[22px] border border-[rgba(118,57,26,0.1)] bg-[#1E1E1C] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(245,237,228,0.46)]">Live Studio</p>
                <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#F5EDE4]">Work, handled.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F5EDE4]/35" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#C4501A]/90" />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="overflow-hidden rounded-[22px] border border-[rgba(245,237,228,0.08)] bg-[linear-gradient(180deg,rgba(245,237,228,0.06),rgba(245,237,228,0.02))] p-3">
                <img
                  src="/dobly-hero-scene.svg"
                  alt="Dobly orchestration artwork"
                  className="h-auto w-full rounded-[18px] transition duration-500 group-hover:scale-[1.03]"
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="rounded-[20px] border border-[rgba(245,237,228,0.08)] bg-[rgba(245,237,228,0.06)] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[rgba(245,237,228,0.45)]">Signal</p>
                  <div className="mt-3 space-y-2">
                    {[
                      ["Inbox", "Sorted"],
                      ["Approvals", "Ready"],
                      ["Runs", "Stable"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-2xl bg-[rgba(0,0,0,0.16)] px-3 py-2">
                        <span className="text-xs text-[rgba(245,237,228,0.65)]">{label}</span>
                        <span className="rounded-full bg-[rgba(196,80,26,0.16)] px-2 py-1 text-[11px] text-[#F5EDE4]">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[20px] border border-[rgba(245,237,228,0.08)] bg-[linear-gradient(180deg,rgba(196,80,26,0.16),rgba(196,80,26,0.04))] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[rgba(245,237,228,0.45)]">Throughput</p>
                  <div className="mt-4 flex items-end gap-2">
                    {[32, 58, 44, 76, 68, 92].map((height, index) => (
                      <motion.span
                        key={height}
                        animate={{ height: [height - 10, height, height - 6] }}
                        transition={{ duration: 2.6 + index * 0.22, repeat: Infinity, ease: "easeInOut" }}
                        className="block w-full rounded-full bg-[linear-gradient(180deg,rgba(245,237,228,0.95),rgba(196,80,26,0.78))]"
                        style={{ height }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
