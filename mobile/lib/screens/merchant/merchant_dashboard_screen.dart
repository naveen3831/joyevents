import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../config/api_config.dart';
import '../../services/auth_service.dart';
import '../../services/merchant_service.dart';
import '../../utils/currency_formatter.dart';
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
        _recentBookings = allBookings.take(3).toList();
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
        SliverToBoxAdapter(child: _buildHeader(name)),
        SliverToBoxAdapter(child: _buildRecentBookings()),
        SliverToBoxAdapter(child: _buildQuickActions()),
        SliverToBoxAdapter(child: _buildMetricCards()),
        if (_myEvents.isNotEmpty) SliverToBoxAdapter(child: _buildUpcomingEvents()),
        // Extra bottom padding so last item is not covered by bottom nav
        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. HEADER — compact, premium purple-to-pink gradient welcome banner
  // ──────────────────────────────────────────────────────────────────────────
  Widget _buildHeader(String name) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Container(
        decoration: BoxDecoration(
          gradient: AppTheme.gradientPrimaryDiagonal,
          borderRadius: const BorderRadius.vertical(bottom: Radius.circular(20)),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primaryColor.withValues(alpha: 0.20),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            // Subtle translucent background accent circles
            Positioned(
              right: -30,
              top: -30,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.08),
                ),
              ),
            ),
            Positioned(
              left: -20,
              bottom: -40,
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.05),
                ),
              ),
            ),
            // Header Content
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 16, 18),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome back,',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            height: 1.25,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Manage your events and bookings',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.90),
                            fontSize: 12.5,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _HeaderIconButton(
                        icon: Icons.message_outlined,
                        onTap: () => context.push('/merchant/messages'),
                      ),
                      const SizedBox(width: 8),
                      _HeaderIconButton(
                        icon: Icons.notifications_outlined,
                        onTap: () => context.push('/merchant/notifications'),
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

  // ──────────────────────────────────────────────────────────────────────────
  // 2. RECENT BOOKINGS — primary section, image-led horizontal cards
  // ──────────────────────────────────────────────────────────────────────────
  Widget _buildRecentBookings() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
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
              GestureDetector(
                onTap: () => context.go('/merchant/bookings'),
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                  child: Text(
                    'See all',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_recentBookings.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.tintVioletBg,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.receipt_long_outlined,
                      color: AppTheme.primaryColor,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'No recent bookings',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textColor,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'New customer bookings will appear here.',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.subtitleColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            )
          else
            ..._recentBookings.map((b) => _DashboardBookingTile(
                  booking: b,
                  onTap: () => context.push(
                    '/merchant/booking-details/${b['_id']}',
                    extra: b,
                  ),
                )),
        ],
      ),
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. QUICK ACTIONS — compact 2×2 grid
  // ──────────────────────────────────────────────────────────────────────────
  Widget _buildQuickActions() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
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
                child: _QuickActionTile(
                  icon: Icons.add_circle_outline_rounded,
                  label: 'Create Event',
                  color: AppTheme.primaryColor,
                  onTap: () => context.push('/merchant/create-event'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _QuickActionTile(
                  icon: Icons.add_business_rounded,
                  label: 'Add Service',
                  color: AppTheme.tintPinkFg,
                  onTap: () => context.push('/merchant/create-service'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _QuickActionTile(
                  icon: Icons.receipt_long_rounded,
                  label: 'Bookings',
                  color: AppTheme.tintOrangeFg,
                  onTap: () => context.go('/merchant/bookings'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _QuickActionTile(
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

  // ──────────────────────────────────────────────────────────────────────────
  // 4. BUSINESS OVERVIEW — compact 2×2 metric cards
  // ──────────────────────────────────────────────────────────────────────────
  Widget _buildMetricCards() {
    final grossRevenue = (_earnings['grossRevenue'] as num?)?.toDouble() ?? 0.0;
    final totalEarnings = (_earnings['totalEarnings'] as num?)?.toDouble() ?? 0.0;
    final availableBalance = (_earnings['availableBalance'] as num?)?.toDouble() ?? 0.0;
    final totalEvents = _myEvents.length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Business Overview',
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
                  value: formatINR(availableBalance),
                  icon: Icons.account_balance_wallet_rounded,
                  iconBg: AppTheme.tintVioletBg,
                  iconFg: AppTheme.tintVioletFg,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  label: 'Total Earnings',
                  value: formatINR(totalEarnings),
                  icon: Icons.trending_up_rounded,
                  iconBg: const Color(0xFFECFDF5),
                  iconFg: AppTheme.successColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  label: 'Gross Revenue',
                  value: formatINR(grossRevenue),
                  icon: Icons.payments_rounded,
                  iconBg: AppTheme.tintOrangeBg,
                  iconFg: AppTheme.tintOrangeFg,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  label: 'My Events',
                  value: '$totalEvents',
                  icon: Icons.event_rounded,
                  iconBg: AppTheme.tintBlueBg,
                  iconFg: AppTheme.tintBlueFg,
                  isCurrency: false,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. MY EVENTS — horizontal scroll cards
  // ──────────────────────────────────────────────────────────────────────────
  Widget _buildUpcomingEvents() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
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
              GestureDetector(
                onTap: () => context.go('/merchant/events'),
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                  child: Text(
                    'See all',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 155,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _myEvents.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, i) => _DashboardEventCard(event: _myEvents[i]),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-WIDGETS
// ─────────────────────────────────────────────────────────────────────────────

/// Translucent rounded icon button for header (Messages, Notifications)
class _HeaderIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _HeaderIconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.18),
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.25),
              width: 1,
            ),
          ),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
      ),
    );
  }
}

/// Compact metric card for the 2×2 overview grid
class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color iconBg;
  final Color iconFg;
  final bool isCurrency;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.iconBg,
    required this.iconFg,
    this.isCurrency = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF060B28).withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(7),
                ),
                child: Icon(icon, color: iconFg, size: 15),
              ),
              const Spacer(),
            ],
          ),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              maxLines: 1,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppTheme.textColor,
                height: 1.2,
              ),
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

