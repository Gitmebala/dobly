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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mobile = window.innerWidth < 768;
    const starCount = mobile ? 60 : 140;
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
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.06,
          drift: Math.random() * Math.PI * 2,
          size: 0.8 + Math.random() * 1.6,
          alpha: zone === "top" ? 0.3 + Math.random() * 0.7 : 0.15 + Math.random() * 0.35,
          twinkle: Math.random() * Math.PI * 2,
          zone,
        });
      }
    };

    const onPointerMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const drawStar = (x: number, y: number, size: number, opacity: number) => {
      const innerRadius = size * 0.4;
      const outerRadius = size;
      const spikes = 5;

      // Draw outer glow
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, outerRadius * 1.8);
      glowGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.15})`);
      glowGradient.addColorStop(0.6, `rgba(220, 240, 255, ${opacity * 0.05})`);
      glowGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(x, y, outerRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Draw star points
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.9})`;
      ctx.lineWidth = 0;
      ctx.beginPath();

      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();

      // Add center highlight
      const centerGradient = ctx.createRadialGradient(x, y, 0, x, y, innerRadius * 0.5);
      centerGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.6})`);
      centerGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.arc(x, y, innerRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    };

    let frame = 0;
    const render = () => {
      elapsed += 0.008;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Subtle background gradient
      const topGlow = ctx.createLinearGradient(0, 0, 0, window.innerHeight * 0.42);
      topGlow.addColorStop(0, "rgba(255,255,255,0.02)");
      topGlow.addColorStop(0.35, "rgba(0,223,160,0.015)");
      topGlow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight * 0.45);

      for (const star of stars) {
        const zoneDrift = star.zone === "top" ? 0.012 : 0.024;
        star.x += star.vx + Math.cos(elapsed + star.drift) * zoneDrift;
        star.y += star.vy + Math.sin(elapsed * 0.9 + star.drift) * zoneDrift;
        star.twinkle += 0.024;

        if (star.x < -32) star.x = window.innerWidth + 32;
        if (star.x > window.innerWidth + 32) star.x = -32;
        if (star.y < -32) star.y = window.innerHeight + 32;
        if (star.y > window.innerHeight + 32) star.y = -32;

        const dx = star.x - mouse.x;
        const dy = star.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          const force = (150 - distance) / 150;
          const angle = Math.atan2(dy, dx);
          star.x += Math.cos(angle) * force * 1.8;
          star.y += Math.sin(angle) * force * 1.8;
        }

        const glowBoost = distance < 180 ? 1 + ((180 - distance) / 180) * 0.5 : 1;
        const opacity = star.alpha * (0.6 + Math.sin(star.twinkle) * 0.4) * glowBoost;

        drawStar(star.x, star.y, star.size, opacity);
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
