"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import GlobalStarfield from "@/components/GlobalStarfield";
import MotionLayer from "@/components/MotionLayer";
import PageTransitionShell from "@/components/PageTransitionShell";
import PageLoader from "@/components/shared/PageLoader";
import Starfield from "@/components/shared/Starfield";

gsap.registerPlugin(ScrollTrigger);

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    ScrollTrigger.defaults({
      start: "top 82%",
      toggleActions: "play none none none",
    });

    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
    });

    const update = (time: number) => {
      lenis.raf(time * 1000);
    };

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <GlobalStarfield />
      <Starfield />
      {pathname === "/" ? null : <PageLoader />}
      <MotionLayer />
      <PageTransitionShell>{children}</PageTransitionShell>
    </>
  );
}
