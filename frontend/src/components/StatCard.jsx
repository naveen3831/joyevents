import { useEffect } from "react";
import { Link } from "react-router-dom";
import gsap, { useGsapCardHover } from "@/lib/gsapAnimations";

const TINTS = [
  { chip: "bg-tint-orange text-tint-orange-fg" },
  { chip: "bg-tint-pink text-tint-pink-fg" },
  { chip: "bg-tint-violet text-tint-violet-fg" },
  { chip: "bg-tint-blue text-tint-blue-fg" },
  { chip: "bg-tint-mint text-tint-mint-fg" },
];

const StatCard = ({ title, value, icon, trend, index = 0, to }) => {
  const ref = useGsapCardHover({ lift: -5, scale: 1.02 });
  const tint = TINTS[index % TINTS.length];

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.45, delay: index * 0.07, ease: "power2.out" }
      );
    }, ref);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content = (
    <div ref={ref} className={`rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-card will-change-transform ${to ? "cursor-pointer transition-shadow hover:shadow-card hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 font-medium">{title}</p>
          <p className="mt-1 font-display text-lg sm:text-2xl font-bold text-foreground truncate">{value}</p>
          {trend && <p className="mt-0.5 text-xs text-success">{trend}</p>}
        </div>
        <div className={`tint-chip h-10 w-10 sm:h-11 sm:w-11 shrink-0 ${tint.chip}`}>
          <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }

  return content;
};
export default StatCard;
