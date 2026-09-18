import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/app_theme.dart';
import '../../services/merchant_service.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/empty_state.dart';

class MerchantMessagesScreen extends StatefulWidget {
  const MerchantMessagesScreen({super.key});

  @override
  State<MerchantMessagesScreen> createState() => _MerchantMessagesScreenState();
}

class _MerchantMessagesScreenState extends State<MerchantMessagesScreen> {
  final _merchantService = MerchantService();

  bool _loading = true;
  String? _error;
  List<dynamic> _messages = [];

  @override
  void initState() {
    super.initState();
    _loadInbox();
  }

  Future<void> _loadInbox() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final messages = await _merchantService.getInbox();
      setState(() => _messages = messages);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Messages'),
        backgroundColor: Colors.white,
      ),
      body: _loading
          ? const LoadingView()
          : _error != null
              ? _buildError()
              : _messages.isEmpty
                  ? EmptyState(
                      icon: Icons.message_outlined,
                      title: 'No Messages',
                      message: 'Customer inquiries will appear here.',
                    )
                  : RefreshIndicator(
                      onRefresh: _loadInbox,
                      color: AppTheme.primaryColor,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, i) =>
                            _InboxTile(message: _messages[i]),
                      ),
                    ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: AppTheme.errorColor),
          const SizedBox(height: 12),
          Text(_error ?? 'Error', style: const TextStyle(color: AppTheme.subtitleColor)),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _loadInbox, child: const Text('Retry')),
        ],
      ),
    );
  }
}

class _InboxTile extends StatelessWidget {
  final Map<String, dynamic> message;

  const _InboxTile({required this.message});

  @override
  Widget build(BuildContext context) {
    final id = message['_id']?.toString() ?? '';
    final sender = message['sender'] as Map<String, dynamic>? ?? {};
    final senderName = sender['name']?.toString() ?? 'Customer';
    final subject = message['subject']?.toString() ?? '';
    final content = message['message']?.toString() ?? '';
    final preview = subject.isNotEmpty ? subject : content;
    final isRead = message['read'] == true;
    final dateStr = message['createdAt']?.toString() ?? '';
    String date = '';
    if (dateStr.isNotEmpty) {
      try {
        final d = DateTime.parse(dateStr);
        date = '${d.day}/${d.month}/${d.year}';
      } catch (_) {}
    }
    final repliesCount = (message['replies'] as List?)?.length ?? 0;

    return GestureDetector(
      onTap: () => context.push('/merchant/chat-details/$id', extra: message),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isRead ? Colors.white : AppTheme.tintVioletBg.withOpacity(0.5),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isRead ? AppTheme.borderColor : AppTheme.tintVioletFg.withOpacity(0.3),
          ),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: AppTheme.tintVioletBg,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  senderName.isNotEmpty ? senderName[0].toUpperCase() : 'C',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.tintVioletFg,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        senderName,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: isRead ? FontWeight.w600 : FontWeight.w800,
                          color: AppTheme.textColor,
                        ),
                      ),
                      Text(date,
                          style: const TextStyle(
                              fontSize: 11, color: AppTheme.subtitleColor)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    preview,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      color:
                          isRead ? AppTheme.subtitleColor : AppTheme.textColor,
                      fontWeight: isRead ? FontWeight.w400 : FontWeight.w500,
                    ),
                  ),
                  if (repliesCount > 0) ...[
                    const SizedBox(height: 4),
                    Text('$repliesCount replies',
                        style: const TextStyle(
                            fontSize: 11,
                            color: AppTheme.tintVioletFg,
                            fontWeight: FontWeight.w600)),
                  ],
                ],
              ),
            ),
            if (!isRead) ...[
              const SizedBox(width: 8),
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
