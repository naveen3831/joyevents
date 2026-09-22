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
  final ScrollController _scrollCtrl = ScrollController();

  MessageModel? _message;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    final data = widget.messageData ?? {};
    if (data['message'] is MessageModel) {
      _message = data['message'] as MessageModel;
    }
    _refreshThread();
  }

  @override
  void dispose() {
    _replyController.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _refreshThread() async {
    final msgId = _message?.id ?? widget.messageData?['messageId']?.toString();
    if (msgId == null || msgId.isEmpty) return;

    try {
      final updated = await _messageService.getMessageThread(msgId);
      if (mounted) {
        setState(() {
          _message = updated;
        });
        _scrollToBottom();
      }
    } catch (_) {}
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _handleSendReply() async {
    final text = _replyController.text.trim();
    if (text.isEmpty || _message == null) return;

    setState(() {
      _isSending = true;
    });

    try {
      final updated = await _messageService.sendCustomerReply(_message!.id, text);
      if (mounted) {
        _replyController.clear();
        setState(() {
          _message = updated;
          _isSending = false;
        });
        _scrollToBottom();
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
    final msg = _message;
    final itemTitle = msg?.itemTitle ?? 'Enquiry Details';
    final merchantName = msg?.merchantName ?? "Event Organiser";

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: CustomerAppBar(
        title: itemTitle,
        showBack: true,
      ),
      body: Column(
        children: [
          // Organiser details subheader
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Row(
              children: [
                const Icon(Icons.storefront_rounded, color: AppTheme.primaryColor),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Organiser: $merchantName',
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
          const Divider(height: 1, color: AppTheme.borderColor),

          // Message Thread List
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refreshThread,
              child: msg == null
                  ? const Center(child: CircularProgressIndicator())
                  : ListView(
                      controller: _scrollCtrl,
                      padding: const EdgeInsets.all(16),
                      children: [
                        // Original Enquiry message
                        if (msg.message.isNotEmpty)
                          Align(
                            alignment: Alignment.centerRight,
                            child: Container(
                              constraints: BoxConstraints(
                                maxWidth: MediaQuery.of(context).size.width * 0.75,
                              ),
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(14),
                              decoration: const BoxDecoration(
                                color: AppTheme.primaryColor,
                                borderRadius: BorderRadius.only(
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
                                    msg.message,
                                    style: const TextStyle(
                                        color: Colors.white, fontSize: 14, height: 1.4),
                                  ),
                                ],
                              ),
                            ),
                          ),

                        // Replies
                        ...msg.replies.map((reply) {
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
                                    ? Colors.white
                                    : AppTheme.primaryColor,
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(16),
                                  topRight: const Radius.circular(16),
                                  bottomLeft: Radius.circular(isFromMerchant ? 4 : 16),
                                  bottomRight: Radius.circular(isFromMerchant ? 16 : 4),
                                ),
                                border: isFromMerchant
                                    ? Border.all(color: AppTheme.borderColor)
                                    : null,
                                boxShadow: AppTheme.cardShadow,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    isFromMerchant
                                        ? merchantName
                                        : 'You',
                                    style: TextStyle(
                                      color: isFromMerchant
                                          ? AppTheme.primaryColor
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
                                      height: 1.4,
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
          ),

          // Persistent Message Composer
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
                      maxLines: 4,
                      minLines: 1,
                      style: const TextStyle(fontSize: 14, color: AppTheme.textColor),
                      decoration: InputDecoration(
                        hintText: 'Type your message...',
                        hintStyle: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 14,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 10),
                        filled: true,
                        fillColor: AppTheme.inputFillColor,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(color: AppTheme.borderColor),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(color: AppTheme.borderColor),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(20),
                          borderSide: const BorderSide(
                            color: AppTheme.primaryColor,
                            width: 1.5,
                          ),
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
          ),
        ],
      ),
    );
  }
}
