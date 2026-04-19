"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Starfield() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (error) {
      console.warn("WebGL not available, skipping Starfield:", error);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 1.2;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    const pointCount = window.innerWidth < 768 ? 700 : 1400;
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);
    const geometry = new THREE.BufferGeometry();

    for (let i = 0; i < pointCount; i += 1) {
      const i3 = i * 3;
      const radius = 120 + Math.random() * 260;
      const theta = Math.random() * Math.PI * 2;
      const ySpread = (Math.random() - 0.5) * 1.6;

      positions[i3] = Math.cos(theta) * radius;
      positions[i3 + 1] = ySpread * radius * 0.52;
      positions[i3 + 2] = Math.sin(theta) * radius;

      if (Math.random() > 0.92) {
        colors[i3] = 0.768;
        colors[i3 + 1] = 0.604;
        colors[i3 + 2] = 0.164;
      } else if (Math.random() > 0.72) {
        colors[i3] = 0.31;
        colors[i3 + 1] = 0.275;
        colors[i3 + 2] = 0.898;
      } else {
        colors[i3] = 0.902;
        colors[i3 + 1] = 0.894;
        colors[i3 + 2] = 0.973;
      }
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: window.innerWidth < 768 ? 0.62 : 0.54,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const mouse = { x: 0, y: 0 };
    let scrollOffset = 0;
    let frame = 0;

    const handleMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    const handleScroll = () => {
      scrollOffset = window.scrollY;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const animate = () => {
      points.rotation.y += 0.00012;
      points.rotation.x += 0.00005;
      camera.position.x += (mouse.x * 0.18 - camera.position.x) * 0.025;
      camera.position.y += ((-mouse.y * 0.18) - camera.position.y) * 0.025;
      camera.position.y += ((-scrollOffset * 0.0004) - camera.position.y) * 0.02;

      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(frame);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="shared-starfield" aria-hidden="true" />;
}
