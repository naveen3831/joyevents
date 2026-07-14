import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
/**
 * Scroll to top on every route change.
 * Uses layout effect so the window is reset before the new page paints.
 */
const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        if (window.history?.scrollRestoration) {
            window.history.scrollRestoration = "manual";
        }
    }, []);
    useLayoutEffect(() => {
        const scrollTargets = [
            window,
            document.documentElement,
            document.body,
            document.scrollingElement,
        ].filter(Boolean);
        scrollTargets.forEach((target) => {
            if (target === window) {
                window.scrollTo(0, 0);
            }
            else {
                target.scrollTop = 0;
            }
        });
        document.querySelectorAll("main").forEach((el) => {
            el.scrollTop = 0;
        });
    }, [pathname]);
    return null;
};
export default ScrollToTop;
