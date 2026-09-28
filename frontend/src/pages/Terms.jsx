import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShieldCheck, FileText, ArrowLeft, Clock, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
import { usePlatformName } from "@/hooks/usePlatformName";

const Terms = () => {
  const settings = useHomepageSettings();
  const platformName = usePlatformName();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation Breadcrumb / Back button */}
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border bg-card"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        </div>

        {/* Hero Section */}
        <div className="border-b border-border pb-8 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-3">
            <ShieldCheck className="h-3.5 w-3.5" /> Legal & Governance
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Terms & Conditions
          </h1>
          <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> Last Updated: September 28, 2026
          </p>
        </div>

        {/* Legal Document Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-foreground/90 text-sm leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              1. Introduction & Acceptance of Terms
            </h2>
            <p>
              Welcome to <strong>{platformName}</strong> (accessible via website and mobile applications). These Terms & Conditions (&quot;Terms&quot;) govern your access to and use of the {platformName} platform, services, ticket booking engines, merchant management tools, and mobile applications.
            </p>
            <p>
              By creating an account, browsing events, booking services, or accessing any part of the platform, you agree to be legally bound by these Terms. If you do not agree to these Terms, you must not access or use the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              2. Platform Role & Marketplace Structure
            </h2>
            <p>
              {platformName} operates as an online marketplace connecting customers seeking event planning, ticketed experiences, and event-related services with independent merchants, event organizers, and service providers (&quot;Merchants&quot;).
            </p>
            <p>
              <strong>Important Clarification:</strong> Unless explicitly stated on a specific event listing, {platformName} acts as an intermediary technology platform. Contracts for event admission, service delivery, and performance are formed directly between the Customer and the respective Merchant. {platformName} is not a party to contract execution for third-party merchant listings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              3. Eligibility & Account Registration
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Age Requirement:</strong> You must be at least 18 years old, or the legal age of majority in your jurisdiction, to register an account or initiate paid bookings.</li>
              <li><strong>Account Accuracy:</strong> You agree to provide accurate, complete, and updated information during registration, including your full legal name and email address.</li>
              <li><strong>Account Credentials:</strong> You are solely responsible for maintaining the confidentiality of your account credentials and for all activities occurring under your account.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              4. Customer Accounts & Responsibilities
            </h2>
            <p>
              As a Customer, you agree to inspect event details, service specifications, pricing, date, time, and venue before completing any purchase or booking request. You are responsible for ensuring timely attendance at ticketed events and providing necessary information to service providers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              5. Merchant Accounts & Responsibilities
            </h2>
            <p>
              Merchants creating event listings, offering services, or accepting custom requests agree that:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>All event descriptions, service packages, ticket allocations, and pricing accurate reflect actual offerings.</li>
              <li>They possess all necessary licenses, permits, safety clearances, and insurance required to host events or provide services.</li>
              <li>They will honor confirmed bookings and valid digital tickets validated through the platform&apos;s ticket scanner.</li>
              <li>Listing limits and quotation guidelines enforced by platform administrators must be respected.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              6. Bookings, Orders & Digital Tickets
            </h2>
            <p>
              When a booking or ticket purchase is completed, a digital QR code or confirmation ticket is issued within the application. Digital tickets must be presented at the venue or service initiation point for verification. Duplicate, copied, or unauthorized ticket reproductions will be rejected by the ticket validation system.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              7. Pricing, Payments & In-App Wallet
            </h2>
            <p>
              All prices displayed are in Indian Rupees (₹) unless otherwise stated. {platformName} provides integrated digital wallet functionality (&quot;JoyEvents Wallet&quot;).
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Wallet Deposits & Payments:</strong> Users may credit wallet balances or pay for bookings via supported payment methods (UPI, Cards, NetBanking).</li>
              <li><strong>Merchant Withdrawals:</strong> Merchants may request payouts of earned funds to their verified UPI ID or Bank Account subject to admin verification and platform settlement rules.</li>
              <li><strong>No Financial Interest:</strong> Wallet balances do not earn interest and represent store credit for platform usage or payout settlement.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              8. Cancellations, Refunds & Rescheduling
            </h2>
            <p>
              Cancellation and refund policies are governed by the specific rules associated with each booking and platform administration:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Event Cancellations:</strong> If an event is cancelled by the Merchant or Platform Admin, customers are eligible for a full refund or wallet credit as determined by platform support.</li>
              <li><strong>Customer-Initiated Cancellations:</strong> Refunds for customer cancellations depend on the specific Merchant&apos;s cancellation window and booking terms specified prior to checkout.</li>
              <li><strong>Refund Processing:</strong> Approved refunds are credited back to the customer&apos;s JoyEvents Wallet or original payment instrument within standard banking processing periods.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              9. Prohibited Activities
            </h2>
            <p>Users and Merchants shall not:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Post fraudulent, misleading, offensive, or illegal event listings.</li>
              <li>Attempt to circumvent platform fees or conduct offline transactions to bypass marketplace protections.</li>
              <li>Use automated tools, bots, or scraping to harvest event data or tickets.</li>
              <li>Attempt unauthorized access to other accounts or platform server infrastructure.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              10. Intellectual Property
            </h2>
            <p>
              All trademarks, logos, UI designs, code, graphics, and brand elements associated with {platformName} are the property of {platformName} and its licensors. Users retain ownership of images and descriptions they upload but grant {platformName} a worldwide license to display and distribute such content for platform operation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              11. Account Suspension & Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or compromise platform security. Users may request voluntary account deletion at any time via the Account Deletion flow in the app or website.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              12. Limitation of Liability & Disclaimers
            </h2>
            <p>
              {platformName} is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind. {platformName} shall not be liable for indirect, incidental, or consequential damages resulting from event cancellations by third parties, merchant non-performance, or temporary service unavailability.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              13. Contact & Governance
            </h2>
            <p>
              For questions regarding these Terms & Conditions, please contact our support team at:
            </p>
            <div className="p-4 rounded-xl bg-card border border-border space-y-1 text-sm font-medium">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Email: <a href={`mailto:${settings.contactEmail}`} className="text-primary hover:underline">{settings.contactEmail}</a></p>
              <p>Platform: {platformName}</p>
            </div>
          </section>

        </div>

        {/* Footer links sub-nav */}
        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground justify-between items-center">
          <p>© 2026 {platformName}. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/account-deletion" className="hover:text-primary transition-colors">Account Deletion</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact Support</Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
