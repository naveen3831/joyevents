import { useState, useEffect } from "react";
import { apiGetHomepageSettings } from "@/lib/api";
const SETTINGS_KEY = "homepageSettings";
export const DEFAULT_SETTINGS = {
    heroTitle: "Your Vision, Transformed Into Extraordinary Events",
    heroSubtitle: "From intimate private celebrations and corporate summits to grand music festivals — discover curated services, book verified tickets, and effortlessly coordinate end-to-end event planning that brings people together and turns every occasion into an extraordinary experience.",
    eventsCount: "1,800+",
    attendeesCount: "50K+",
    merchantsCount: "340+",
    contactPhone: "+1 (555) 123-4567",
    contactEmail: "info@eventoza.com",
    contactAddress: "123 Event Ave, Celebrate City",
    contactWorkingHours: "Mon - Fri, 9:00 AM - 6:00 PM",
    aboutTitle: "We build unforgettable event experiences",
    aboutSubtitle: "Eventoza brings strategy, hospitality, production, and design together so every celebration feels effortless, premium, and deeply memorable.",
    aboutExperience: "12+",
    portfolioTitle: "A portfolio shaped by atmosphere, scale, and detail",
    portfolioSubtitle: "Explore the types of experiences we deliver across corporate productions, luxury celebrations, and high-impact event launches.",
    portfolioCategories: "12+",
    heroImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=80",
    eventsImage: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1600&q=80",
    servicesImage: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=900&q=80",
    aboutImage: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=900&q=80",
    portfolioImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=900&q=80",
    contactImage: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=900&q=80"
};
export const useHomepageSettings = () => {
    const [settings, setSettings] = useState(() => {
        const cached = localStorage.getItem(SETTINGS_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (parsed.heroTitle === "Create Unforgettable Moments") {
                    parsed.heroTitle = "Your Vision, Transformed Into Extraordinary Events";
                }
                if (!parsed.heroSubtitle || parsed.heroSubtitle.startsWith("From intimate workshops")) {
                    parsed.heroSubtitle = DEFAULT_SETTINGS.heroSubtitle;
                }
                return parsed;
            }
            catch { }
        }
        return DEFAULT_SETTINGS;
    });
    useEffect(() => {
        let active = true;
        const fetchSettings = async () => {
            try {
                const data = await apiGetHomepageSettings();
                if (active && data) {
                    if (data.heroTitle === "Create Unforgettable Moments") {
                        data.heroTitle = "Your Vision, Transformed Into Extraordinary Events";
                    }
                    if (!data.heroSubtitle || data.heroSubtitle.startsWith("From intimate workshops")) {
                        data.heroSubtitle = DEFAULT_SETTINGS.heroSubtitle;
                    }
                    setSettings(data);
                    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
                }
            }
            catch (err) {
                console.error("Failed to sync homepage settings:", err);
            }
        };
        fetchSettings();
        return () => {
            active = false;
        };
    }, []);
    return settings;
};
