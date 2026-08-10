import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Shared eases/durations so every animation on the site shares the same rhythm.
export const EASE = { out: "power2.out", inOut: "power2.inOut", soft: "power1.out" };
export const DUR = { fast: 0.3, base: 0.5, slow: 0.7 };

/**
 * Staggered entrance for a grid/list container's direct children.
 * Attach the returned ref to the container (e.g. a <div className="grid ...">).
 * Fires on mount by default; pass `scrollTrigger: true` to fire when the
 * container scrolls into view instead (use for below-the-fold grids).
 * Animates only transform + opacity (compositor-friendly) and clears the
 * inline transform once settled so it doesn't fight hover/layout later.
 */
export function useGsapStagger(deps = [], options = {}) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const children = ref.current.children;
    if (!children.length) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        children,
        { opacity: 0, y: options.y ?? 24, scale: options.scale ?? 0.97, force3D: true },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: options.duration ?? DUR.base,
          ease: EASE.out,
          stagger: options.stagger ?? 0.06,
          overwrite: true,
          clearProps: "transform",
          scrollTrigger: options.scrollTrigger
            ? { trigger: ref.current, start: "top 88%", toggleActions: "play none none none" }
            : undefined,
        }
      );
    }, ref);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/**
 * ScrollTrigger.batch() reveal for independent siblings that are NOT direct
 * children of one wrapper (e.g. cards rendered by separate components across
 * a page). More efficient than one ScrollTrigger per card when there are many:
 * batches nearby onEnter events into a single stagger instead of N separate
 * tweens. Pass a CSS selector scoped under a stable container ref.
 */
export function useGsapBatchReveal(selector, deps = [], options = {}) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion()) return;
    const targets = containerRef.current.querySelectorAll(selector);
    if (!targets.length) return;
    const ctx = gsap.context(() => {
      gsap.set(targets, { opacity: 0, y: options.y ?? 24 });
      ScrollTrigger.batch(targets, {
        start: "top 90%",
        interval: 0.1,
        batchMax: options.batchMax ?? 6,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: options.duration ?? DUR.base,
            ease: EASE.out,
            stagger: options.stagger ?? 0.08,
            overwrite: true,
            clearProps: "transform",
          }),
      });
    }, containerRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return containerRef;
}

/**
 * Simple fade/rise entrance for a single element (hero text, section header, card).
 * Fires on mount by default; pass `scrollTrigger: true` to fire when it scrolls into view.
 */
export function useGsapReveal(options = {}) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: options.y ?? 20, force3D: true },
        {
          opacity: 1,
          y: 0,
          duration: options.duration ?? DUR.slow,
          delay: options.delay ?? 0,
          ease: EASE.out,
          overwrite: true,
          clearProps: "transform",
          scrollTrigger: options.scrollTrigger
            ? { trigger: ref.current, start: "top 85%", toggleActions: "play none none none" }
            : undefined,
        }
      );
    }, ref);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

/**
 * Alias of useGsapReveal with scrollTrigger always on — for section headers/blocks
 * further down a page that should animate in as the user scrolls to them.
 */
export function useGsapScrollReveal(options = {}) {
  return useGsapReveal({ ...options, scrollTrigger: true });
}

/**
 * Vertical parallax — moves the element slower/faster than scroll for depth.
 * `speed` > 0 moves the element down relative to scroll (background feel),
 * `speed` < 0 moves it up faster (foreground feel). Typical range: -0.3 to 0.3.
 * Uses scrub (tied 1:1 to scroll position) on yPercent only — compositor-only.
 */
export function useGsapParallax(speed = 0.25) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      gsap.to(el, {
        yPercent: speed * 100,
        ease: "none",
        force3D: true,
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, ref);
    return () => ctx.revert();
  }, [speed]);
  return ref;
}

/**
 * Lift + glow hover for cards — subtle scale/translate on pointer enter/leave.
 * Sets will-change only while hovered (removed on leave-complete) so the
 * browser doesn't keep every card layer-promoted at rest.
 */
export function useGsapCardHover(options = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return undefined;
    const lift = options.lift ?? -6;
    const scale = options.scale ?? 1.015;
    const enter = () => {
      el.style.willChange = "transform, box-shadow";
      gsap.to(el, { y: lift, scale, duration: DUR.fast, ease: EASE.out, boxShadow: "var(--shadow-elevated)", overwrite: "auto" });
    };
    const leave = () =>
      gsap.to(el, {
        y: 0,
        scale: 1,
        duration: 0.35,
        ease: EASE.out,
        boxShadow: "var(--shadow-card)",
        overwrite: "auto",
        onComplete: () => { el.style.willChange = "auto"; },
      });
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, [options.lift, options.scale]);
  return ref;
}

/**
 * Smoothly animates height 0 -> auto -> 0 for accordion panels.
 * `open` toggles the animation; call on every render of the panel.
 */
export function useGsapAccordion(open, options = {}) {
  const ref = useRef(null);
  const first = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.style.height = open ? "auto" : "0px";
      el.style.opacity = open ? "1" : "0";
      return;
    }
    if (first.current) {
      el.style.height = open ? "auto" : "0px";
      el.style.opacity = open ? "1" : "0";
      first.current = false;
      return;
    }
    gsap.killTweensOf(el);
    if (open) {
      gsap.set(el, { height: "auto" });
      const full = el.offsetHeight;
      gsap.fromTo(
        el,
        { height: 0, opacity: 0 },
        { height: full, opacity: 1, duration: options.duration ?? 0.32, ease: EASE.out, onComplete: () => gsap.set(el, { height: "auto" }) }
      );
    } else {
      gsap.to(el, { height: 0, opacity: 0, duration: options.duration ?? 0.26, ease: EASE.inOut });
    }
  }, [open, options.duration]);
  return ref;
}

/**
 * Build a choreographed multi-step GSAP timeline against a set of refs.
 * `build(tl, refs)` receives a fresh timeline (with sane defaults already
 * applied) and the refs object you pass in — sequence with labels and the
 * position parameter, e.g. tl.addLabel("intro").to(refs.badge.current, {...}, "intro").
 * Reverts automatically on unmount via gsap.context; respects reduced-motion
 * by jumping straight to the end state instead of skipping the DOM update.
 */
export function useGsapTimeline(build, refs, deps = []) {
  const scope = useRef(null);
  useEffect(() => {
    if (!scope.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: EASE.out, duration: DUR.base } });
      if (prefersReducedMotion()) {
        tl.progress(1);
      }
      build(tl, refs);
    }, scope);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return scope;
}

export default gsap;
