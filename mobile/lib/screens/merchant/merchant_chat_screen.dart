import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/merchant_service.dart';

class MerchantChatScreen extends StatefulWidget {
  final String messageId;
  final dynamic initialData;

  const MerchantChatScreen({
    super.key,
    required this.messageId,
    this.initialData,
  });

  @override
  State<MerchantChatScreen> createState() => _MerchantChatScreenState();
}

class _MerchantChatScreenState extends State<MerchantChatScreen> {
  final _merchantService = MerchantService();
  final _replyCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  Map<String, dynamic> _thread = {};
  bool _sending = false;
  String? _validationError;

  @override
  void initState() {
    super.initState();
    if (widget.initialData is Map<String, dynamic>) {
      _thread = widget.initialData as Map<String, dynamic>;
    }
    _refreshThread();
  }

  @override
  void dispose() {
    _replyCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _refreshThread() async {
    try {
      final data = await _merchantService.getMessageThread(widget.messageId);
      if (mounted) {
        setState(() {
          _thread = (data['message'] is Map<String, dynamic>)
              ? data['message'] as Map<String, dynamic>
              : data;
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

  Future<void> _sendReply() async {
    if (_sending) return;

    final text = _replyCtrl.text.trim();
    if (text.isEmpty) {
      setState(() {
        _validationError = 'Reply text required';
      });
      return;
    }

    setState(() {
      _sending = true;
      _validationError = null;
    });

    try {
      await _merchantService.replyToMessage(widget.messageId, text);
      // ONLY clear input after backend confirms successful send
      _replyCtrl.clear();
      await _refreshThread();
    } catch (e) {
      if (mounted) {
        // Preserve typed message in input field on failure
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _sending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final sender = _thread['sender'] as Map<String, dynamic>? ?? {};
    final senderName = _thread['senderName']?.toString() ??
        sender['name']?.toString() ??
        'Customer';
    final subject = _thread['itemTitle']?.toString() ??
        _thread['subject']?.toString() ??
        'Enquiry';
    final originalMessage = _thread['message']?.toString() ?? '';
    final replies = _thread['replies'] as List? ?? [];

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              senderName,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppTheme.textColor,
              ),
            ),
            if (subject.isNotEmpty)
              Text(
                subject,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.subtitleColor,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        backgroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Scrollable message thread history
          Expanded(
            child: ListView(
              controller: _scrollCtrl,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              children: [
                // Original customer enquiry
                if (originalMessage.isNotEmpty)
                  _ChatBubble(
                    senderName: senderName,
                    message: originalMessage,
                    isMe: false,
                    dateStr: _thread['createdAt']?.toString() ?? '',
                  ),
                const SizedBox(height: 12),
                // Thread replies
                ...replies.map((r) {
                  final from = r['from']?.toString() ?? '';
                  final isMerchantReply = from == 'merchant' ||
                      (r['senderRole']?.toString() ?? '') == 'merchant' ||
                      r['isReply'] == true;
                  final replySender = r['sender'] as Map<String, dynamic>? ?? {};
                  final replyName = replySender['name']?.toString() ??
                      (isMerchantReply ? 'You' : senderName);
                  final replyText = r['text']?.toString() ??
                      r['message']?.toString() ??
                      '';
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _ChatBubble(
                      senderName: isMerchantReply ? 'You' : replyName,
                      message: replyText,
                      isMe: isMerchantReply,
                      dateStr: r['createdAt']?.toString() ?? '',
                    ),
                  );
                }),
              ],
            ),
          ),
          // Validation error banner if send was tapped with empty input
          if (_validationError != null)
            Container(
              width: double.infinity,
              color: AppTheme.errorColor.withOpacity(0.1),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, size: 15, color: AppTheme.errorColor),
                  const SizedBox(width: 8),
                  Text(
                    _validationError!,
                    style: const TextStyle(
                      color: AppTheme.errorColor,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          // Persistent Bottom Message Composer
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
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _replyCtrl,
                      onChanged: (val) {
                        if (_validationError != null && val.trim().isNotEmpty) {
                          setState(() => _validationError = null);
                        }
                      },
                      maxLines: 4,
                      minLines: 1,
                      textInputAction: TextInputAction.newline,
                      style: const TextStyle(fontSize: 14, color: AppTheme.textColor),
                      decoration: InputDecoration(
                        hintText: 'Type a reply...',
                        hintStyle: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 14,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
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
                        filled: true,
                        fillColor: AppTheme.inputFillColor,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: _sending ? null : _sendReply,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: const BoxDecoration(
                        gradient: AppTheme.gradientPrimary,
                        shape: BoxShape.circle,
                      ),
                      child: _sending
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.send_rounded,
                              color: Colors.white, size: 19),
                    ),
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

class _ChatBubble extends StatelessWidget {
  final String senderName;
  final String message;
  final bool isMe;
  final String dateStr;

  const _ChatBubble({
    required this.senderName,
    required this.message,
    required this.isMe,
    required this.dateStr,
  });

  @override
  Widget build(BuildContext context) {
    String date = '';
    if (dateStr.isNotEmpty) {
      try {
        final d = DateTime.parse(dateStr);
        date =
            '${d.day}/${d.month} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
      } catch (_) {}
    }

    return Column(
      crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Text(
          senderName,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppTheme.subtitleColor,
          ),
        ),
        const SizedBox(height: 4),
        Container(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.72,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: isMe ? AppTheme.primaryColor : Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(isMe ? 16 : 4),
              bottomRight: Radius.circular(isMe ? 4 : 16),
            ),
            border: isMe ? null : Border.all(color: AppTheme.borderColor),
            boxShadow: AppTheme.cardShadow,
          ),
          child: Text(
            message,
            style: TextStyle(
              fontSize: 14,
              color: isMe ? Colors.white : AppTheme.textColor,
              height: 1.4,
            ),
          ),
        ),
        if (date.isNotEmpty) ...[
          const SizedBox(height: 2),
          Text(
            date,
            style: const TextStyle(
              fontSize: 10,
              color: AppTheme.subtitleColor,
            ),
          ),
        ],
      ],
    );
  }
}
