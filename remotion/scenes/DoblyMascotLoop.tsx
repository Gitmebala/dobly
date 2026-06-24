import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const palette = {
  orange: "#C4501A",
  ivory: "#F5EDE4",
  charcoal: "#181513",
  deep: "#201C19",
};

const blinkAmount = (frame: number, start: number, duration: number) => {
  return interpolate(
    frame,
    [start, start + duration / 2, start + duration],
    [1, 0.14, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.76, 0, 0.24, 1),
    },
  );
};

const orbitDot = (
  angle: number,
  radiusX: number,
  radiusY: number,
  speed: number,
  frame: number,
) => {
  const phase = angle + frame * speed;
  return {
    x: 640 + Math.cos(phase) * radiusX,
    y: 690 + Math.sin(phase) * radiusY,
  };
};

const Eye = ({
  left,
  top,
  width,
  openness,
  pupilOffsetX = 0,
}: {
  left: number;
  top: number;
  width: number;
  openness: number;
  pupilOffsetX?: number;
}) => {
  const topCurve = 10 + (1 - openness) * 26;
  const bottomCurve = 62 - (1 - openness) * 26;
  const pupilOpacity = interpolate(openness, [0.12, 0.42, 1], [0, 0.35, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pupilHeight = 12 * openness + 2;

  return (
    <svg
      viewBox="0 0 120 72"
      style={{
        position: "absolute",
        left,
        top,
        width,
        height: width * 0.6,
        overflow: "visible",
      }}
    >
      <defs>
        <linearGradient id={`eyeFill-${left}`} x1="16" y1="18" x2="102" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFF6ED" />
          <stop offset="0.7" stopColor="#F5EDE4" />
          <stop offset="1" stopColor="#FFD2A5" />
        </linearGradient>
        <filter id={`eyeGlow-${left}`}>
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={`M10 36 Q60 ${topCurve} 110 36 Q60 ${bottomCurve} 10 36 Z`}
        fill={`url(#eyeFill-${left})`}
        filter={`url(#eyeGlow-${left})`}
        opacity={0.98}
      />
      <path
        d={`M18 34 Q60 ${topCurve + 6} 102 34`}
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeLinecap="round"
        strokeWidth="4"
        opacity={0.9}
      />
      <ellipse
        cx={60 + pupilOffsetX}
        cy={38}
        rx={7}
        ry={pupilHeight}
        fill={palette.deep}
        opacity={pupilOpacity}
      />
      <ellipse
        cx={63 + pupilOffsetX}
        cy={34}
        rx={2.4}
        ry={2.8}
        fill="rgba(255,255,255,0.78)"
        opacity={pupilOpacity}
      />
    </svg>
  );
};

export const DoblyMascotLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const intro = spring({
    fps,
    frame,
    config: {
      damping: 16,
      stiffness: 90,
      mass: 0.8,
    },
  });

  const driftX =
    interpolate(frame, [0, 60, 120, 179], [-52, 84, -68, 36], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.45, 0, 0.2, 1),
    }) + Math.sin(frame / 18) * 10;
  const driftY =
    interpolate(frame, [0, 50, 110, 179], [32, -42, 26, -18], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.45, 0, 0.2, 1),
    }) + Math.sin(frame / 9) * 8;
  const rotation = Math.sin(frame / 24) * 4;
  const scale = 0.96 + intro * 0.04 + Math.sin(frame / 15) * 0.008;
  const shadowScale = 0.9 + Math.sin(frame / 14) * 0.06;
  const shadowOpacity = 0.14 + Math.sin(frame / 16) * 0.04;

  const baseBlink = Math.min(
    blinkAmount(frame, 34, 8),
    blinkAmount(frame, 96, 7),
    blinkAmount(frame, 144, 10),
  );
  const wink = blinkAmount(frame, 124, 14);
  const leftEyeOpen = Math.min(baseBlink, wink);
  const rightEyeOpen = baseBlink;
  const pupilShift = Math.sin(frame / 32) * 3;

  const orbitA = orbitDot(0.4, 312, 124, 0.03, frame);
  const orbitB = orbitDot(2.2, 336, 152, 0.025, frame);
  const orbitC = orbitDot(4.7, 298, 136, 0.036, frame);

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 48%, #FFFDFC 0%, #FAF4EE 55%, #F6EEE5 100%)",
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(145deg, rgba(196,80,26,0.04) 0%, rgba(255,255,255,0) 28%, rgba(24,21,19,0.03) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(145deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 44px, rgba(196,80,26,0.018) 45px, rgba(196,80,26,0.018) 46px)",
          opacity: 0.55,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 460 + driftX * 0.7,
          top: 955 + driftY * 0.35,
          width: 360 * shadowScale,
          height: 80 * shadowScale,
          borderRadius: 999,
          background: "rgba(196,80,26,0.18)",
          filter: "blur(26px)",
          opacity: shadowOpacity,
          transform: "translateX(-50%)",
        }}
      />

      {[orbitA, orbitB, orbitC].map((dot, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: dot.x,
            top: dot.y,
            width: index === 1 ? 18 : 12,
            height: index === 1 ? 18 : 12,
            borderRadius: 999,
            background: index === 1 ? palette.ivory : palette.orange,
            boxShadow:
              index === 1
                ? "0 0 0 6px rgba(245,237,228,0.18)"
                : "0 0 18px rgba(196,80,26,0.38)",
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          left: 618 + Math.sin(frame / 20) * 12,
          top: 360 + Math.cos(frame / 24) * 10,
          color: palette.orange,
          fontSize: 60,
          fontWeight: 700,
          lineHeight: 1,
          textShadow: "0 0 18px rgba(196,80,26,0.24)",
          transform: `scale(${1 + Math.sin(frame / 14) * 0.08})`,
        }}
      >
        ✦
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${driftX}px, ${driftY}px) rotate(${rotation}deg) scale(${scale})`,
        }}
      >
        <Img
          src={staticFile("remotion/dobly-mascot-light.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 487,
            top: 530,
            width: 309,
            height: 204,
            borderRadius: 86,
            background:
              "radial-gradient(circle at 50% 20%, rgba(120,112,104,0.4) 0%, rgba(32,28,25,0.98) 38%, rgba(24,21,19,1) 100%)",
            boxShadow:
              "inset 0 10px 18px rgba(255,255,255,0.08), inset 0 -18px 32px rgba(0,0,0,0.34)",
          }}
        />

        <Eye left={542} top={607} width={100} openness={leftEyeOpen} pupilOffsetX={pupilShift} />
        <Eye left={680} top={607} width={100} openness={rightEyeOpen} pupilOffsetX={pupilShift} />

        <div
          style={{
            position: "absolute",
            left: 613,
            top: 777 + Math.sin(frame / 12) * 4,
            width: 56,
            height: 20,
            borderRadius: 999,
            background: "rgba(255,220,172,0.9)",
            filter: "blur(8px)",
            opacity: 0.6 + Math.sin(frame / 12) * 0.08,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
