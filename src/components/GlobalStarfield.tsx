"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  drift: number;
  size: number;
  alpha: number;
  twinkle: number;
  zone: "top" | "full";
};

export default function GlobalStarfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mobile = window.innerWidth < 768;
    const starCount = mobile ? 80 : 190;
    const stars: Star[] = [];
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    let elapsed = 0;

    const seedStars = () => {
      stars.length = 0;
      for (let i = 0; i < starCount; i += 1) {
        const zone = Math.random() < 0.76 ? "top" : "full";
        stars.push({
          x: Math.random() * window.innerWidth,
          y:
            zone === "top"
              ? Math.pow(Math.random(), 1.9) * window.innerHeight * 0.42
              : Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.08,
          drift: Math.random() * Math.PI * 2,
          size: 0.3 + Math.random() * 0.85,
          alpha: zone === "top" ? 0.24 + Math.random() * 0.58 : 0.1 + Math.random() * 0.26,
          twinkle: Math.random() * Math.PI * 2,
          zone,
        });
      }
    };

    const onPointerMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    let frame = 0;
    const render = () => {
      elapsed += 0.008;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const topGlow = ctx.createLinearGradient(0, 0, 0, window.innerHeight * 0.42);
      topGlow.addColorStop(0, "rgba(255,255,255,0.04)");
      topGlow.addColorStop(0.35, "rgba(0,223,160,0.035)");
      topGlow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight * 0.45);

      for (const star of stars) {
        const zoneDrift = star.zone === "top" ? 0.05 : 0.08;
        star.x += star.vx + Math.cos(elapsed + star.drift) * zoneDrift;
        star.y += star.vy + Math.sin(elapsed * 0.9 + star.drift) * zoneDrift;
        star.twinkle += 0.024;

        if (star.x < -16) star.x = window.innerWidth + 16;
        if (star.x > window.innerWidth + 16) star.x = -16;
        if (star.y < -16) star.y = window.innerHeight + 16;
        if (star.y > window.innerHeight + 16) star.y = -16;

        const dx = star.x - mouse.x;
        const dy = star.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          const force = (150 - distance) / 150;
          const angle = Math.atan2(dy, dx);
          star.x += Math.cos(angle) * force * 2.4;
          star.y += Math.sin(angle) * force * 2.4;
        }

        const glowBoost = distance < 180 ? 1 + ((180 - distance) / 180) * 0.65 : 1;
        const opacity = star.alpha * (0.72 + Math.sin(star.twinkle) * 0.28) * glowBoost;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.12})`;
        ctx.arc(star.x, star.y, star.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = window.requestAnimationFrame(render);
    };

    resize();
    seedStars();
    render();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onPointerMove);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onPointerMove);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className="dobly-starfield" aria-hidden="true" />;
}
