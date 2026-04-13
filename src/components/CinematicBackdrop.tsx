"use client";

import { useEffect, useRef } from "react";

const stars = [
  { top: "10%", left: "14%", size: 4, depth: 0.8 },
  { top: "18%", left: "72%", size: 6, depth: -1.1 },
  { top: "24%", left: "42%", size: 3, depth: 0.5 },
  { top: "34%", left: "84%", size: 5, depth: -0.8 },
  { top: "38%", left: "18%", size: 7, depth: 1.2 },
  { top: "48%", left: "58%", size: 4, depth: -0.6 },
  { top: "56%", left: "78%", size: 5, depth: 1.1 },
  { top: "62%", left: "28%", size: 3, depth: -0.7 },
  { top: "72%", left: "66%", size: 6, depth: 0.9 },
  { top: "78%", left: "12%", size: 4, depth: -0.9 },
  { top: "82%", left: "46%", size: 5, depth: 0.7 },
  { top: "88%", left: "86%", size: 3, depth: -0.5 },
];

export default function CinematicBackdrop({
  intensity = "default",
  className = "",
}: {
  intensity?: "default" | "strong";
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const handleMove = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      element.style.setProperty("--spot-x", `${x}%`);
      element.style.setProperty("--spot-y", `${y}%`);
    };

    element.addEventListener("mousemove", handleMove, { passive: true });
    return () => element.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div
      ref={rootRef}
      className={`cinematic-backdrop ${intensity === "strong" ? "cinematic-backdrop-strong" : ""} ${className}`}
      aria-hidden="true"
    >
      <div className="cinematic-grid" />
      <div className="cinematic-beam cinematic-beam-a" />
      <div className="cinematic-beam cinematic-beam-b" />
      <div className="cinematic-orb cinematic-orb-a" />
      <div className="cinematic-orb cinematic-orb-b" />
      <div className="cinematic-orb cinematic-orb-c" />
      <div className="cinematic-stars">
        {stars.map((star, index) => (
          <span
            key={`${star.top}-${star.left}-${index}`}
            className="cinematic-star"
            style={
              {
                top: star.top,
                left: star.left,
                width: `${star.size}px`,
                height: `${star.size}px`,
                "--star-depth": String(star.depth),
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="cinematic-scanlines" />
    </div>
  );
}
