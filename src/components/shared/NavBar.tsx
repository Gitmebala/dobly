"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const links = [
    { href: "#product", label: "Product" },
    { href: "#pricing", label: "Pricing" },
    { href: "#compare", label: "Compare" },
  ] as const;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[100] transition-all duration-300 ${
        scrolled
          ? "border-b border-[rgba(0,255,135,0.1)] bg-[rgba(8,8,14,0.72)] backdrop-blur-[20px]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo
          href="/"
          className="text-white"
          markClassName="inline-flex h-8 w-8"
          wordmarkClassName="text-[20px] tracking-[-0.04em]"
        />

        <nav className="hidden items-center gap-8 md:flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-[13px] text-[rgba(255,255,255,0.5)] transition-colors duration-200 hover:text-white"
              data-cursor="hover"
            >
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href="/auth/signup"
          className="rounded-full border border-[var(--rust)] px-4 py-2 text-[12px] text-[var(--rust)] transition-all duration-200 hover:bg-[var(--rust)] hover:text-[var(--clay)]"
          data-cursor="hover"
        >
          Get started
        </Link>
      </div>
    </header>
  );
}
