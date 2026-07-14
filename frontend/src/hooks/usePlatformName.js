import { useState, useEffect } from "react";
import { getPlatformName, getSupportEmail, syncPlatformSettings } from "@/lib/platformName";
export const usePlatformName = () => {
    const [name, setName] = useState(getPlatformName);
    useEffect(() => {
        // Sync from backend on mount so all devices get the latest name
        syncPlatformSettings();
        const handler = () => setName(getPlatformName());
        window.addEventListener("platformNameChanged", handler);
        return () => window.removeEventListener("platformNameChanged", handler);
    }, []);
    return name;
};
export const useSupportEmail = () => {
    const [email, setEmail] = useState(getSupportEmail);
    useEffect(() => {
        const handler = () => setEmail(getSupportEmail());
        window.addEventListener("platformNameChanged", handler);
        return () => window.removeEventListener("platformNameChanged", handler);
    }, []);
    return email;
};
