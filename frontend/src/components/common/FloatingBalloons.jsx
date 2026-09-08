import { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";

// Brand balloon color palette (Event / Celebration theme)
const BALLOON_COLORS = [
  "#6D28D9", // Deep Purple
  "#8B5CF6", // Bright Violet
  "#C026D3", // Magenta / Fuchsia
  "#EC4899", // Vibrant Pink
  "#F472B6", // Soft Rose
];

export function FloatingBalloons({
  count = 14,
  className = "absolute inset-0 overflow-hidden pointer-events-none z-0",
  densityMultiplier = 1,
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handleMotionChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleMotionChange);

    return () => {
      window.removeEventListener("resize", checkMobile);
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  // Compute effective balloon count based on screen size
  const effectiveCount = useMemo(() => {
    let base = count;
    if (isMobile) base = Math.min(count, 6);
    return Math.max(3, Math.round(base * densityMultiplier));
  }, [count, isMobile, densityMultiplier]);

  // Generate stable balloon attributes
  const balloons = useMemo(() => {
    return Array.from({ length: effectiveCount }).map((_, index) => {
      // Distribute balloons towards outer edges (3-33% left, 67-95% right)
      const isLeft = index % 2 === 0;
      const leftPercent = isLeft
        ? 3 + ((index * 7) % 30)
        : 67 + ((index * 7) % 28);

      // Balloon size tier
      const sizeType = index % 3; // 0 = small, 1 = medium, 2 = large
      let width = 16;
      let height = 20;
      let opacity = 0.16;

      if (sizeType === 0) {
        width = 14 + (index % 5);
        height = width * 1.25;
        opacity = 0.12 + (index % 4) * 0.02; // 0.12 - 0.18
      } else if (sizeType === 1) {
        width = 22 + (index % 6);
        height = width * 1.25;
        opacity = 0.18 + (index % 4) * 0.03; // 0.18 - 0.25
      } else {
        width = 30 + (index % 6);
        height = width * 1.25;
        opacity = 0.22 + (index % 3) * 0.03; // 0.22 - 0.28
      }

      const color = BALLOON_COLORS[index % BALLOON_COLORS.length];
      const duration = 14 + ((index * 3) % 10); // 14s to 24s
      const delay = (index * 1.8) % 8; // 0s to 8s
      const driftX = (index % 2 === 0 ? 1 : -1) * (10 + (index % 12));
      const rotation = (index % 2 === 0 ? 1 : -1) * (2 + (index % 4));

      return {
        id: `balloon-${index}`,
        leftPercent,
        width,
        height,
        color,
        opacity,
        duration,
        delay,
        driftX,
        rotation,
      };
    });
  }, [effectiveCount]);

  if (prefersReducedMotion) {
    return (
      <div className={className} aria-hidden="true">
        {balloons.slice(0, 4).map((b) => (
          <div
            key={b.id}
            style={{
              position: "absolute",
              left: `${b.leftPercent}%`,
              bottom: "20%",
              opacity: b.opacity * 0.7,
            }}
          >
            <BalloonSvg width={b.width} height={b.height} color={b.color} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className} aria-hidden="true">
      {balloons.map((b) => (
        <motion.div
          key={b.id}
          style={{
            position: "absolute",
            left: `${b.leftPercent}%`,
            bottom: "-60px",
            width: b.width,
            height: b.height + 15,
            willChange: "transform, opacity",
          }}
          initial={{
            y: 0,
            x: 0,
            rotate: 0,
            opacity: 0,
          }}
          animate={{
            y: [0, -480, -680],
            x: [0, b.driftX, -b.driftX * 0.5, b.driftX * 0.8],
            rotate: [0, b.rotation, -b.rotation, 0],
            opacity: [0, b.opacity, b.opacity, 0],
          }}
          transition={{
            duration: b.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: b.delay,
            times: [0, 0.2, 0.8, 1],
          }}
        >
          <BalloonSvg width={b.width} height={b.height} color={b.color} />
        </motion.div>
      ))}
    </div>
  );
}

// Elegant Balloon SVG Component with teardrop body, knot & subtle string
function BalloonSvg({ width, height, color }) {
  const gradientId = `balloon-grad-${color.replace("#", "")}`;
  const knotSize = Math.max(3, Math.round(width * 0.18));

  return (
    <svg
      width={width}
      height={height + 14}
      viewBox={`0 0 ${width} ${height + 14}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="overflow-visible drop-shadow-2xs"
    >
      <defs>
        {/* Radial highlight gradient for subtle 3D depth */}
        <radialGradient
          id={gradientId}
          cx="35%"
          cy="30%"
          r="65%"
          fx="30%"
          fy="25%"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="40%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </radialGradient>
      </defs>

      {/* Main Balloon Oval/Teardrop Body */}
      <path
        d={`M ${width / 2} 0 
           C ${width * 1.05} 0, ${width} ${height * 0.65}, ${width / 2} ${height} 
           C 0 ${height * 0.65}, -${width * 0.05} 0, ${width / 2} 0 Z`}
        fill={`url(#${gradientId})`}
      />

      {/* Balloon Knot (Triangle at bottom) */}
      <polygon
        points={`${width / 2 - knotSize / 2},${height - 1} ${width / 2 + knotSize / 2},${height - 1} ${width / 2},${height + knotSize}`}
        fill={color}
        opacity="0.9"
      />

      {/* Extremely Thin Subtle Balloon String */}
      <path
        d={`M ${width / 2} ${height + knotSize} 
           Q ${width / 2 + 3} ${height + knotSize + 6}, ${width / 2 - 2} ${height + knotSize + 12}`}
        stroke={color}
        strokeWidth="0.8"
        strokeOpacity="0.35"
        fill="none"
      />
    </svg>
  );
}
