"use client";

import { useEffect, useRef } from "react";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;

    if (!dot || !ring || window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;
    let raf = 0;

    const hoverSelector = "a, button, [data-cursor='hover'], input, textarea, select, summary";

    const applyVariant = (target: EventTarget | null) => {
      const element = target instanceof Element ? target.closest(hoverSelector) : null;
      const variant = element instanceof HTMLAnchorElement ? "link" : element ? "action" : "default";
      dot.dataset.variant = variant;
      ring.dataset.variant = variant;
    };

    const handleMove = (event: MouseEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      applyVariant(event.target);
    };

    const loop = () => {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      raf = window.requestAnimationFrame(loop);
    };

    dot.style.opacity = "1";
    ring.style.opacity = "1";
    dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    raf = window.requestAnimationFrame(loop);

    window.addEventListener("mousemove", handleMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="shared-cursor-dot" data-variant="default" />
      <div ref={ringRef} className="shared-cursor-ring" data-variant="default" />
    </>
  );
}
