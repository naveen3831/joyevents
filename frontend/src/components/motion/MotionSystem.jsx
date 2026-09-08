import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

// Standard Motion Design Tokens
export const MOTION_TOKENS = {
  duration: {
    fast: 0.18,       // 180ms - dropdowns, micro-interactions
    normal: 0.35,     // 350ms - page entrances, cards
    reveal: 0.5,      // 500ms - section reveals, titles
    hero: 0.7,        // 700ms - hero images & signature reveals
  },
  easing: {
    premium: [0.22, 1, 0.36, 1], // Smooth cubic-bezier(0.22, 1, 0.36, 1)
    smooth: [0.16, 1, 0.3, 1],
  },
  stagger: {
    fast: 0.05,
    normal: 0.08,     // 80ms
    slow: 0.12,
  }
};

/**
 * 1. Global Page Entrance Wrapper
 * Wraps page content with a subtle upward fade on route mount.
 */
export const PageEntrance = ({ children, className = "" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{
        duration: MOTION_TOKENS.duration.normal,
        ease: MOTION_TOKENS.easing.premium,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * 2. Reusable Scroll Reveal Component
 * Fades and slides elements into view when scrolled ~15% into viewport.
 */
export const Reveal = ({
  children,
  direction = "up", // 'up' | 'down' | 'left' | 'right' | 'none'
  delay = 0,
  duration = MOTION_TOKENS.duration.reveal,
  distance = 20,
  once = true,
  className = "",
  style = {},
}) => {
  const getInitialPos = () => {
    switch (direction) {
      case "up": return { y: distance };
      case "down": return { y: -distance };
      case "left": return { x: distance };
      case "right": return { x: -distance };
      default: return { y: 0, x: 0 };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...getInitialPos() }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount: 0.15 }}
      transition={{
        duration,
        delay,
        ease: MOTION_TOKENS.easing.premium,
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
};

/**
 * 3. Stagger Group & Item for Lists and Card Grids
 */
export const StaggerGroup = ({
  children,
  stagger = MOTION_TOKENS.stagger.normal,
  delay = 0,
  once = true,
  className = "",
}) => {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.1 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({
  children,
  distance = 18,
  duration = MOTION_TOKENS.duration.normal,
  className = "",
}) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: distance },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration,
            ease: MOTION_TOKENS.easing.premium,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * 4. Image Reveal with subtle clip & scale
 */
export const RevealImage = ({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  aspectRatio,
  duration = MOTION_TOKENS.duration.hero,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.04 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration,
        ease: MOTION_TOKENS.easing.premium,
      }}
      className={`overflow-hidden relative ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-transform duration-500 ease-out hover:scale-[1.03] ${imgClassName}`}
        loading="lazy"
      />
    </motion.div>
  );
};

/**
 * 5. Statistics CountUp Component
 */
export const CountUp = ({
  end = 0,
  prefix = "",
  suffix = "",
  duration = 1.2,
  className = "",
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  useEffect(() => {
    if (!isInView) return;
    let startTimestamp = null;
    const numericEnd = typeof end === "number" ? end : parseInt(String(end).replace(/[^0-9]/g, ""), 10) || 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // Easing: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * numericEnd));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(numericEnd);
      }
    };

    window.requestAnimationFrame(step);
  }, [isInView, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

export { FloatingBalloons } from "@/components/common/FloatingBalloons";
export { LightRays } from "@/components/ui/LightRays";

export default {
  PageEntrance,
  Reveal,
  StaggerGroup,
  StaggerItem,
  RevealImage,
  CountUp,
};
