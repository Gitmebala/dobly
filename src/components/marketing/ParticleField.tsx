"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type ParticleFieldProps = {
  density?: "hero" | "compact";
  className?: string;
  brighter?: boolean;
};

export default function ParticleField({
  density = "hero",
  className = "",
  brighter = false,
}: ParticleFieldProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 100);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const mobile = window.innerWidth < 768;
    const count = density === "compact" ? (mobile ? 90 : 160) : mobile ? 120 : 220;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const basePositions = new Float32Array(count * 3);
    const amplitudes = new Float32Array(count);
    const offsets = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * 24;
      const y = (Math.random() - 0.5) * 16;
      const z = (Math.random() - 0.5) * 6;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      basePositions[i3] = x;
      basePositions[i3 + 1] = y;
      basePositions[i3 + 2] = z;
      amplitudes[i] = 0.16 + Math.random() * 0.28;
      offsets[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.28 + Math.random() * 0.45;

      if (Math.random() > 0.92) {
        colors[i3] = 0.768;
        colors[i3 + 1] = 0.604;
        colors[i3 + 2] = 0.164;
      } else if (Math.random() > 0.64) {
        colors[i3] = 0.31;
        colors[i3 + 1] = 0.275;
        colors[i3 + 2] = 0.898;
      } else {
        colors[i3] = 0.902;
        colors[i3 + 1] = 0.894;
        colors[i3 + 2] = 0.973;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      transparent: true,
      opacity: brighter ? 0.82 : 0.55,
      size: mobile ? 0.08 : 0.062,
      sizeAttenuation: true,
      vertexColors: true,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const mouse = new THREE.Vector2(10, 10);
    let frame = 0;
    const clock = new THREE.Clock();

    const handleMove = (event: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const handleResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
      camera.updateProjectionMatrix();
    };

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const attribute = geometry.getAttribute("position") as THREE.BufferAttribute;

      for (let i = 0; i < count; i += 1) {
        const i3 = i * 3;
        const baseX = basePositions[i3] ?? 0;
        const baseY = basePositions[i3 + 1] ?? 0;
        const baseZ = basePositions[i3 + 2] ?? 0;
        const speed = speeds[i] ?? 0;
        const offset = offsets[i] ?? 0;
        const amplitude = amplitudes[i] ?? 0;

        let x = baseX + Math.sin(elapsed * speed + offset) * amplitude;
        let y = baseY + Math.cos(elapsed * speed * 0.76 + offset) * amplitude * 1.1;
        const z = baseZ;

        const sx = x / 12;
        const sy = y / 8;
        const dx = sx - mouse.x;
        const dy = sy - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.26) {
          const force = (0.26 - distance) / 0.26;
          const angle = Math.atan2(dy, dx);
          x += Math.cos(angle) * force * 1.1;
          y += Math.sin(angle) * force * 1.1;
        }

        attribute.setXYZ(i, x, y, z);
      }

      attribute.needsUpdate = true;
      points.rotation.z = Math.sin(elapsed * 0.08) * 0.04;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("resize", handleResize);
    handleResize();
    animate();

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(frame);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [brighter, density]);

  return <div ref={mountRef} className={className} />;
}
