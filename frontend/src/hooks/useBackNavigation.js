import { useNavigate } from "react-router-dom";

/**
 * useBackNavigation
 *
 * Returns a goBack() function that:
 * 1. Uses navigate(-1) when there is actual browser history to go back to
 * 2. Falls back to a provided fallback route when the page was opened directly
 *    (e.g., via a shared URL, bookmark, or page refresh)
 *
 * @param {string} fallback - Fallback route if no browser history is available
 * @returns {Function} goBack - Call this on your back button's onClick
 */
export function useBackNavigation(fallback = "/customer-dashboard") {
    const navigate = useNavigate();

    const goBack = () => {
        // window.history.state?.idx is set by React Router's BrowserRouter.
        // idx === 0 means this is the very first entry — no history to go back to.
        // idx > 0 means we navigated here from within the app.
        if (typeof window !== "undefined" && window.history.state?.idx > 0) {
            navigate(-1);
        } else {
            navigate(fallback, { replace: true });
        }
    };

    return goBack;
}
