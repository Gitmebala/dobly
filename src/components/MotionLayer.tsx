"use client";

import { useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import gsap from "gsap";

function setupTilt(element: HTMLElement, maxTilt: number) {
  const xTo = gsap.quickTo(element, "rotationY", { duration: 0.35, ease: "power3.out" });
  const yTo = gsap.quickTo(element, "rotationX", { duration: 0.35, ease: "power3.out" });
  const scaleTo = gsap.quickTo(element, "scale", { duration: 0.35, ease: "power3.out" });

  function move(event: PointerEvent) {
    const rect = element.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const py = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    element.style.setProperty("--specular-x", `${event.clientX - rect.left}px`);
    element.style.setProperty("--specular-y", `${event.clientY - rect.top}px`);
    xTo(px * maxTilt);
    yTo(-py * maxTilt);
    scaleTo(1.01);
  }

  function leave() {
    gsap.to(element, {
      rotationX: 0,
      rotationY: 0,
      scale: 1,
      duration: 0.9,
      ease: "elastic.out(1, 0.5)",
    });
  }

  element.addEventListener("pointermove", move);
  element.addEventListener("pointerleave", leave);

  return () => {
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerleave", leave);
  };
}

function setupMagnet(element: HTMLElement) {
  const xTo = gsap.quickTo(element, "x", { duration: 0.28, ease: "power3.out" });
  const yTo = gsap.quickTo(element, "y", { duration: 0.28, ease: "power3.out" });

  function move(event: PointerEvent) {
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const distance = Math.hypot(dx, dy);

    if (distance < 80) {
      const force = (1 - distance / 80) * 12;
      xTo((dx / 80) * force);
      yTo((dy / 80) * force);
    } else {
      xTo(0);
      yTo(0);
    }
  }

  function leave() {
    gsap.to(element, {
      x: 0,
      y: 0,
      duration: 0.7,
      ease: "elastic.out(1, 0.45)",
    });
  }

  window.addEventListener("pointermove", move, { passive: true });
  element.addEventListener("pointerleave", leave);

  return () => {
    window.removeEventListener("pointermove", move);
    element.removeEventListener("pointerleave", leave);
  };
}

export default function MotionLayer() {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const cleanups: Array<() => void> = [];
    const tiltTargets = Array.from(document.querySelectorAll<HTMLElement>(".premium-tile, .card-hover, [data-tilt]"));

    for (const element of tiltTargets) {
      const rect = element.getBoundingClientRect();
      const isLargeSurface = rect.width > 680 || rect.height > 460;
      if (isLargeSurface && !element.hasAttribute("data-tilt")) {
        continue;
      }

      const inDashboard = Boolean(element.closest(".dashboard-shell, .auth-shell"));
      const maxTilt = Number(element.dataset.tiltMax ?? (inDashboard ? 6 : 10));
      cleanups.push(setupTilt(element, maxTilt));
    }

    const magneticButtons = Array.from(document.querySelectorAll<HTMLElement>(".btn-primary"));
    for (const element of magneticButtons) {
      cleanups.push(setupMagnet(element));
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [pathname, reduceMotion]);

  return null;
}
