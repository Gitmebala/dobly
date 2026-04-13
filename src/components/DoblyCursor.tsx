"use client";

import { useEffect, useRef } from "react";

export default function DoblyCursor() {
  const trailRef = useRef<HTMLDivElement | null>(null);
  const bladeRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const trail = trailRef.current;
    const blade = bladeRef.current;
    const frameEl = frameRef.current;

    if (!trail || !blade || !frameEl || window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cometX = mouseX;
    let cometY = mouseY;
    let angle = 0;
    let trailLength = 58;
    let animationFrame = 0;

    const interactiveSelector =
      "a, button, input, textarea, select, summary, [role='button'], .interactive-ring";

    const setHover = (target: EventTarget | null) => {
      const active = target instanceof Element && Boolean(target.closest(interactiveSelector));
      trail.dataset.hover = String(active);
      blade.dataset.hover = String(active);
      frameEl.dataset.hover = String(active);
    };

    const move = (event: MouseEvent) => {
      const dx = event.clientX - mouseX;
      const dy = event.clientY - mouseY;
      mouseX = event.clientX;
      mouseY = event.clientY;
      angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const speed = Math.min(Math.hypot(dx, dy), 44);
      trailLength = 58 + speed * 0.7;
      blade.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) rotate(45deg)`;
      setHover(event.target);
    };

    const click = () => {
      frameEl.dataset.click = "true";
      window.setTimeout(() => {
        if (frameEl) frameEl.dataset.click = "false";
      }, 260);
    };

    const hide = () => {
      trail.style.opacity = "0";
      blade.style.opacity = "0";
      frameEl.style.opacity = "0";
    };

    const show = () => {
      trail.style.opacity = "1";
      blade.style.opacity = "1";
      frameEl.style.opacity = "1";
    };

    const tick = () => {
      cometX += (mouseX - cometX) * 0.26;
      cometY += (mouseY - cometY) * 0.26;
      trail.style.width = `${trail.dataset.hover === "true" ? trailLength + 20 : trailLength}px`;
      trail.style.marginLeft = `${-(trail.dataset.hover === "true" ? trailLength + 16 : trailLength - 4)}px`;
      trail.style.transform = `translate3d(${cometX}px, ${cometY}px, 0) rotate(${angle}deg)`;
      frameEl.style.transform = `translate3d(${cometX}px, ${cometY}px, 0) rotate(45deg)`;
      animationFrame = window.requestAnimationFrame(tick);
    };

    blade.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) rotate(45deg)`;
    trail.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) rotate(${angle}deg)`;
    frameEl.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) rotate(45deg)`;
    show();

    window.addEventListener("mousemove", move);
    window.addEventListener("mousedown", click);
    window.addEventListener("mouseleave", hide);
    window.addEventListener("mouseenter", show);
    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", click);
      window.removeEventListener("mouseleave", hide);
      window.removeEventListener("mouseenter", show);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <>
      <div ref={trailRef} className="dobly-cursor-trail" data-hover="false" />
      <div ref={frameRef} className="dobly-cursor-frame" data-hover="false" data-click="false" />
      <div ref={bladeRef} className="dobly-cursor-blade" data-hover="false" />
    </>
  );
}
