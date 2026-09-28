import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../services/auth_service.dart';
import '../../widgets/app_button.dart';
import '../../widgets/app_text_field.dart';

class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();
  final _confirmTextController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmTextController.dispose();
    super.dispose();
  }

  Future<void> _handleDeleteAccount() async {
    if (!_formKey.currentState!.validate()) return;
    if (_confirmTextController.text.trim().toUpperCase() != 'DELETE') {
      setState(() {
        _errorMessage = 'Please type DELETE in capital letters to confirm.';
      });
      return;
    }

    final authService = context.read<AuthService>();
    final userEmail = authService.currentUser?.email ?? 'your account';

    final confirmDialog = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: Text(
          'Confirm Account Deletion',
          style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        content: Text(
          'Are you absolutely sure you want to permanently delete $userEmail? This action CANNOT be undone.',
          style: GoogleFonts.poppins(fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
            ),
            onPressed: () => Navigator.pop(dialogCtx, true),
            child: const Text('Permanently Delete'),
          ),
        ],
      ),
    );

    if (confirmDialog != true || !mounted) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await authService.deleteAccount(_passwordController.text);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Your account has been deleted successfully.'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
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
    final user = context.watch<AuthService>().currentUser;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(
          'Delete Account',
          style: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppTheme.errorColor,
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
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Warning Banner Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.errorColor.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.errorColor.withOpacity(0.3)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: AppTheme.errorColor, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Warning: Permanent Action',
                            style: GoogleFonts.poppins(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                              color: AppTheme.errorColor,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Deleting your JoyEvents account permanently purges your profile, stored favorites, and active sessions.',
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              color: AppTheme.errorColor.withOpacity(0.9),
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              Text(
                'What gets deleted?',
                style: GoogleFonts.poppins(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textColor,
                ),
              ),
              const SizedBox(height: 8),
              _buildBulletItem('Your profile name, email, phone, and avatar'),
              _buildBulletItem('Saved favorites and cart items'),
              _buildBulletItem('Device push notification registration tokens'),
              _buildBulletItem('Merchant business listings and profile details'),
              const SizedBox(height: 14),

              Text(
                'Statutory Retention Note:',
                style: GoogleFonts.poppins(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.subtitleColor,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Financial transaction records for completed bookings or wallet deposits are retained for statutory accounting and legal compliance.',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  color: AppTheme.subtitleColor,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),

              if (_errorMessage != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.errorColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.errorColor.withOpacity(0.4)),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: GoogleFonts.poppins(
                      color: AppTheme.errorColor,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Re-authentication Form
              Text(
                'Confirm Account Ownership',
                style: GoogleFonts.poppins(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textColor,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Logged in as: ${user?.email ?? ""}',
                style: GoogleFonts.poppins(
                  fontSize: 12.5,
                  color: AppTheme.subtitleColor,
                ),
              ),
              const SizedBox(height: 16),

              AppTextField(
                controller: _passwordController,
                label: 'Enter Password',
                hint: '••••••••',
                obscureText: _obscurePassword,
                prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    size: 20,
                  ),
                  onPressed: () {
                    setState(() {
                      _obscurePassword = !_obscurePassword;
                    });
                  },
                ),
                validator: (val) {
                  if (val == null || val.isEmpty) return 'Please enter your password';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              AppTextField(
                controller: _confirmTextController,
                label: 'Type "DELETE" to confirm',
                hint: 'DELETE',
                prefixIcon: const Icon(Icons.edit_note_rounded, size: 20),
                validator: (val) {
                  if (val == null || val.trim().toUpperCase() != 'DELETE') {
                    return 'Please type DELETE to confirm';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 28),

              AppButton(
                text: 'Permanently Delete Account',
                isLoading: _isLoading,
                color: AppTheme.errorColor,
                showArrow: false,
                icon: Icons.delete_forever_rounded,
                onPressed: _handleDeleteAccount,
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBulletItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle_outline_rounded, size: 16, color: AppTheme.errorColor),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.poppins(
                fontSize: 12.5,
                color: AppTheme.textColor,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
