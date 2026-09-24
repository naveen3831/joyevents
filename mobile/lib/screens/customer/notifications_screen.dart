import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../config/app_theme.dart';
import '../../models/notification_model.dart';
import '../../services/auth_service.dart';
import '../../services/notification_service.dart';
import '../../widgets/customer_app_bar.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_view.dart';
import '../../widgets/loading_view.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final NotificationService _notificationService = NotificationService();

  List<NotificationModel> _notifications = [];
  int _unreadCount = 0;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _notificationService.getNotifications();
      if (mounted) {
        setState(() {
          _notifications = res['notifications'] as List<NotificationModel>;
          _unreadCount = res['unreadCount'] as int;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _markAllRead() async {
    try {
      await _notificationService.markAllAsRead();
      _fetchNotifications();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().currentUser;
    final isMerchant = user?.isMerchant == true;

    final PreferredSizeWidget appBar = isMerchant
        ? AppBar(
            backgroundColor: Colors.white,
            elevation: 0.5,
            centerTitle: false,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_rounded, color: AppTheme.textColor),
              onPressed: () {
                if (Navigator.of(context).canPop()) {
                  Navigator.of(context).pop();
                } else {
                  context.go('/merchant/dashboard');
                }
              },
            ),
            title: Text(
              'Notifications',
              style: GoogleFonts.poppins(
                color: AppTheme.textColor,
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
            ),
            actions: [
              if (_unreadCount > 0)
                TextButton(
                  onPressed: _markAllRead,
                  child: const Text('Mark all read'),
                ),
            ],
          )
        : CustomerAppBar(
            title: 'Notifications',
            showBack: true,
            actions: [
              if (_unreadCount > 0)
                TextButton(
                  onPressed: _markAllRead,
                  child: const Text('Mark all read'),
                ),
            ],
          );

    return Scaffold(
      appBar: appBar,
      body: RefreshIndicator(
        onRefresh: _fetchNotifications,
        child: _isLoading
            ? const LoadingView(message: 'Loading notifications...')
            : _errorMessage != null
                ? ErrorView(message: _errorMessage!, onRetry: _fetchNotifications)
                : _notifications.isEmpty
                    ? const EmptyState(
                        title: 'No Notifications',
                        message: 'You have no system or booking notifications.',
                        icon: Icons.notifications_off_outlined,
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _notifications.length,
                        itemBuilder: (context, index) {
                          final notif = _notifications[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            color: notif.isUnread
                                ? AppTheme.primaryColor.withOpacity(0.04)
                                : Colors.white,
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(14),
                              leading: CircleAvatar(
                                backgroundColor: notif.isUnread
                                    ? AppTheme.primaryColor.withOpacity(0.12)
                                    : const Color(0xFFF1F5F9),
                                child: Icon(
                                  Icons.notifications_rounded,
                                  color: notif.isUnread
                                      ? AppTheme.primaryColor
                                      : AppTheme.subtitleColor,
                                ),
                              ),
                              title: Text(
                                notif.title,
                                style: TextStyle(
                                  fontWeight: notif.isUnread
                                      ? FontWeight.bold
                                      : FontWeight.w600,
                                  fontSize: 15,
                                ),
                              ),
                              subtitle: Padding(
                                padding: const EdgeInsets.only(top: 4.0),
                                child: Text(
                                  notif.message,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppTheme.subtitleColor,
                                  ),
                                ),
                              ),
                              onTap: () async {
                                if (notif.isUnread) {
                                  await _notificationService.markAsRead(notif.id);
                                  _fetchNotifications();
                                }
                                if (!mounted) return;
                                if (notif.relatedId != null && notif.relatedId!.isNotEmpty) {
                                  if (isMerchant) {
                                    if (notif.type == 'booking') {
                                      context.push('/merchant/booking-details/${notif.relatedId}');
                                    }
                                  } else {
                                    if (notif.type == 'booking') {
                                      context.push('/customer/booking-details/${notif.relatedId}');
                                    }
                                  }
                                }
                              },
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
