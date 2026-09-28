import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/app_theme.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(
          'Privacy Policy',
          style: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppTheme.textColor,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: AppTheme.textColor),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.successColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.lock_outline_rounded, size: 14, color: AppTheme.successColor),
                  const SizedBox(width: 6),
                  Text(
                    'Data Protection',
                    style: GoogleFonts.poppins(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.successColor,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            Text(
              'Privacy Policy',
              style: GoogleFonts.poppins(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: AppTheme.textColor,
              ),
            ),
            const SizedBox(height: 4),

            Row(
              children: [
                const Icon(Icons.schedule_rounded, size: 14, color: AppTheme.subtitleColor),
                const SizedBox(width: 4),
                Text(
                  'Last Updated: September 28, 2026',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: AppTheme.subtitleColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 16),

            _buildSection(
              title: '1. Overview',
              content:
                  'JoyEvents / Eventoza is committed to protecting your privacy. This Privacy Policy details the exact personal data collected, how it is processed, stored, shared, and your rights regarding account and data deletion.',
            ),
            _buildSection(
              title: '2. Personal Data Actually Collected',
              content:
                  'We only collect data necessary to provide our event booking and merchant platform services:\n\n'
                  '• Profile Info: Name, Email Address, Phone Number, Encrypted Password, Profile Avatar.\n'
                  '• Merchant Data: Business Name, Business Description, Address, Experience, Bank/UPI payout details.\n'
                  '• Transaction Data: Event Bookings, Ticket Purchases, Wallet Balance & History, Cart Items.\n'
                  '• Communication Data: In-app chat messages with event organizers, support enquiries.\n'
                  '• Device Info: Firebase Push Notification Registration Tokens (FCM) for event alerts.',
            ),
            _buildSection(
              title: '3. How Data is Used',
              content:
                  'Your data is used strictly to authenticate your account, process ticket purchases, maintain wallet balances, send push notifications, facilitate customer-merchant messages, and provide support.',
            ),
            _buildSection(
              title: '4. Third-Party Integrations & SDKs',
              content:
                  'We integrate with essential, verified infrastructure providers:\n\n'
                  '• Google Firebase (FCM): For push notification delivery.\n'
                  '• Cloudinary: For secure image hosting.\n'
                  '• Nodemailer / SMTP: For transactional email delivery.\n\n'
                  'We DO NOT sell, rent, or share personal data with third-party advertisers or data brokers.',
            ),
            _buildSection(
              title: '5. Security Safeguards',
              content:
                  'Data transfers are encrypted over HTTPS (TLS 1.2/1.3). User passwords are stored using bcrypt hashing. Auth tokens are secured on-device using Flutter SecureStorage.',
            ),
            _buildSection(
              title: '6. Data Retention & Account Deletion',
              content:
                  'You may delete your account at any time from Profile → Account → Delete Account in the app, or via our public website at /account-deletion. Upon deletion, user profiles, push tokens, and favorites are permanently removed.',
            ),
            _buildSection(
              title: '7. Children\'s Privacy',
              content:
                  'Our platform is not directed to children under 13 years of age. Accounts created by minors without guardian authorization will be deleted upon notification.',
            ),
            _buildSection(
              title: '8. Google Play Data Safety',
              content:
                  'Our data collection practices comply with Google Play Developer Policies and Data Safety declaration guidelines.',
            ),
            _buildSection(
              title: '9. Contact Support',
              content:
                  'For privacy inquiries or data requests, email our Privacy Team at info@eventoza.com.',
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSection({required String title, required String content}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.poppins(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppTheme.textColor,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            content,
            style: GoogleFonts.poppins(
              fontSize: 13,
              color: AppTheme.textColor.withOpacity(0.85),
              height: 1.55,
            ),
          ),
        ],
      ),
    );
  }
}
