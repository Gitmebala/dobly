"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";

interface SignalMarkProps {
  className?: string;
  animated?: boolean;
}

interface Props {
  href?: string;
  showWordmark?: boolean;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  animatedMark?: boolean;
}

export function SignalMark({ className = "", animated = false }: SignalMarkProps) {
  return (
    <span className={`relative block ${className}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" className="relative h-full w-full">
        <defs>
          <linearGradient id="doblyGlassFill" x1="0" y1="4" x2="26" y2="29" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="rgba(255,255,255,0.92)" />
            <stop offset="0.18" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="0.42" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="1" stopColor="rgba(196,80,26,0.35)" />
          </linearGradient>
          <linearGradient id="doblyGlassStroke" x1="0" y1="4" x2="26" y2="29" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="1" stopColor="rgba(196,80,26,0.48)" />
          </linearGradient>
        </defs>
        <rect
          x="0.5"
          y="4"
          width="20"
          height="6.5"
          rx="2"
          fill="url(#doblyGlassFill)"
          stroke="url(#doblyGlassStroke)"
          strokeWidth="0.55"
          opacity="var(--bar1-op,0.30)"
          className={animated ? "animate-[barIn_1.6s_cubic-bezier(0.4,0,0.2,1)_infinite]" : ""}
          style={{ filter: "drop-shadow(0 2px 8px rgba(196,80,26,0.18))" }}
        />
        <rect
          x="3"
          y="13"
          width="20"
          height="6.5"
          rx="2"
          fill="url(#doblyGlassFill)"
          stroke="url(#doblyGlassStroke)"
          strokeWidth="0.55"
          opacity="var(--bar2-op,0.65)"
          className={animated ? "animate-[barIn_1.6s_cubic-bezier(0.4,0,0.2,1)_infinite]" : ""}
          style={animated ? { animationDelay: "0.12s", filter: "drop-shadow(0 2px 8px rgba(196,80,26,0.18))" } : { filter: "drop-shadow(0 2px 8px rgba(196,80,26,0.18))" }}
        />
        <rect
          x="6"
          y="22"
          width="20"
          height="6.5"
          rx="2"
          fill="url(#doblyGlassFill)"
          stroke="url(#doblyGlassStroke)"
          strokeWidth="0.55"
          opacity="var(--bar3-op,1)"
          className={animated ? "animate-[barIn_1.6s_cubic-bezier(0.4,0,0.2,1)_infinite]" : ""}
          style={animated ? { animationDelay: "0.24s", filter: "drop-shadow(0 2px 8px rgba(196,80,26,0.18))" } : { filter: "drop-shadow(0 2px 8px rgba(196,80,26,0.18))" }}
        />
      </svg>
    </span>
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

  const resolvedHref = useMemo(() => {
    if (href) return href;
    if (pathname === "/") return "/";
    return pathname?.startsWith("/dashboard") || pathname?.startsWith("/admin") ? "/dashboard" : "/";
  }, [href, pathname]);

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
      <span className={markClassName || "h-9 w-9"}>
        <SignalMark className="h-full w-full" animated={animatedMark} />
      </span>
      {showWordmark ? (
        <span
          className={`text-[1.06em] font-medium tracking-[-0.04em] text-[var(--dobly-text)] ${wordmarkClassName}`}
        >
          Dobly
        </span>
      ) : null}
    </Link>
  );
}
