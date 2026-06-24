"use client";

function bars(size: number) {
  return {
    width: size,
    height: Math.round(size * 0.86),
    viewBox: "0 0 48 48",
  };
}

export function BrandMark({
  size = 34,
  showWord = true,
  animated = false,
}: {
  size?: number;
  showWord?: boolean;
  animated?: boolean;
}) {
  const mark = bars(size);

  return (
    <div className="inline-flex items-center gap-3">
      <span
        className="relative inline-block shrink-0"
        style={{ width: mark.width, height: mark.height }}
        aria-hidden="true"
      >
        <svg width={mark.width} height={mark.height} viewBox={mark.viewBox} fill="none">
          <defs>
            <linearGradient id="brandGlassFill" x1="4" y1="6" x2="44" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="rgba(255,255,255,0.92)" />
              <stop offset="0.16" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="0.45" stopColor="rgba(255,255,255,0.14)" />
              <stop offset="1" stopColor="rgba(196,80,26,0.35)" />
            </linearGradient>
            <linearGradient id="brandGlassStroke" x1="4" y1="6" x2="44" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="rgba(255,255,255,0.82)" />
              <stop offset="1" stopColor="rgba(196,80,26,0.46)" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="6"
            width="30"
            height="10"
            rx="3"
            fill="url(#brandGlassFill)"
            stroke="url(#brandGlassStroke)"
            strokeWidth="0.65"
            opacity="var(--bar1-op,0.30)"
            className={animated ? "animate-[barIn_1.4s_cubic-bezier(0.22,1,0.36,1)_infinite]" : ""}
            style={{ filter: "drop-shadow(0 2px 8px rgba(196,80,26,0.16))" }}
          />
          <rect
            x="9"
            y="19"
            width="30"
            height="10"
            rx="3"
            fill="url(#brandGlassFill)"
            stroke="url(#brandGlassStroke)"
            strokeWidth="0.65"
            opacity="var(--bar2-op,0.65)"
            className={animated ? "animate-[barIn_1.4s_cubic-bezier(0.22,1,0.36,1)_infinite]" : ""}
            style={animated ? { animationDelay: "0.12s", filter: "drop-shadow(0 2px 8px rgba(196,80,26,0.16))" } : { filter: "drop-shadow(0 2px 8px rgba(196,80,26,0.16))" }}
          />
          <rect
            x="14"
            y="32"
            width="30"
            height="10"
            rx="3"
            fill="url(#brandGlassFill)"
            stroke="url(#brandGlassStroke)"
            strokeWidth="0.65"
            opacity="var(--bar3-op,1)"
            className={animated ? "animate-[barIn_1.4s_cubic-bezier(0.22,1,0.36,1)_infinite]" : ""}
            style={animated ? { animationDelay: "0.24s", filter: "drop-shadow(0 2px 8px rgba(196,80,26,0.16))" } : { filter: "drop-shadow(0 2px 8px rgba(196,80,26,0.16))" }}
          />
        </svg>
      </span>
      {showWord ? (
        <span className="text-[15px] font-medium tracking-[-0.04em] text-[var(--dobly-text)]">
          <b className="font-semibold">D</b>obly
        </span>
      ) : null}
    </div>
  );
}
