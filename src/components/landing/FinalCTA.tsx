"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FinalCTA() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("Describe something you do manually, every day...");

  return (
    <section className="relative z-[1] overflow-hidden py-40">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(79,70,229,0.08)_0%,transparent_60%)]" />
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <h2 className="max-w-[920px] font-display text-[52px] font-extrabold leading-[1] tracking-[-0.05em] text-white lg:text-[64px]">
          Your work should run
          <span className="mt-2 block font-serif text-[0.9em] italic text-[rgba(255,255,255,0.78)]">
            even when you do not.
          </span>
        </h2>
        <p className="mt-6 text-[16px] text-[var(--text-secondary)]">
          Set it up once. Dobly keeps it alive.
        </p>

        <div className="glass mt-10 flex w-full max-w-[720px] flex-col gap-3 rounded-[1rem] border border-white/10 p-3 sm:flex-row sm:items-center">
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[14px] text-white outline-none placeholder:text-[rgba(255,255,255,0.35)]"
            placeholder="Describe something you do manually, every day..."
          />
          <button
            type="button"
            onClick={() => router.push(`/auth/signup?prompt=${encodeURIComponent(prompt.trim())}`)}
            className="btn-primary rounded-xl px-5 py-3 text-[14px] font-semibold text-[#08080e]"
            data-cursor="hover"
          >
            Get started free {"->"}
          </button>
        </div>

        <div className="mt-5 text-[13px] text-[rgba(255,255,255,0.35)]">
          No credit card. No setup fee. First 1,000 runs free.
        </div>
        <div className="mt-8 font-mono text-[12px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.3)]">
          Dobly - Built for operators, not engineers.
        </div>
      </div>
    </section>
  );
}
