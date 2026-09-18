import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/app_theme.dart';
import '../../config/api_config.dart';
import '../../services/merchant_service.dart';
import '../../widgets/loading_view.dart';

class MerchantEventDetailsScreen extends StatefulWidget {
  final String eventId;
  final dynamic initialData;

  const MerchantEventDetailsScreen({
    super.key,
    required this.eventId,
    this.initialData,
  });

  @override
  State<MerchantEventDetailsScreen> createState() => _MerchantEventDetailsScreenState();
}

class _MerchantEventDetailsScreenState extends State<MerchantEventDetailsScreen> {
  final _merchantService = MerchantService();
  late Map<String, dynamic> _event;
  bool _liveLoading = false;
  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    _event = (widget.initialData is Map<String, dynamic>)
        ? widget.initialData as Map<String, dynamic>
        : {};
  }

  Future<void> _toggleLive() async {
    final currentLive = _event['live'] == true;
    setState(() {
      _liveLoading = true;
      _event = {..._event, 'live': !currentLive};
    });
    try {
      await _merchantService.toggleEventLive(widget.eventId, !currentLive);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(!currentLive ? 'Event is now LIVE' : 'Event set to Draft'),
            backgroundColor: !currentLive ? AppTheme.successColor : AppTheme.warningColor,
          ),
        );
      }
    } catch (e) {
      // Revert on error
      setState(() => _event = {..._event, 'live': currentLive});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.errorColor),
        );
      }
    } finally {
      setState(() => _liveLoading = false);
    }
  }

  Future<void> _deleteEvent() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete Event'),
        content: const Text('Are you sure you want to delete this event? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    setState(() => _deleting = true);
    try {
      await _merchantService.deleteEvent(widget.eventId);
      if (mounted) {
        context.pop(true); // signal refresh
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.errorColor),
        );
      }
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _event['title']?.toString() ?? 'Event';
    final isLive = _event['live'] == true;
    final imageUrl = ApiConfig.resolveImageUrl(_event['image']?.toString());
    final date = _event['date']?.toString() ?? '';
    final location = _event['location']?.toString() ?? '';
    final price = (_event['price'] as num?)?.toDouble() ?? 0.0;
    final description = _event['description']?.toString() ?? '';
    final maxAttendees = (_event['maxAttendees'] as num?)?.toInt() ?? 0;
    final attendeesCount = (_event['attendeesCount'] as num?)?.toInt() ?? 0;
    final category = _event['category']?.toString() ?? '';
    final eventType = _event['eventType']?.toString() ?? '';

    String formattedDate = date;
    if (date.isNotEmpty) {
      try {
        final d = DateTime.parse(date);
        formattedDate =
            '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
      } catch (_) {}
    }

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: _deleting
          ? const LoadingView()
          : CustomScrollView(
              slivers: [
                SliverAppBar(
                  expandedHeight: 260,
                  pinned: true,
                  backgroundColor: AppTheme.primaryColor,
                  iconTheme: const IconThemeData(color: Colors.white),
                  flexibleSpace: FlexibleSpaceBar(
                    background: imageUrl.isNotEmpty
                        ? Image.network(imageUrl, fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              color: AppTheme.tintVioletBg,
                              child: const Icon(Icons.event, size: 60, color: AppTheme.tintVioletFg),
                            ))
                        : Container(
                            color: AppTheme.tintVioletBg,
                            child:
                                const Icon(Icons.event, size: 60, color: AppTheme.tintVioletFg),
                          ),
                  ),
                  actions: [
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, color: Colors.white),
                      onPressed: () async {
                        await context.push(
                            '/merchant/edit-event/${widget.eventId}',
                            extra: _event);
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.white),
                      onPressed: _deleteEvent,
                    ),
                  ],
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Live toggle
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppTheme.borderColor),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: isLive
                                      ? AppTheme.successColor.withOpacity(0.1)
                                      : AppTheme.warningColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  isLive ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                                  color: isLive ? AppTheme.successColor : AppTheme.warningColor,
                                  size: 18,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      isLive ? 'Event is LIVE' : 'Event is Draft',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: isLive ? AppTheme.successColor : AppTheme.warningColor,
                                      ),
                                    ),
                                    Text(
                                      isLive
                                          ? 'Visible to customers'
                                          : 'Not visible to customers',
                                      style: const TextStyle(
                                          fontSize: 12, color: AppTheme.subtitleColor),
                                    ),
                                  ],
                                ),
                              ),
                              _liveLoading
                                  ? const SizedBox(
                                      width: 24,
                                      height: 24,
                                      child: CircularProgressIndicator(strokeWidth: 2))
                                  : Switch.adaptive(
                                      value: isLive,
                                      onChanged: (_) => _toggleLive(),
                                      activeColor: AppTheme.successColor,
                                    ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        // Title + badges
                        Row(
                          children: [
                            Expanded(
                              child: Text(title,
                                  style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w800,
                                      color: AppTheme.textColor)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          children: [
                            if (category.isNotEmpty) _badge(category, AppTheme.tintBlueBg, AppTheme.tintBlueFg),
                            if (eventType.isNotEmpty) _badge(eventType, AppTheme.tintOrangeBg, AppTheme.tintOrangeFg),
                          ],
                        ),
                        const SizedBox(height: 20),
                        // Details
                        _DetailRow(Icons.calendar_today_outlined, 'Date', formattedDate),
                        _DetailRow(Icons.location_on_outlined, 'Location', location),
                        _DetailRow(Icons.currency_rupee_rounded, 'Base Price', '₹${price.toStringAsFixed(0)}'),
                        _DetailRow(Icons.people_outline, 'Attendees', '$attendeesCount / $maxAttendees'),
                        if (description.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          const Text('Description',
                              style: TextStyle(
                                  fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textColor)),
                          const SizedBox(height: 8),
                          Text(description,
                              style: const TextStyle(
                                  fontSize: 14,
                                  color: AppTheme.subtitleColor,
                                  height: 1.6)),
                        ],
                        const SizedBox(height: 32),
                        // Action buttons
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () async {
                                  await context.push(
                                      '/merchant/edit-event/${widget.eventId}',
                                      extra: _event);
                                },
                                icon: const Icon(Icons.edit_outlined),
                                label: const Text('Edit Event'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.errorColor),
                                onPressed: _deleteEvent,
                                icon: const Icon(Icons.delete_outline, color: Colors.white),
                                label: const Text('Delete', style: TextStyle(color: Colors.white)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _badge(String text, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppTheme.primaryColor),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.subtitleColor,
                        letterSpacing: 0.5)),
                const SizedBox(height: 2),
                Text(value,
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textColor)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
