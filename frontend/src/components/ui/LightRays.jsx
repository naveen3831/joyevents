"use client";

import React, { useMemo, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";

const BRAND_RAY_COLORS = [
  "rgba(109, 40, 217, 0.16)",  // Primary Deep Purple #6D28D9
  "rgba(124, 58, 237, 0.14)",  // Medium Purple #7C3AED
  "rgba(139, 92, 246, 0.15)",  // Secondary Violet #8B5CF6
  "rgba(192, 38, 211, 0.12)",  // Magenta Accent #C026D3
  "rgba(236, 72, 153, 0.13)",  // Pink Accent #EC4899
];

const DARK_RAY_COLORS = [
  "rgba(196, 181, 253, 0.14)", // Soft Lavender #C4B5FD
  "rgba(216, 180, 254, 0.13)", // Light Purple #D8B4FE
  "rgba(240, 171, 252, 0.12)", // Light Pink #F0ABFC
  "rgba(249, 168, 212, 0.12)", // Rose Pink #F9A8D4
];

export function LightRays({
  count = 6,
  color = "rgba(109, 40, 217, 0.14)",
  blur = 54,
  speed = 20,
  length = "95vh",
  className = "",
}) {
  const prefersReducedMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);
  const [responsiveCount, setResponsiveCount] = useState(count);

  useEffect(() => {
    setMounted(true);
    const updateCount = () => {
      if (window.innerWidth < 640) {
        setResponsiveCount(Math.min(count, 3));
      } else if (window.innerWidth < 1024) {
        setResponsiveCount(Math.min(count, 4));
      } else {
        setResponsiveCount(count);
      }
    };
    updateCount();
    window.addEventListener("resize", updateCount);
    return () => window.removeEventListener("resize", updateCount);
  }, [count]);

  // Deterministically generate ray properties based on seed/index to prevent SSR hydration mismatch
  const rays = useMemo(() => {
    const palette = isDark ? DARK_RAY_COLORS : BRAND_RAY_COLORS;
    const items = [];
    const total = responsiveCount;

    for (let i = 0; i < total; i++) {
      // Evenly space ray origins across top header, with slight organic variations
      const pct = (i / (total - 1 || 1)) * 90 + 5; // 5% to 95%
      const rayColor = palette[i % palette.length] || color;
      
      // Angle tilt: left rays angle right, right rays angle left, middle rays near vertical
      const angleBase = -25 + (i / (total - 1 || 1)) * 50; // -25deg to +25deg
      const angleOffset = (i * 7) % 11 - 5;
      const angle = angleBase + angleOffset;

      const width = 60 + ((i * 37) % 65); // 60px - 125px wide
      const opacity = isDark ? 0.08 + ((i * 3) % 5) * 0.02 : 0.10 + ((i * 4) % 6) * 0.02;
      const duration = speed * (0.85 + ((i * 13) % 30) / 100); // Varied speeds around ~speed
      const delay = (i * 2.3) % 5;

      items.push({
        id: `ray-${i}`,
        left: `${pct}%`,
        angle,
        width: `${width}px`,
        color: rayColor,
        opacity,
        duration,
        delay,
        swayRange: 6 + (i % 4) * 3, // 6deg to 15deg sway range
      });
    }

    return items;
  }, [responsiveCount, isDark, color, speed]);

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none ${className}`}
      style={{
        perspective: "1000px",
      }}
    >
      {/* Ambient Radial Gradient Background - Eventoza Branding */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: isDark
            ? `
              radial-gradient(ellipse at 15% -10%, rgba(147, 51, 234, 0.15), transparent 55%),
              radial-gradient(ellipse at 85% -10%, rgba(236, 72, 153, 0.12), transparent 55%),
              radial-gradient(ellipse at 50% 110%, rgba(124, 58, 237, 0.08), transparent 60%)
            `
            : `
              radial-gradient(ellipse at 15% -10%, rgba(109, 40, 217, 0.12), transparent 55%),
              radial-gradient(ellipse at 85% -10%, rgba(236, 72, 153, 0.09), transparent 55%),
              radial-gradient(ellipse at 50% 110%, rgba(139, 92, 246, 0.05), transparent 65%)
            `,
        }}
      />

      {/* Light Rays Container with global blur */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          filter: `blur(${blur}px)`,
          WebkitFilter: `blur(${blur}px)`,
        }}
      >
        {rays.map((ray) => {
          if (prefersReducedMotion) {
            return (
              <div
                key={ray.id}
                className="absolute top-0 origin-top"
                style={{
                  left: ray.left,
                  width: ray.width,
                  height: length,
                  opacity: ray.opacity,
                  transform: `rotate(${ray.angle}deg)`,
                  background: `linear-gradient(to bottom, ${ray.color} 0%, ${ray.color.replace(/[\d.]+\)$/, "0.02)")} 70%, transparent 100%)`,
                  borderRadius: "999px",
                }}
              />
            );
          }

          return (
            <motion.div
              key={ray.id}
              className="absolute top-0 origin-top"
              initial={{
                rotate: ray.angle - ray.swayRange,
                opacity: ray.opacity * 0.7,
                scaleY: 0.9,
              }}
              animate={{
                rotate: [
                  ray.angle - ray.swayRange,
                  ray.angle + ray.swayRange,
                  ray.angle - ray.swayRange,
                ],
                opacity: [
                  ray.opacity * 0.7,
                  ray.opacity * 1.25,
                  ray.opacity * 0.7,
                ],
                scaleY: [0.92, 1.05, 0.92],
              }}
              transition={{
                duration: ray.duration,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
                delay: ray.delay,
              }}
              style={{
                left: ray.left,
                width: ray.width,
                height: length,
                background: `linear-gradient(to bottom, ${ray.color} 0%, ${ray.color.replace(/[\d.]+\)$/, "0.03)")} 75%, transparent 100%)`,
                borderRadius: "999px",
                willChange: "transform, opacity",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default LightRays;
