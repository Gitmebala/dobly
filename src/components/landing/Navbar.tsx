"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Sparkles, X } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";

const links = [
  { href: "#command", label: "Command Surface" },
  { href: "#motion-map", label: "Automation Map" },
  { href: "#pricing", label: "Pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "px-3 pt-3" : "px-0 pt-0"
      }`}
    >
      <div
        className={`container-main transition-all duration-300 ${
          scrolled ? "surface-panel rounded-[1.6rem]" : ""
        }`}
      >
        <nav className="flex h-20 items-center justify-between">
          <BrandLogo
            className="group"
            markClassName="h-9 w-9 transition-transform duration-300 group-hover:scale-105"
            wordmarkClassName="text-xl"
          />

          <div className="hidden items-center gap-2 lg:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="btn-ghost">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle />
            <Link href="/auth/login" className="btn-ghost">
              Sign in
            </Link>
            <Link href="/auth/signup" className="btn-primary">
              <Sparkles className="h-4 w-4" />
              Start free
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle compact />
            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              className="theme-chip h-10 w-10 justify-center px-0"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>

        {mobileOpen ? (
          <div className="animate-fade-in border-t border-border px-1 pb-4 lg:hidden">
            <div className="flex flex-col gap-2 pt-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[1.1rem] px-4 py-3 text-sm text-text-muted transition-all hover:bg-surface-1 hover:text-text"
                >
                  {link.label}
                </Link>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link href="/auth/login" className="btn-secondary justify-center">
                  Sign in
                </Link>
                <Link href="/auth/signup" className="btn-primary justify-center">
                  Start free
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
