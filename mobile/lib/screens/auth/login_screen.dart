import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:dio/dio.dart';
import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../services/auth_service.dart';

/// Clean, premium native mobile login screen for Eventoza.
///
/// Section layout:
///   1. BrandCard — Compact framed brand logo card (centered, soft shadow, no extra text)
///   2. LoginFormCard — Main login card (Welcome Back, fields, CTA, links)
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _showServerConfigModal(BuildContext context) {
    final controller = TextEditingController(text: ApiConfig.baseUrl);
    bool testing = false;
    String? statusMessage;
    bool statusSuccess = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (bCtx) => StatefulBuilder(
        builder: (ctx, setMState) {
          Future<void> testAndSave(String targetUrl) async {
            setMState(() {
              testing = true;
              statusMessage = 'Testing connection to $targetUrl...';
              statusSuccess = false;
            });

            final cleanUrl = ApiConfig.normalizeUrl(targetUrl);
            final dio = Dio(BaseOptions(
              connectTimeout: const Duration(seconds: 4),
              receiveTimeout: const Duration(seconds: 4),
            ));

            try {
              final res = await dio.get('$cleanUrl/events');
              if (res.statusCode == 200) {
                ApiConfig.baseUrl = cleanUrl;
                setMState(() {
                  testing = false;
                  statusSuccess = true;
                  statusMessage = 'Connected successfully to backend!';
                  controller.text = cleanUrl;
                });
                return;
              }
            } catch (e) {
              setMState(() {
                testing = false;
                statusSuccess = false;
                statusMessage = 'Connection failed: $e';
              });
            }
          }

          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.dns_rounded, color: AppTheme.primaryColor, size: 22),
                    const SizedBox(width: 8),
                    Text(
                      'Server IP Configuration',
                      style: GoogleFonts.poppins(fontSize: 17, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Current Active URL: ${ApiConfig.baseUrl}',
                  style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor),
                ),
                const SizedBox(height: 14),
                const Text('Select Environment / IP Preset:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ActionChip(
                      label: const Text('Auto-Detect', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      avatar: const Icon(Icons.auto_mode_rounded, size: 14),
                      onPressed: () async {
                        setMState(() {
                          testing = true;
                          statusMessage = 'Auto-detecting active server...';
                        });
                        final found = await ApiConfig.autoDetectWorkingServer();
                        setMState(() {
                          testing = false;
                          if (found != null) {
                            statusSuccess = true;
                            statusMessage = 'Found active server: $found';
                            controller.text = found;
                          } else {
                            statusSuccess = false;
                            statusMessage = 'No active local server found.';
                          }
                        });
                      },
                    ),
                    ActionChip(
                      label: const Text('USB/ADB (127.0.0.1)', style: TextStyle(fontSize: 11)),
                      onPressed: () => testAndSave(ApiConfig.adbUsbBaseUrl),
                    ),
                    ActionChip(
                      label: const Text('Public Tunnel (HTTPS)', style: TextStyle(fontSize: 11)),
                      onPressed: () => testAndSave(ApiConfig.publicTunnelBaseUrl),
                    ),
                    ActionChip(
                      label: const Text('LAN (192.168.88.19)', style: TextStyle(fontSize: 11)),
                      onPressed: () => testAndSave(ApiConfig.lanBaseUrl),
                    ),
                    ActionChip(
                      label: const Text('Emulator (10.0.2.2)', style: TextStyle(fontSize: 11)),
                      onPressed: () => testAndSave(ApiConfig.emulatorBaseUrl),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: controller,
                  decoration: InputDecoration(
                    labelText: 'Custom Server URL or IP',
                    hintText: 'e.g. 192.168.1.50:5000',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
                const SizedBox(height: 12),
                if (statusMessage != null) ...[
                  Text(
                    statusMessage!,
                    style: TextStyle(
                      fontSize: 12,
                      color: statusSuccess ? Colors.green.shade700 : AppTheme.errorColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: testing ? null : () => testAndSave(controller.text),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: testing
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Test & Save Server URL'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showSupportModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (bCtx) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.help_outline_rounded, color: AppTheme.primaryColor, size: 22),
                const SizedBox(width: 8),
                Text(
                  'Help & Support',
                  style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Need assistance with your account, event bookings, or merchant onboarding?',
              style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.subtitleColor),
            ),
            const SizedBox(height: 16),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.email_outlined, color: AppTheme.primaryColor),
              title: const Text('Email Support'),
              subtitle: const Text('info@eventoza.com'),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.headset_mic_outlined, color: AppTheme.primaryColor),
              title: const Text('Support Hours'),
              subtitle: const Text('Mon - Sat: 9:00 AM - 8:00 PM IST'),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await AuthService().login(
        _emailController.text.trim(),
        _passwordController.text,
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: Stack(
        children: [
          // Subtle ambient background glow orbs
          Positioned(
            top: -100,
            left: -80,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppTheme.primaryColor.withValues(alpha: 0.06),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -60,
            right: -80,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppTheme.accentColor.withValues(alpha: 0.04),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Main 2-card layout
          SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(height: 28),

                      // 1. BRAND CARD
                      BrandCard(screenWidth: screenWidth),

                      const SizedBox(height: 26),

                      // 2. LOGIN FORM CARD
                      LoginFormCard(
                        emailController: _emailController,
                        passwordController: _passwordController,
                        obscurePassword: _obscurePassword,
                        isLoading: _isLoading,
                        errorMessage: _errorMessage,
                        onTogglePasswordVisibility: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                        onLoginSubmitted: _handleLogin,
                        onForgotPasswordPressed: () => context.push('/forgot-password'),
                        onCreateAccountPressed: () => context.push('/register'),
                        onTermsPressed: () => context.push('/terms'),
                        onPrivacyPressed: () => context.push('/privacy'),
                        onSupportPressed: () => _showSupportModal(context),
                        onServerConfigPressed: () => _showServerConfigModal(context),
                      ),

                      const SizedBox(height: 28),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 1. BRAND CARD
/// Prominent, centered brand card framing ONLY the Eventoza logo.
/// Width is ~75% of screen (clamped 260–320px), height 160px, logo 96px.
class BrandCard extends StatelessWidget {
  final double screenWidth;

  const BrandCard({super.key, required this.screenWidth});

  @override
  Widget build(BuildContext context) {
    // 75% of screen width, clamped between 260–320px
    final cardWidth = (screenWidth * 0.75).clamp(260.0, 320.0);

    return Container(
      width: cardWidth,
      height: 160,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppTheme.borderColor.withValues(alpha: 0.7),
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF060B28).withValues(alpha: 0.07),
            blurRadius: 28,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Center(
        child: SvgPicture.asset(
          'assets/images/eventoza_logo.svg',
          width: 96,
          height: 96,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}

/// 2. LOGIN FORM CARD
/// Clean, structured card containing header, form fields, action buttons & lightweight footer links.
class LoginFormCard extends StatelessWidget {
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final bool obscurePassword;
  final bool isLoading;
  final String? errorMessage;
  final VoidCallback onTogglePasswordVisibility;
  final VoidCallback onLoginSubmitted;
  final VoidCallback onForgotPasswordPressed;
  final VoidCallback onCreateAccountPressed;
  final VoidCallback onTermsPressed;
  final VoidCallback onPrivacyPressed;
  final VoidCallback onSupportPressed;
  final VoidCallback? onServerConfigPressed;

  const LoginFormCard({
    super.key,
    required this.emailController,
    required this.passwordController,
    required this.obscurePassword,
    required this.isLoading,
    this.errorMessage,
    required this.onTogglePasswordVisibility,
    required this.onLoginSubmitted,
    required this.onForgotPasswordPressed,
    required this.onCreateAccountPressed,
    required this.onTermsPressed,
    required this.onPrivacyPressed,
    required this.onSupportPressed,
    this.onServerConfigPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.borderColor),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title & Subtitle
          Text(
            'Welcome Back',
            style: GoogleFonts.poppins(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: AppTheme.textColor,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Sign in to access your account',
            style: GoogleFonts.poppins(
              fontSize: 13,
              color: AppTheme.subtitleColor,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 20),

          // Compact Error Banner
          if (errorMessage != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
              decoration: BoxDecoration(
                color: AppTheme.errorColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: AppTheme.errorColor.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.error_outline_rounded,
                    color: AppTheme.errorColor,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      errorMessage!,
                      style: GoogleFonts.poppins(
                        color: AppTheme.errorColor,
                        fontSize: 12,
                        height: 1.3,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Email Field
          _buildFieldLabel('EMAIL ADDRESS'),
          const SizedBox(height: 6),
          TextFormField(
            controller: emailController,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            style: _inputTextStyle(),
            decoration: _inputDecoration(
              hint: 'name@gmail.com',
              prefix: const Icon(Icons.mail_outline_rounded),
            ),
            validator: (val) {
              if (val == null || val.trim().isEmpty) {
                return 'Please enter your email';
              }
              if (!val.contains('@')) {
                return 'Enter a valid email address';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),

          // Password Row (Label + Forgot Password)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              _buildFieldLabel('PASSWORD'),
              GestureDetector(
                onTap: onForgotPasswordPressed,
                child: Text(
                  'Forgot password?',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Password Field
          TextFormField(
            controller: passwordController,
            obscureText: obscurePassword,
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => onLoginSubmitted(),
            style: _inputTextStyle(),
            decoration: _inputDecoration(
              hint: '••••••••',
              prefix: const Icon(Icons.lock_outline_rounded),
              suffix: GestureDetector(
                onTap: onTogglePasswordVisibility,
                child: Icon(
                  obscurePassword
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  size: 18,
                  color: AppTheme.subtitleColor,
                ),
              ),
            ),
            validator: (val) {
              if (val == null || val.isEmpty) {
                return 'Please enter your password';
              }
              if (val.length < 6) {
                return 'Password must be at least 6 characters';
              }
              return null;
            },
          ),
          const SizedBox(height: 22),

          // Primary Gradient CTA Button
          _GradientButton(
            text: 'Sign In',
            isLoading: isLoading,
            onPressed: onLoginSubmitted,
          ),
          const SizedBox(height: 18),

          // Create Account Text Link
          Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  "Don't have an account? ",
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    color: AppTheme.subtitleColor,
                  ),
                ),
                GestureDetector(
                  onTap: onCreateAccountPressed,
                  child: Text(
                    'Create Account',
                    style: GoogleFonts.poppins(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Secondary Lightweight Legal/Help Links
          Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                GestureDetector(
                  onTap: onTermsPressed,
                  child: Text(
                    'Terms',
                    style: GoogleFonts.poppins(
                      fontSize: 11,
                      color: AppTheme.subtitleColor.withValues(alpha: 0.85),
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
                Text(
                  '  •  ',
                  style: TextStyle(
                    color: AppTheme.subtitleColor.withValues(alpha: 0.5),
                    fontSize: 11,
                  ),
                ),
                GestureDetector(
                  onTap: onPrivacyPressed,
                  child: Text(
                    'Privacy',
                    style: GoogleFonts.poppins(
                      fontSize: 11,
                      color: AppTheme.subtitleColor.withValues(alpha: 0.85),
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
                Text(
                  '  •  ',
                  style: TextStyle(
                    color: AppTheme.subtitleColor.withValues(alpha: 0.5),
                    fontSize: 11,
                  ),
                ),
                GestureDetector(
                  onTap: onSupportPressed,
                  child: Text(
                    'Help / Support',
                    style: GoogleFonts.poppins(
                      fontSize: 11,
                      color: AppTheme.subtitleColor.withValues(alpha: 0.85),
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
                if (onServerConfigPressed != null) ...[
                  Text(
                    '  •  ',
                    style: TextStyle(
                      color: AppTheme.subtitleColor.withValues(alpha: 0.5),
                      fontSize: 11,
                    ),
                  ),
                  GestureDetector(
                    onTap: onServerConfigPressed,
                    child: Text(
                      'Server IP',
                      style: GoogleFonts.poppins(
                        fontSize: 11,
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.w600,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  static Widget _buildFieldLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.poppins(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: AppTheme.subtitleColor,
        letterSpacing: 0.5,
      ),
    );
  }

  static TextStyle _inputTextStyle() => GoogleFonts.poppins(
        fontSize: 13.5,
        color: AppTheme.textColor,
        fontWeight: FontWeight.w400,
      );

  static InputDecoration _inputDecoration({
    required String hint,
    Widget? prefix,
    Widget? suffix,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.poppins(
        fontSize: 13.5,
        color: const Color(0xFF94A3B8),
      ),
      filled: true,
      fillColor: AppTheme.inputFillColor,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      prefixIcon: prefix != null
          ? Padding(
              padding: const EdgeInsets.only(left: 12, right: 8),
              child: IconTheme(
                data: const IconThemeData(
                  color: AppTheme.subtitleColor,
                  size: 18,
                ),
                child: prefix,
              ),
            )
          : null,
      prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
      suffixIcon: suffix != null
          ? Padding(
              padding: const EdgeInsets.only(right: 12),
              child: suffix,
            )
          : null,
      suffixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppTheme.borderColor),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppTheme.borderColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppTheme.errorColor),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppTheme.errorColor, width: 1.5),
      ),
    );
  }
}

/// Primary Gradient Action Button
class _GradientButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;

  const _GradientButton({
    required this.text,
    this.onPressed,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            gradient: AppTheme.gradientPrimary,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryColor.withValues(alpha: 0.25),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: InkWell(
            onTap: isLoading ? null : onPressed,
            borderRadius: BorderRadius.circular(16),
            splashColor: Colors.white.withValues(alpha: 0.12),
            child: Center(
              child: isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          text,
                          style: GoogleFonts.poppins(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(
                          Icons.arrow_forward_rounded,
                          size: 18,
                          color: Colors.white,
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
