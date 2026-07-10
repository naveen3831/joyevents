import { useState, useEffect } from "react";
import { apiGetHomepageSettings } from "@/lib/api";

const SETTINGS_KEY = "homepageSettings";

export const DEFAULT_SETTINGS = {
  heroTitle: "Create Unforgettable Moments",
  heroSubtitle: "From intimate workshops to grand festivals — discover, book, and manage events that bring people together and create lasting memories.",
  eventsCount: "1,800+",
  attendeesCount: "50K+",
  merchantsCount: "340+",
  contactPhone: "+1 (555) 123-4567",
  contactEmail: "info@joyevents.com",
  contactAddress: "123 Event Ave, Celebrate City",
  contactWorkingHours: "Mon - Fri, 9:00 AM - 6:00 PM",
  aboutTitle: "We build unforgettable event experiences",
  aboutSubtitle: "JoyEvents brings strategy, hospitality, production, and design together so every celebration feels effortless, premium, and deeply memorable.",
  aboutExperience: "12+",
  portfolioTitle: "A portfolio shaped by atmosphere, scale, and detail",
  portfolioSubtitle: "Explore the types of experiences we deliver across corporate productions, luxury celebrations, and high-impact event launches.",
  portfolioCategories: "12+"
};

export const useHomepageSettings = () => {
  const [settings, setSettings] = useState(() => {
    const cached = localStorage.getItem(SETTINGS_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const data = await apiGetHomepageSettings();
        if (active && data) {
          setSettings(data);
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
        }
      } catch (err) {
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
