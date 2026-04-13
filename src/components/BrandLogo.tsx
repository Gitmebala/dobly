"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/client";

interface SignalMarkProps {
  className?: string;
  animated?: boolean;
  pulseOnly?: boolean;
}

interface Props {
  href?: string;
  showWordmark?: boolean;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  animatedMark?: boolean;
}

export function SignalMark({
  className = "",
  animated = false,
  pulseOnly = false,
}: SignalMarkProps) {
  const gradientId = useId().replace(/:/g, "");
  const shellClass = animated
    ? "signal-mark-shell signal-mark-shell--spin"
    : pulseOnly
      ? "signal-mark-shell signal-mark-shell--pulse"
      : "signal-mark-shell";

  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {animated ? <circle className="signal-mark-halo" cx="40" cy="40" r="21" fill={`url(#${gradientId})`} /> : null}
      <path
        className={shellClass}
        d="M40 6 C60 6,74 20,74 40 C74 58,62 74,40 74 C24 74,8 62,6 44 C4 28,16 6,40 6Z"
        stroke="currentColor"
        strokeWidth="3"
        fill="rgba(79,70,229,0.12)"
      />
      <path
        className={animated ? "signal-mark-inner signal-mark-inner--pulse" : "signal-mark-inner"}
        d="M40 16 C55 16,64 26,64 40 C64 53,55 63,40 63 C28 63,18 55,17 43 C15 31,24 16,40 16Z"
        stroke="rgba(79,70,229,0.28)"
        strokeWidth="1"
      />
      <circle className="signal-mark-core-glow" cx="40" cy="40" r="9" fill="rgba(196,154,42,0.18)" />
      <circle className={animated ? "signal-mark-core signal-mark-core--pulse" : "signal-mark-core"} cx="40" cy="40" r="5.5" fill="var(--accent-2)" />
      <circle cx="35" cy="35" r="2.5" fill="white" opacity="0.18" />
      <defs>
        <radialGradient id={gradientId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(40 40) rotate(90) scale(21)">
          <stop stopColor="#4F46E5" stopOpacity="0.22" />
          <stop offset="1" stopColor="#4F46E5" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export default function BrandLogo({
  href,
  showWordmark = true,
  className = "",
  markClassName = "",
  wordmarkClassName = "",
  animatedMark = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsSignedIn(Boolean(data.user));
    });
  }, []);

  const resolvedHref = useMemo(() => {
    if (href) return href;
    if (pathname === "/") return "/";
    return isSignedIn ? "/dashboard" : "/";
  }, [href, isSignedIn, pathname]);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (href) return;
    if (pathname === "/") {
      event.preventDefault();
      router.refresh();
      window.location.reload();
    }
  };

  return (
    <Link href={resolvedHref} onClick={handleClick} className={`inline-flex items-center gap-3 ${className}`}>
      <span className={`text-[var(--accent)] ${markClassName}`}>
        <SignalMark className="h-full w-full" animated={animatedMark} />
      </span>
      {showWordmark ? (
        <span className={`font-display text-[1.05em] font-bold tracking-[-0.03em] text-[var(--text)] ${wordmarkClassName}`}>
          {BRAND.name.toLowerCase()}
        </span>
      ) : null}
    </Link>
  );
}
