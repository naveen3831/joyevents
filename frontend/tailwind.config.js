export default {
    darkMode: ["class"],
    content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./app/**/*.{js,jsx}", "./src/**/*.{js,jsx}"],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: {
                DEFAULT: "0.5rem",
                sm: "2rem",
                md: "3rem",
                lg: "5rem",
                xl: "7rem",
                "2xl": "9rem",
            },
            screens: {
                sm: "100%",
                md: "100%",
                lg: "100%",
                xl: "100%",
                "2xl": "100%",
            },
        },
        extend: {
            fontFamily: {
                display: ['"Poppins"', 'sans-serif'],
                body: ['"Poppins"', 'sans-serif'],
                sans: ['"Poppins"', 'sans-serif'],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                success: {
                    DEFAULT: "hsl(var(--success))",
                    foreground: "hsl(var(--success-foreground))",
                },
                warning: {
                    DEFAULT: "hsl(var(--warning))",
                    foreground: "hsl(var(--warning-foreground))",
                },
                navy: {
                    DEFAULT: "hsl(var(--navy))",
                    foreground: "hsl(var(--navy-foreground))",
                },
                tint: {
                    orange: "hsl(var(--tint-orange))",
                    "orange-fg": "hsl(var(--tint-orange-fg))",
                    pink: "hsl(var(--tint-pink))",
                    "pink-fg": "hsl(var(--tint-pink-fg))",
                    violet: "hsl(var(--tint-violet))",
                    "violet-fg": "hsl(var(--tint-violet-fg))",
                    blue: "hsl(var(--tint-blue))",
                    "blue-fg": "hsl(var(--tint-blue-fg))",
                    mint: "hsl(var(--tint-mint))",
                    "mint-fg": "hsl(var(--tint-mint-fg))",
                },
                sidebar: {
                    DEFAULT: "hsl(var(--sidebar-background))",
                    foreground: "hsl(var(--sidebar-foreground))",
                    primary: "hsl(var(--sidebar-primary))",
                    "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
                    accent: "hsl(var(--sidebar-accent))",
                    "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
                    border: "hsl(var(--sidebar-border))",
                    ring: "hsl(var(--sidebar-ring))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "fade-in": {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "fade-in-left": {
                    "0%": { opacity: "0", transform: "translateX(-20px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                "scale-in": {
                    "0%": { opacity: "0", transform: "scale(0.95)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
                "slide-up": {
                    "0%": { opacity: "0", transform: "translateY(40px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "pulse-glow": {
                    "0%, 100%": { boxShadow: "0 0 20px hsl(24 95% 53% / 0.3)" },
                    "50%": { boxShadow: "0 0 40px hsl(24 95% 53% / 0.6)" },
                },
                "float": {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-10px)" },
                },
                "shimmer": {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.6s ease-out forwards",
                "fade-in-left": "fade-in-left 0.6s ease-out forwards",
                "scale-in": "scale-in 0.4s ease-out forwards",
                "slide-up": "slide-up 0.8s ease-out forwards",
                "pulse-glow": "pulse-glow 2s ease-in-out infinite",
                "float": "float 3s ease-in-out infinite",
                "shimmer": "shimmer 2s linear infinite",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