/// Compact horizontal quick action tile for the 2×2 actions grid
class _QuickActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF060B28).withOpacity(0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 16),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textColor,
                    ),
                  ),
                ),
                Icon(
                  Icons.chevron_right_rounded,
                  color: AppTheme.subtitleColor.withOpacity(0.4),
                  size: 16,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Premium image-led booking tile showing image (~84x84), title, customer, date, amount, status
class _DashboardBookingTile extends StatelessWidget {
  final Map<String, dynamic> booking;
  final VoidCallback onTap;

  const _DashboardBookingTile({required this.booking, required this.onTap});

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'accepted':
        return AppTheme.successColor;
      case 'pending':
      case 'pending_approval':
        return AppTheme.warningColor;
      case 'cancelled':
        return AppTheme.errorColor;
      case 'completed':
        return AppTheme.tintBlueFg;
      case 'awaiting payment':
      case 'awaiting_payment':
        return const Color(0xFF8B5CF6);
      case 'refunded':
      case 'refund_pending':
        return AppTheme.tintPinkFg;
      case 'processing':
      case 'assigned':
        return AppTheme.tintOrangeFg;
      default:
        return AppTheme.subtitleColor;
    }
  }

  String _formatStatus(String status) {
    return status
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '')
        .join(' ');
  }

  @override
  Widget build(BuildContext context) {
    // Customer info
    final customer = booking['customer'] as Map<String, dynamic>? ?? {};
    final customerName = customer['name']?.toString() ?? 'Customer';

    // Event/Service info from populated refs
    final event = booking['event'] as Map<String, dynamic>?;
    final service = booking['service'] as Map<String, dynamic>?;

    // Title: prefer populated event/service name, fall back to denormalized fields
    final itemTitle = event?['title']?.toString() ??
        service?['name']?.toString() ??
        booking['eventName']?.toString() ??
        booking['serviceName']?.toString() ??
        booking['eventTitle']?.toString() ??
        booking['serviceTitle']?.toString() ??
        'Booking';

    // Image: from populated event/service
    final imageUrl = ApiConfig.resolveImageUrl(
      event?['image']?.toString() ?? service?['image']?.toString(),
    );

    final status = booking['status']?.toString() ?? 'pending';

    // FIX: read 'price' (actual schema field), not 'totalAmount'
    final total = (booking['price'] as num?)?.toDouble() ?? 0.0;

    // Date formatting: prefer datetime/eventDate, fallback to createdAt
    final dateStr = booking['datetime']?.toString() ??
        booking['eventDate']?.toString() ??
        booking['createdAt']?.toString() ??
        '';

    String formattedDate = '';
    if (dateStr.isNotEmpty) {
      try {
        final d = DateTime.parse(dateStr);
        formattedDate =
            '${d.day.toString().padLeft(2, '0')} ${_monthName(d.month)} ${d.year}';
      } catch (_) {}
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF060B28).withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Image ~84x84
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    width: 84,
                    height: 84,
                    child: imageUrl.isNotEmpty
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _imagePlaceholder(),
                          )
                        : _imagePlaceholder(),
                  ),
                ),
                const SizedBox(width: 12),
                // Details column
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        itemTitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textColor,
                          height: 1.25,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        customerName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppTheme.subtitleColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (formattedDate.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            Icon(
                              Icons.calendar_today_outlined,
                              size: 11,
                              color: AppTheme.subtitleColor.withOpacity(0.7),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              formattedDate,
                              style: TextStyle(
                                fontSize: 11,
                                color: AppTheme.subtitleColor.withOpacity(0.85),
                              ),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Text(
                            formatINR(total),
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.textColor,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
                            decoration: BoxDecoration(
                              color: _statusColor(status).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              _formatStatus(status),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: _statusColor(status),
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.chevron_right_rounded,
                            size: 18,
                            color: AppTheme.subtitleColor.withOpacity(0.6),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _imagePlaceholder() {
    return Container(
      color: AppTheme.tintVioletBg,
      child: const Center(
        child: Icon(
          Icons.event_note_rounded,
          color: AppTheme.tintVioletFg,
          size: 28,
        ),
      ),
    );
  }

  String _monthName(int month) {
    const months = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return months[month];
  }
}

/// Compact event card for the horizontal "My Events" scroll
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
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF060B28).withOpacity(0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
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
                      top: 6,
                      right: 6,
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
                            fontSize: 9,
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

