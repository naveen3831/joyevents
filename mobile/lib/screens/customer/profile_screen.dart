import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../config/app_theme.dart';
import '../../services/auth_service.dart';
import '../../widgets/customer_gradient_header.dart';
import '../../widgets/app_network_image.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isLoggingOut = false;

  Future<void> _handleLogout() async {
    if (_isLoggingOut) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Logout?'),
        content: const Text(
          'Are you sure you want to log out of your JoyEvents account?',
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
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      setState(() => _isLoggingOut = true);
      try {
        await context.read<AuthService>().logout();
      } catch (e) {
        if (mounted) {
          setState(() => _isLoggingOut = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Logout failed: $e')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().currentUser;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SingleChildScrollView(
        child: Column(
          children: [
            CustomerGradientHeader(
              title: 'My Profile',
              child: Row(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 1.5),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: AppNetworkImage(
                      url: user?.avatar,
                      fit: BoxFit.cover,
                      errorWidget: Container(
                        color: Colors.white.withValues(alpha: 0.22),
                        child: Center(
                          child: Text(
                            user?.name.isNotEmpty == true
                                ? user!.name[0].toUpperCase()
                                : 'U',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.name ?? 'Customer Name',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user?.email ?? 'customer@example.com',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.white.withValues(alpha: 0.85),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.22),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.35),
                              width: 1,
                            ),
                          ),
                          child: const Text(
                            'Customer Account',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
              child: Column(
                children: [

            // Profile Actions List
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.person_outline_rounded, color: AppTheme.primaryColor),
                    title: const Text('Edit Profile'),
                    subtitle: const Text('Name and contact phone number'),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                    onTap: () => context.push('/customer/edit-profile'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.account_balance_wallet_outlined, color: AppTheme.primaryColor),
                    title: const Text('JoyEvents Wallet'),
                    subtitle: Text('Balance: ₹${user?.walletBalance.toStringAsFixed(0) ?? "0"}'),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                    onTap: () => context.push('/customer/wallet'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.chat_bubble_outline_rounded, color: AppTheme.primaryColor),
                    title: const Text('My Messages'),
                    subtitle: const Text('Enquiries with event organisers'),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                    onTap: () => context.push('/customer/messages'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.favorite_outline_rounded, color: AppTheme.primaryColor),
                    title: const Text('Saved Favorites'),
                    subtitle: const Text('Events & services'),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                    onTap: () => context.push('/customer/favorites'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.notifications_none_rounded, color: AppTheme.primaryColor),
                    title: const Text('Notifications'),
                    subtitle: const Text('System & booking alerts'),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                    onTap: () => context.push('/customer/notifications'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.lock_outline_rounded, color: AppTheme.primaryColor),
                    title: const Text('Change Password'),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                    onTap: () => context.push('/customer/change-password'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Legal & Governance Section
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.gavel_rounded, color: AppTheme.primaryColor),
                    title: const Text('Terms & Conditions'),
                    subtitle: const Text('Platform governance & marketplace rules'),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                    onTap: () => context.push('/terms'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.shield_outlined, color: AppTheme.primaryColor),
                    title: const Text('Privacy Policy'),
                    subtitle: const Text('Data collection & protection guidelines'),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                    onTap: () => context.push('/privacy'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.delete_forever_rounded, color: AppTheme.errorColor),
                    title: const Text(
                      'Delete Account',
                      style: TextStyle(color: AppTheme.errorColor, fontWeight: FontWeight.w600),
                    ),
                    subtitle: const Text('Permanently purge account & data'),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: AppTheme.errorColor),
                    onTap: () => context.push('/account-deletion'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            Card(
              child: ListTile(
                leading: _isLoggingOut
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppTheme.errorColor,
                        ),
                      )
                    : const Icon(Icons.logout_rounded, color: AppTheme.errorColor),
                title: Text(
                  _isLoggingOut ? 'Logging out...' : 'Logout',
                  style: const TextStyle(
                    color: AppTheme.errorColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                enabled: !_isLoggingOut,
                onTap: _isLoggingOut ? null : _handleLogout,
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    ],
  ),
),
);
  }
}


