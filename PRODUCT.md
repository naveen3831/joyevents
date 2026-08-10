# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three roles, each with a dedicated dashboard:
- **Customers**: consumers browsing/buying event tickets or booking service providers (venues, decorators, bands, caterers, etc.), paying full or partial advance payment, chatting with merchants, and leaving 1-5 star reviews.
- **Merchants**: businesses/planners/vendors who sell ticketed events (B2C) or offer bookable full-service event hiring (B2B/B2C), manage bookings, run promo/marketing campaigns, validate tickets at live events via QR, and request payouts.
- **Admins**: platform operators who verify/activate merchants, manage onboarding quotations and limit upgrades, configure global site settings, audit transactions, approve withdrawals/refunds, and moderate content.

## Product Purpose

JoyEvents is a dual-sided event & service marketplace bridging event organizers/service providers (Merchants) with event attendees/clients (Customers), under Admin oversight. Success means smooth ticketed-event sales and full-service booking negotiations, reliable payments, and trust between merchants and customers.

## Positioning

Combines two marketplace models in one platform: direct ticket sales (B2C, with tiers/sessions/seats) and negotiated full-service hiring (custom add-ons, guest counts, location, quotation-based). Adds a structured merchant verification/onboarding pipeline, QR-based live ticket validation, automated commission/payout handling, and personalized AI recommendations.

## Operating Context

- Merchant onboarding pipeline: registration → details submitted → admin quotation → merchant payment → admin activation with slot limits (events/services).
- Limit upgrade ticket flow: merchant requests more slots → admin quotes → merchant pays → admin approves → limits increase.
- Booking & payment lifecycle (services): customer request → merchant approval + payment request (full or partial advance) → customer pays → merchant completes service → customer pays remaining balance (if partial) → customer reviews → admin processes payout minus commission.
- Ticketed events: tiers (e.g. Silver/Gold/Diamond), day/night sessions, seat allocation.
- Real-time database polling; PDF invoice generation; in-app chat/inbox between customers and merchants; QR-code ticket validation at live events.

## Capabilities and Constraints

- Payments: full or partial advance payment via credit card or mock UPI (mock/demo payment layer, not a live processor).
- Ticket validation via typed Ticket ID or QR code scan.
- Marketing: merchant-generated promo codes and push notifications.
- Admin controls homepage layout content (hero titles, stats cards, about-us copy) via settings.
- Stack (existing codebase, not decided during init): React 18 + Vite frontend (Tailwind CSS, Radix UI primitives, shadcn-style components, Framer Motion/GSAP/Three.js for motion/3D, react-router-dom, react-hook-form + zod, i18next); Node/Express-style backend under `backend/src` with MongoDB-style models (Booking, Event, Service, User, Ticket, Transaction, Withdrawal, etc.).

## Brand Commitments

- **Light mode only.** The user has explicitly requested white/light mode as the visual baseline going forward — this supersedes the prior dark-mode-only UI described in existing project docs. Future design work should treat light mode as the committed default, not dark mode.

## Evidence on Hand

No testimonials, case studies, press, or canned marketing proof exist yet. Future design work must not fabricate customer quotes, stats, logos, or press mentions — use real data where the product already has it (e.g. real event/service records, actual review content) or clearly mark placeholder content.

## Product Principles

1. Trust and verification first: merchant onboarding, admin oversight, and payment/commission handling exist to protect both sides of the marketplace.
2. Dual booking models (ticketed vs. negotiated service hiring) are core and must both stay first-class, not one treated as secondary.
3. Transparency in the payment lifecycle: partial/advance payments, remaining balances, and payouts must always be clear to the user involved.
4. Light-mode-first visual system, replacing the legacy dark-mode UI.
5. Real-time responsiveness (polling, chat, live ticket validation) is a functional expectation, not just a visual nicety.

## Accessibility & Inclusion

No formal accessibility standard mandated yet; no specific user needs have been recorded.
