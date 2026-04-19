"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/client";

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

export function SignalMark({
  className = "",
  animated = false,
}: SignalMarkProps) {
  return (
    <motion.svg
      width="36"
      height="36"
      viewBox="0 0 80 80"
      fill="none"
      className={className}
      initial={false}
      animate={
        animated
          ? {
              rotate: [0, 1.2, -1.2, 0],
              y: [0, -1.5, 1, 0],
              scale: [1, 1.015, 0.995, 1],
            }
          : undefined
      }
      transition={
        animated
          ? {
              duration: 9.2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }
          : undefined
      }
      whileHover={animated ? "hover" : undefined}
    >
      <motion.path
        d="M40 6 C60 6,74 20,74 40 C74 58,62 74,40 74 C24 74,8 62,6 44 C4 28,16 6,40 6Z"
        stroke="#4D7AFF"
        strokeWidth="3"
        fill="rgba(77,122,255,0.1)"
        variants={
          animated
            ? { hover: { scale: 1.03, filter: "drop-shadow(0 0 16px rgba(77,122,255,0.3))" } }
            : undefined
        }
      />
      <motion.path
        d="M40 16 C55 16,64 26,64 40 C64 53,55 63,40 63 C28 63,18 55,17 43 C15 31,24 16,40 16Z"
        stroke="rgba(77,122,255,0.22)"
        strokeWidth="1"
        fill="none"
      />
      <motion.ellipse
        cx="40"
        cy="40"
        rx="23"
        ry="14.5"
        stroke="rgba(77,122,255,0.42)"
        strokeWidth="2.2"
        fill="none"
        animate={
          animated
            ? {
                rotate: [0, 360],
              }
            : undefined
        }
        transition={
          animated
            ? {
                duration: 7.4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }
            : undefined
        }
        variants={
          animated
            ? {
                hover: {
                  stroke: "rgba(77,122,255,0.55)",
                },
              }
            : undefined
        }
      />
      <motion.circle
        cx="40"
        cy="40"
        r="9.5"
        fill="rgba(255,176,32,0.18)"
        animate={animated ? { opacity: [0.18, 0.34, 0.18], scale: [1, 1.08, 1] } : undefined}
        variants={animated ? { hover: { scale: [1, 1.12, 1] } } : undefined}
        transition={
          animated
            ? { duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
            : undefined
        }
      />
      <motion.circle
        cx="40"
        cy="40"
        r="5.5"
        fill="#FFB020"
        animate={animated ? { scale: [1, 1.07, 1], opacity: [1, 0.88, 1] } : undefined}
        variants={animated ? { hover: { scale: [1, 1.18, 1] } } : undefined}
        transition={
          animated
            ? { duration: 2.7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
            : undefined
        }
      />
      <motion.circle
        cx="31"
        cy="26"
        r="2.5"
        fill="white"
        opacity="0.22"
        animate={animated ? { opacity: [0.12, 0.9, 0.18], scale: [1, 1.1, 1] } : undefined}
        variants={animated ? { hover: { opacity: [0.18, 0.34, 0.18] } } : undefined}
        transition={
          animated
            ? { duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
            : undefined
        }
      />
      <motion.circle
        cx="63"
        cy="40"
        r="4.2"
        fill="#D8E7FF"
        animate={
          animated
            ? {
                rotate: [0, 360],
                transformOrigin: "40px 40px",
              }
            : undefined
        }
        transition={
          animated
            ? {
                duration: 7.4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }
            : undefined
        }
      />
    </motion.svg>
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
      <span className={markClassName}>
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
