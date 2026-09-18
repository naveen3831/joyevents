import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../config/api_config.dart';
import '../../services/auth_service.dart';
import '../../services/merchant_service.dart';
import '../../widgets/loading_view.dart';

class MerchantDashboardScreen extends StatefulWidget {
  const MerchantDashboardScreen({super.key});

  @override
  State<MerchantDashboardScreen> createState() => _MerchantDashboardScreenState();
}

class _MerchantDashboardScreenState extends State<MerchantDashboardScreen> {
  final _merchantService = MerchantService();

  bool _loading = true;
  String? _error;

  // Dashboard data
  Map<String, dynamic> _earnings = {};
  List<dynamic> _recentBookings = [];
  List<dynamic> _myEvents = [];

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _merchantService.getEarningsDashboard(),
        _merchantService.getAssignedBookings(),
        _merchantService.getMyEvents(),
      ]);
      setState(() {
        _earnings = results[0] as Map<String, dynamic>;
        final allBookings = results[1] as List;
        _recentBookings = allBookings.take(5).toList();
        final allEvents = results[2] as List;
        _myEvents = allEvents.take(4).toList();
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().currentUser;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadDashboard,
          color: AppTheme.primaryColor,
          child: _loading
              ? const LoadingView()
              : _error != null
                  ? _buildError()
                  : _buildContent(user?.name ?? 'Merchant'),
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: AppTheme.errorColor),
            const SizedBox(height: 12),
            Text(_error ?? 'Something went wrong',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppTheme.subtitleColor)),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadDashboard,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent(String name) {
    return CustomScrollView(
      slivers: [
        _buildHeader(name),
        SliverToBoxAdapter(child: _buildMetricCards()),
        SliverToBoxAdapter(child: _buildQuickActions()),
        if (_recentBookings.isNotEmpty) SliverToBoxAdapter(child: _buildRecentBookings()),
        if (_myEvents.isNotEmpty) SliverToBoxAdapter(child: _buildUpcomingEvents()),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
      ],
    );
  }

  Widget _buildHeader(String name) {
    return SliverToBoxAdapter(
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
        decoration: const BoxDecoration(
          gradient: AppTheme.gradientPrimaryDiagonal,
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome back 👋',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.85),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Merchant Dashboard',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.75),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            Row(
              children: [
                _headerIconBtn(Icons.message_outlined, () => context.push('/merchant/messages')),
                const SizedBox(width: 8),
                _headerIconBtn(Icons.notifications_outlined, () => context.push('/merchant/notifications')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _headerIconBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }

  Widget _buildMetricCards() {
    final grossRevenue = (_earnings['grossRevenue'] as num?)?.toDouble() ?? 0.0;
    final totalEarnings = (_earnings['totalEarnings'] as num?)?.toDouble() ?? 0.0;
    final availableBalance = (_earnings['availableBalance'] as num?)?.toDouble() ?? 0.0;
    final totalEvents = _myEvents.length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Overview',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: AppTheme.textColor,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  label: 'Available Balance',
                  value: '₹${availableBalance.toStringAsFixed(0)}',
                  icon: Icons.account_balance_wallet_rounded,
                  iconBg: AppTheme.tintVioletBg,
                  iconFg: AppTheme.tintVioletFg,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MetricCard(
                  label: 'Total Earnings',
                  value: '₹${totalEarnings.toStringAsFixed(0)}',
                  icon: Icons.trending_up_rounded,
                  iconBg: const Color(0xFFECFDF5),
                  iconFg: AppTheme.successColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  label: 'Gross Revenue',
                  value: '₹${grossRevenue.toStringAsFixed(0)}',
                  icon: Icons.payments_rounded,
                  iconBg: AppTheme.tintOrangeBg,
                  iconFg: AppTheme.tintOrangeFg,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _MetricCard(
                  label: 'My Events',
                  value: '$totalEvents',
                  icon: Icons.event_rounded,
                  iconBg: AppTheme.tintBlueBg,
                  iconFg: AppTheme.tintBlueFg,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Quick Actions',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: AppTheme.textColor,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _QuickActionBtn(
                  icon: Icons.add_circle_outline_rounded,
                  label: 'Create Event',
                  color: AppTheme.primaryColor,
                  onTap: () => context.push('/merchant/create-event'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _QuickActionBtn(
                  icon: Icons.add_business_rounded,
                  label: 'Add Service',
                  color: AppTheme.tintPinkFg,
                  onTap: () => context.push('/merchant/create-service'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _QuickActionBtn(
                  icon: Icons.receipt_long_rounded,
                  label: 'Bookings',
                  color: AppTheme.tintOrangeFg,
                  onTap: () => context.go('/merchant/bookings'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _QuickActionBtn(
                  icon: Icons.account_balance_wallet_outlined,
                  label: 'Wallet',
                  color: AppTheme.successColor,
                  onTap: () => context.push('/merchant/wallet'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRecentBookings() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Recent Bookings',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textColor,
                ),
              ),
              TextButton(
                onPressed: () => context.go('/merchant/bookings'),
                child: const Text('See all'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ..._recentBookings.map((b) => _DashboardBookingTile(booking: b)),
        ],
      ),
    );
  }

  Widget _buildUpcomingEvents() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'My Events',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textColor,
                ),
              ),
              TextButton(
                onPressed: () => context.go('/merchant/events'),
                child: const Text('See all'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 160,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _myEvents.length,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, i) => _DashboardEventCard(event: _myEvents[i]),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Sub-widgets ─────────────────────────────────────────────────────────────

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color iconBg;
  final Color iconFg;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.iconBg,
    required this.iconFg,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconFg, size: 18),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppTheme.textColor,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: AppTheme.subtitleColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionBtn({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.borderColor),
          boxShadow: AppTheme.cardShadow,
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppTheme.textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DashboardBookingTile extends StatelessWidget {
  final Map<String, dynamic> booking;

  const _DashboardBookingTile({required this.booking});

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'accepted':
        return AppTheme.successColor;
      case 'pending':
        return AppTheme.warningColor;
      case 'cancelled':
        return AppTheme.errorColor;
      case 'completed':
        return AppTheme.tintBlueFg;
      default:
        return AppTheme.subtitleColor;
    }
  }

  @override
  Widget build(BuildContext context) {
    final customer = booking['customer'] as Map<String, dynamic>? ?? {};
    final customerName = customer['name']?.toString() ?? 'Customer';
    final itemTitle = booking['eventTitle']?.toString() ??
        booking['serviceTitle']?.toString() ??
        'Booking';
    final status = booking['status']?.toString() ?? 'pending';
    final total = (booking['totalAmount'] as num?)?.toDouble() ?? 0.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.tintVioletBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.person, color: AppTheme.tintVioletFg, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(customerName,
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textColor)),
                Text(itemTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: AppTheme.subtitleColor)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('₹${total.toStringAsFixed(0)}',
                  style: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textColor)),
              const SizedBox(height: 2),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: _statusColor(status).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  status[0].toUpperCase() + status.substring(1),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: _statusColor(status),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DashboardEventCard extends StatelessWidget {
  final Map<String, dynamic> event;

  const _DashboardEventCard({required this.event});

  @override
  Widget build(BuildContext context) {
    final title = event['title']?.toString() ?? 'Event';
    final isLive = event['live'] == true;
    final imageUrl = ApiConfig.resolveImageUrl(event['image']?.toString());

    return GestureDetector(
      onTap: () => context.push('/merchant/event-details/${event['_id']}', extra: event),
      child: Container(
        width: 140,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: Colors.white,
          border: Border.all(color: AppTheme.borderColor),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  imageUrl.isNotEmpty
                      ? Image.network(imageUrl, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppTheme.tintVioletBg,
                            child: const Icon(Icons.event, color: AppTheme.tintVioletFg),
                          ))
                      : Container(
                          color: AppTheme.tintVioletBg,
                          child: const Icon(Icons.event, color: AppTheme.tintVioletFg),
                        ),
                  if (isLive)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.successColor,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'LIVE',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Text(
                title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
