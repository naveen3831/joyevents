import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Lock, ShieldCheck, ArrowLeft, Clock, Mail, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useHomepageSettings } from "@/hooks/useHomepageSettings";
import { usePlatformName } from "@/hooks/usePlatformName";

const Privacy = () => {
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
            <Lock className="h-3.5 w-3.5" /> Data Protection & Privacy
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> Last Updated: September 28, 2026
          </p>
        </div>

        {/* Legal Document Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-foreground/90 text-sm leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              1. Overview
            </h2>
            <p>
              This Privacy Policy explains how <strong>{platformName}</strong> (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, processes, stores, and protects personal data when you access our website or use our Flutter mobile applications.
            </p>
            <p>
              We are committed to maintaining the security and privacy of your data in full alignment with global data protection standards and Google Play Store Data Safety policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              2. Data We Actually Collect & Process
            </h2>
            <p>
              We only collect data that is strictly necessary to provide event booking, ticket issuing, merchant management, and wallet services. This includes:
            </p>

            <div className="grid sm:grid-cols-2 gap-4 not-prose my-4">
              <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Personal Identification Data
                </h3>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Full Name</li>
                  <li>Email Address</li>
                  <li>Mobile / Phone Number</li>
                  <li>Encrypted Password Hash</li>
                  <li>Profile Avatar / Image</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Merchant & Business Info
                </h3>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Business Name & Description</li>
                  <li>Experience & Business Address</li>
                  <li>Event & Service Offerings</li>
                  <li>Bank / UPI Payout Details</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Transaction & App Activity
                </h3>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Event Bookings & Ticket Purchases</li>
                  <li>In-App Wallet Balances & Logs</li>
                  <li>Saved Favorites & Cart Items</li>
                  <li>In-App Support & Chat Messages</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Technical & Device Data
                </h3>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Firebase Push Notification Tokens</li>
                  <li>Session authentication tokens</li>
                  <li>Device specs & Error logs</li>
                  <li>Uploaded event/service media</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Account Creation & Authentication:</strong> To register your account, authenticate logins, and manage user roles (Customer vs Merchant).</li>
              <li><strong>Booking Execution & Digital Ticketing:</strong> To process ticket purchases, generate QR codes, and facilitate service bookings.</li>
              <li><strong>Financial Transactions & Wallet:</strong> To maintain in-app wallet balances, process deposit credits, and execute merchant withdrawal requests.</li>
              <li><strong>Customer-Merchant Communication:</strong> To enable direct messaging between event organizers and customers for event coordination.</li>
              <li><strong>Notifications & Alerts:</strong> To send push notifications regarding booking updates, ticket status, and security alerts.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              4. Third-Party SDKs & Service Providers
            </h2>
            <p>
              We integrate with trusted third-party service providers solely to perform essential infrastructure operations:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Google Firebase Cloud Messaging (FCM):</strong> Delivers transactional push notifications to mobile devices.</li>
              <li><strong>Cloudinary:</strong> Provides secure cloud storage and delivery for user avatars, event photos, and service media.</li>
              <li><strong>Nodemailer / SMTP:</strong> Sends transactional emails for account registration credentials, password resets, and ticket receipts.</li>
            </ul>
            <p className="mt-2 font-medium text-foreground">
              We do NOT sell, rent, or trade your personal data to advertising networks or third-party marketers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              5. Data Security Measures
            </h2>
            <p>
              We implement industry-standard security safeguards to protect your personal information:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>All data transmissions between mobile/web clients and server infrastructure are encrypted via HTTPS (TLS 1.2/1.3).</li>
              <li>User passwords are hashed using bcrypt with salt rounds before database storage.</li>
              <li>Authentication tokens (JWT) are stored securely using device secure storage (Flutter SecureStorage) on mobile.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              6. Data Retention & Account Deletion Policy
            </h2>
            <p>
              We retain your personal data for as long as your account remains active or as required to fulfill services.
            </p>
            <p>
              <strong>Account Deletion:</strong> You have the absolute right to delete your account and associated personal data at any time:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Mobile App:</strong> Navigate to <em>Profile → Edit Profile / Settings → Delete Account</em>.</li>
              <li><strong>Web App:</strong> Visit our dedicated public <Link to="/account-deletion" className="text-primary hover:underline">Account Deletion Page</Link>.</li>
            </ul>
            <p>
              Upon verified account deletion, your user profile, favorites, device push tokens, and cart items are permanently purged from active databases. Legally mandated financial transaction logs are retained for statutory accounting compliance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              7. Children&apos;s Privacy
            </h2>
            <p>
              {platformName} is not intended for children under 13 years of age. We do not knowingly collect personal data from children under 13. If we become aware that a child under 13 has registered without verified parental consent, we will immediately delete such account data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              8. Google Play Data Safety Compliance
            </h2>
            <p>
              Our data processing practices strictly comply with Google Play Developer Policies. A full Data Safety summary is available on our Google Play Store listing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">
              9. Privacy Contact Information
            </h2>
            <p>
              For any questions, data access requests, or privacy concerns, please contact our Privacy Officer at:
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
            <Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
            <Link to="/account-deletion" className="hover:text-primary transition-colors">Account Deletion</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact Support</Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;
