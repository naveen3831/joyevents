import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/app_theme.dart';
import '../../config/api_config.dart';
import '../../services/merchant_service.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/empty_state.dart';

class MerchantEventsScreen extends StatefulWidget {
  const MerchantEventsScreen({super.key});

  @override
  State<MerchantEventsScreen> createState() => _MerchantEventsScreenState();
}

class _MerchantEventsScreenState extends State<MerchantEventsScreen>
    with SingleTickerProviderStateMixin {
  final _merchantService = MerchantService();
  late final TabController _tabController;

  bool _loading = true;
  String? _error;
  List<dynamic> _events = [];

  final _tabs = ['All', 'Live', 'Upcoming', 'Draft'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _loadEvents();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadEvents() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final events = await _merchantService.getMyEvents();
      setState(() => _events = events);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  List<dynamic> _filtered(String tab) {
    if (tab == 'All') return _events;
    if (tab == 'Live') return _events.where((e) => e['live'] == true).toList();
    if (tab == 'Draft') return _events.where((e) => e['live'] == false).toList();
    if (tab == 'Upcoming') {
      final now = DateTime.now();
      return _events.where((e) {
        final dateStr = e['date']?.toString() ?? '';
        if (dateStr.isEmpty) return false;
        try {
          return DateTime.parse(dateStr).isAfter(now);
        } catch (_) {
          return false;
        }
      }).toList();
    }
    return _events;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('My Events'),
        backgroundColor: Colors.white,
        automaticallyImplyLeading: false,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryColor,
          unselectedLabelColor: AppTheme.subtitleColor,
          indicatorColor: AppTheme.primaryColor,
          indicatorWeight: 2.5,
          labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await context.push('/merchant/create-event');
          _loadEvents();
        },
        backgroundColor: AppTheme.primaryColor,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Create Event',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
      body: _loading
          ? const LoadingView()
          : _error != null
              ? _buildError()
              : TabBarView(
                  controller: _tabController,
                  children: _tabs.map((t) => _buildList(t)).toList(),
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
          ElevatedButton(onPressed: _loadEvents, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _buildList(String tab) {
    final list = _filtered(tab);
    if (list.isEmpty) {
      return EmptyState(
        icon: Icons.event_outlined,
        title: 'No ${tab == 'All' ? '' : '$tab '}Events',
        message: tab == 'All'
            ? 'Create your first event to get started.'
            : 'No events in this category.',
      );
    }
    return RefreshIndicator(
      onRefresh: _loadEvents,
      color: AppTheme.primaryColor,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: list.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) => _EventCard(
          event: list[i],
          onRefresh: _loadEvents,
        ),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final Map<String, dynamic> event;
  final VoidCallback onRefresh;

  const _EventCard({required this.event, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    final id = event['_id']?.toString() ?? '';
    final title = event['title']?.toString() ?? 'Event';
    final isLive = event['live'] == true;
    final imageUrl = ApiConfig.resolveImageUrl(event['image']?.toString());
    final date = event['date']?.toString() ?? '';
    final location = event['location']?.toString() ?? '';
    final price = (event['price'] as num?)?.toDouble() ?? 0.0;
    final attendees = (event['attendeesCount'] as num?)?.toInt() ?? 0;

    String formattedDate = date;
    if (date.isNotEmpty) {
      try {
        final d = DateTime.parse(date);
        formattedDate = '${d.day}/${d.month}/${d.year}';
      } catch (_) {}
    }

    return GestureDetector(
      onTap: () async {
        await context.push('/merchant/event-details/$id', extra: event);
        onRefresh();
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.borderColor),
          boxShadow: AppTheme.cardShadow,
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image + Status badge
            SizedBox(
              height: 150,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  imageUrl.isNotEmpty
                      ? Image.network(imageUrl, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppTheme.tintVioletBg,
                            child: const Icon(Icons.event, size: 40, color: AppTheme.tintVioletFg),
                          ))
                      : Container(
                          color: AppTheme.tintVioletBg,
                          child: const Icon(Icons.event, size: 40, color: AppTheme.tintVioletFg),
                        ),
                  Positioned(
                    top: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isLive ? AppTheme.successColor : AppTheme.warningColor,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        isLive ? '● LIVE' : 'Draft',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textColor)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _InfoChip(icon: Icons.calendar_today_outlined, text: formattedDate),
                      const SizedBox(width: 8),
                      if (location.isNotEmpty)
                        Expanded(
                          child: _InfoChip(
                              icon: Icons.location_on_outlined,
                              text: location,
                              maxLines: 1),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('₹${price.toStringAsFixed(0)}',
                          style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.primaryColor)),
                      Row(
                        children: [
                          const Icon(Icons.people_outline, size: 14, color: AppTheme.subtitleColor),
                          const SizedBox(width: 4),
                          Text('$attendees attendees',
                              style: const TextStyle(fontSize: 12, color: AppTheme.subtitleColor)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;
  final int? maxLines;

  const _InfoChip({required this.icon, required this.text, this.maxLines});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: AppTheme.subtitleColor),
        const SizedBox(width: 4),
        Text(
          text,
          maxLines: maxLines,
          overflow: maxLines != null ? TextOverflow.ellipsis : null,
          style: const TextStyle(fontSize: 12, color: AppTheme.subtitleColor),
        ),
      ],
    );
  }
}
