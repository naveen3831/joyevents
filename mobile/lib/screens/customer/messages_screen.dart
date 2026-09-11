import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_theme.dart';
import '../../models/message_model.dart';
import '../../services/message_service.dart';
import '../../widgets/customer_app_bar.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_view.dart';
import '../../widgets/loading_view.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  final MessageService _messageService = MessageService();

  List<MessageModel> _messages = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchInbox();
  }

  Future<void> _fetchInbox() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await _messageService.getCustomerInbox();
      if (mounted) {
        setState(() {
          _messages = list;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomerAppBar(
        title: 'Messages & Enquiries',
        showBack: true,
      ),
      body: RefreshIndicator(
        onRefresh: _fetchInbox,
        child: _isLoading
            ? const LoadingView(message: 'Loading your messages...')
            : _errorMessage != null
                ? ErrorView(message: _errorMessage!, onRetry: _fetchInbox)
                : _messages.isEmpty
                    ? const EmptyState(
                        title: 'No Messages Yet',
                        message: 'Direct enquiries sent to event organisers will appear here.',
                        icon: Icons.chat_bubble_outline_rounded,
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final lastReply =
                              msg.replies.isNotEmpty ? msg.replies.last : null;

                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(16),
                              leading: CircleAvatar(
                                backgroundColor: AppTheme.primaryColor.withOpacity(0.12),
                                child: const Icon(
                                  Icons.storefront_rounded,
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                              title: Text(
                                msg.itemTitle,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text(
                                    'Organiser: ${msg.merchantName ?? "Event Organiser"}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AppTheme.subtitleColor,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    lastReply != null
                                        ? '${lastReply.isFromMerchant ? "Organiser" : "You"}: ${lastReply.text}'
                                        : 'Enquiry: ${msg.message}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey.shade700,
                                    ),
                                  ),
                                ],
                              ),
                              trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16),
                              onTap: () async {
                                await context.push(
                                  '/customer/chat-details',
                                  extra: {'message': msg},
                                );
                                _fetchInbox();
                              },
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
