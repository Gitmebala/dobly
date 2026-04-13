"use client";

import { useEffect, useState } from "react";

export default function PageLoader() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = window.sessionStorage.getItem("dobly-loader-seen");

    if (reduceMotion || seen === "true") {
      setMounted(true);
      return;
    }

    setMounted(true);
    setVisible(true);
    window.sessionStorage.setItem("dobly-loader-seen", "true");

    const fadeTimer = window.setTimeout(() => setVisible(false), 3000);
    return () => window.clearTimeout(fadeTimer);
  }, []);

  useEffect(() => {
    if (!mounted || visible) return;
    const removeTimer = window.setTimeout(() => setMounted(false), 650);
    return () => window.clearTimeout(removeTimer);
  }, [mounted, visible]);

  if (!mounted) return null;

  return (
    <div className={`page-loader ${visible ? "page-loader--visible" : "page-loader--hidden"}`} aria-hidden="true">
      <div className="page-loader__word" role="presentation">
        {"dobly".split("").map((letter, index) => (
          <span key={`${letter}-${index}`} style={{ animationDelay: `${index * 0.1}s` }}>
            {letter}
          </span>
        ))}
      </div>
      <div className="page-loader__bar">
        <div className="page-loader__bar-fill" />
      </div>
    </div>
  );
}
