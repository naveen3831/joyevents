import 'package:flutter/material.dart';

import '../../config/app_theme.dart';
import '../../models/message_model.dart';
import '../../services/message_service.dart';
import '../../widgets/customer_app_bar.dart';

class ChatDetailsScreen extends StatefulWidget {
  final Map<String, dynamic>? messageData;

  const ChatDetailsScreen({
    super.key,
    this.messageData,
  });

  @override
  State<ChatDetailsScreen> createState() => _ChatDetailsScreenState();
}

class _ChatDetailsScreenState extends State<ChatDetailsScreen> {
  final MessageService _messageService = MessageService();
  final _replyController = TextEditingController();

  late MessageModel _message;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    final data = widget.messageData ?? {};
    if (data['message'] is MessageModel) {
      _message = data['message'] as MessageModel;
    }
  }

  @override
  void dispose() {
    _replyController.dispose();
    super.dispose();
  }

  Future<void> _handleSendReply() async {
    final text = _replyController.text.trim();
    if (text.isEmpty) return;

    _replyController.clear();
    setState(() {
      _isSending = true;
    });

    try {
      final updated = await _messageService.sendCustomerReply(_message.id, text);
      if (mounted) {
        setState(() {
          _message = updated;
          _isSending = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send reply: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomerAppBar(
        title: _message.itemTitle,
        showBack: true,
      ),
      body: Column(
        children: [
          // Organiser details subheader
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: AppTheme.backgroundColor,
            child: Row(
              children: [
                const Icon(Icons.storefront_rounded, color: AppTheme.primaryColor),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Organiser: ${_message.merchantName ?? "Event Organiser"}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: AppTheme.textColor,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Message Thread List
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Original Enquiry message
                Align(
                  alignment: Alignment.centerRight,
                  child: Container(
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.75,
                    ),
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(16),
                        topRight: Radius.circular(16),
                        bottomLeft: Radius.circular(16),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'You (Initial Enquiry)',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _message.message,
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),

                // Replies
                ..._message.replies.map((reply) {
                  final isFromMerchant = reply.isFromMerchant;
                  return Align(
                    alignment: isFromMerchant
                        ? Alignment.centerLeft
                        : Alignment.centerRight,
                    child: Container(
                      constraints: BoxConstraints(
                        maxWidth: MediaQuery.of(context).size.width * 0.75,
                      ),
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isFromMerchant
                            ? const Color(0xFFF1F5F9)
                            : AppTheme.primaryColor,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(16),
                          topRight: const Radius.circular(16),
                          bottomLeft: Radius.circular(isFromMerchant ? 0 : 16),
                          bottomRight: Radius.circular(isFromMerchant ? 16 : 0),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isFromMerchant
                                ? (_message.merchantName ?? 'Organiser')
                                : 'You',
                            style: TextStyle(
                              color: isFromMerchant
                                  ? AppTheme.accentColor
                                  : Colors.white70,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            reply.text,
                            style: TextStyle(
                              color: isFromMerchant
                                  ? AppTheme.textColor
                                  : Colors.white,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),

          // Message Composer Input
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 8,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _replyController,
                    decoration: InputDecoration(
                      hintText: 'Type your message...',
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: _isSending
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.send_rounded, color: AppTheme.primaryColor),
                  onPressed: _isSending ? null : _handleSendReply,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
