import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_theme.dart';
import '../../services/auth_service.dart';

/// Login screen — compact, mobile-responsive layout matching Eventoza React branding.
///
/// Section flow (top → bottom):
///   Logo → Badge → Gradient Headline → Short Description →
///   White Card: [Welcome Back, Compact Error Banner, Email, Password + Forgot, Sign In →, Create Account]
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
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: Stack(
        children: [
          // Background subtle ambient glow orbs
          Positioned(
            top: -60,
            left: -60,
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppTheme.primaryColor.withOpacity(0.12),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 20,
            right: -50,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppTheme.accentColor.withOpacity(0.10),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Main compact scrollable view
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // LOGO
                      SvgPicture.asset(
                        'assets/images/eventoza_logo.svg',
                        width: 52,
                        height: 52,
                        fit: BoxFit.contain,
                      ),
                      const SizedBox(height: 12),

                      // BADGE
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppTheme.tintVioletBg,
                          borderRadius: BorderRadius.circular(100),
                          border: Border.all(
                            color: AppTheme.primaryColor.withOpacity(0.25),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.auto_awesome_rounded,
                              size: 12,
                              color: AppTheme.primaryColor,
                            ),
                            const SizedBox(width: 5),
                            Text(
                              'The Premier Event Platform',
                              style: GoogleFonts.poppins(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // HEADLINE
                      Text(
                        'Unlock Joy in',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.poppins(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textColor,
                          height: 1.15,
                        ),
                      ),
                      ShaderMask(
                        shaderCallback: (bounds) =>
                            AppTheme.gradientPrimary.createShader(bounds),
                        child: Text(
                          'Every Celebration',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.poppins(
                            fontSize: 26,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            height: 1.15,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),

                      // PROMO DESCRIPTION (Compact)
                      Text(
                        'Connect with professional merchants, discover trending ticketed events, and coordinate full-service entertainment packages flawlessly.',
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.poppins(
                          fontSize: 12.5,
                          color: AppTheme.subtitleColor,
                          height: 1.45,
                        ),
                      ),
                      const SizedBox(height: 18),

                      // LOGIN CARD
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppTheme.borderColor),
                          boxShadow: AppTheme.cardShadow,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Card Title & Subtitle
                            Text(
                              'Welcome Back',
                              style: GoogleFonts.poppins(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textColor,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Sign in to access your account',
                              style: GoogleFonts.poppins(
                                fontSize: 12.5,
                                color: AppTheme.subtitleColor,
                                height: 1.3,
                              ),
                            ),
                            const SizedBox(height: 16),

                            // COMPACT ERROR BANNER
                            if (_errorMessage != null) ...[
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                                decoration: BoxDecoration(
                                  color: AppTheme.errorColor.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: AppTheme.errorColor.withOpacity(0.3),
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
                                        _errorMessage!,
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
                              const SizedBox(height: 14),
                            ],

                            // EMAIL FIELD
                            _buildLabel('EMAIL ADDRESS'),
                            const SizedBox(height: 5),
                            TextFormField(
                              controller: _emailController,
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
                            const SizedBox(height: 14),

                            // PASSWORD ROW
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildLabel('PASSWORD'),
                                TextButton(
                                  onPressed: () =>
                                      context.push('/forgot-password'),
                                  style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero,
                                    minimumSize: Size.zero,
                                    tapTargetSize:
                                        MaterialTapTargetSize.shrinkWrap,
                                  ),
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
                            const SizedBox(height: 5),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) => _handleLogin(),
                              style: _inputTextStyle(),
                              decoration: _inputDecoration(
                                hint: '••••••••',
                                prefix: const Icon(Icons.lock_outline_rounded),
                                suffix: GestureDetector(
                                  onTap: () => setState(
                                    () => _obscurePassword = !_obscurePassword,
                                  ),
                                  child: Icon(
                                    _obscurePassword
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
                            const SizedBox(height: 18),

                            // SIGN IN BUTTON
                            _GradientButton(
                              text: 'Sign In',
                              isLoading: _isLoading,
                              onPressed: _handleLogin,
                            ),
                            const SizedBox(height: 16),

                            // CREATE ACCOUNT LINK
                            Center(
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    "Don't have an account? ",
                                    style: GoogleFonts.poppins(
                                      fontSize: 12.5,
                                      color: AppTheme.subtitleColor,
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () => context.push('/register'),
                                    child: Text(
                                      'Create Account',
                                      style: GoogleFonts.poppins(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w700,
                                        color: AppTheme.primaryColor,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
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

  Widget _buildLabel(String text) {
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

  TextStyle _inputTextStyle() => GoogleFonts.poppins(
        fontSize: 13.5,
        color: AppTheme.textColor,
        fontWeight: FontWeight.w400,
      );

  InputDecoration _inputDecoration({
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
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
      height: 50,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          decoration: BoxDecoration(
            gradient: AppTheme.gradientPrimary,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryColor.withOpacity(0.28),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: InkWell(
            onTap: isLoading ? null : onPressed,
            borderRadius: BorderRadius.circular(12),
            splashColor: Colors.white.withOpacity(0.12),
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
