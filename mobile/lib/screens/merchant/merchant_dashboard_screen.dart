import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../config/api_config.dart';
import '../../services/app_lifecycle_service.dart';
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
  List<dynamic> _myEvents = [];     // truncated to 4 for the horizontal scroll
  int _totalEventsCount = 0;         // full count for slot usage display
  List<dynamic> _myServices = [];
  List<dynamic> _tickets = [];

  @override
  void initState() {
    super.initState();
    _loadDashboard();
    AppLifecycleService().addResumeCallback(_onAppResumed);
  }

  void _onAppResumed() {
    if (mounted) {
      _loadDashboard();
    }
  }

  @override
  void dispose() {
    AppLifecycleService().removeResumeCallback(_onAppResumed);
    super.dispose();
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
        _merchantService.getMyServices(),
        _merchantService.getTickets(),
        AuthService().getMe(), // Refresh latest user profile & slot limits automatically
      ]);
      setState(() {
        _earnings = results[0] as Map<String, dynamic>;
        final allBookings = results[1] as List;
        _recentBookings = allBookings.take(3).toList();
        final allEvents = results[2] as List;
        _totalEventsCount = allEvents.length;   // store full count for slot display
        _myEvents = allEvents.take(4).toList(); // truncated for horizontal scroll
        _myServices = results[3] as List;
        _tickets = List<dynamic>.from(results[4] as List);
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
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
    final pendingQuotationTickets = _tickets
        .where((t) => (t as Map<String, dynamic>)['status'] == 'quotation_sent')
        .toList();

    return CustomScrollView(
      slivers: [
        // 1. Welcome header
        SliverToBoxAdapter(child: _buildHeader(name)),

        // Quotation-pending alert banners (action-required — kept near top)
        if (pendingQuotationTickets.isNotEmpty)
          SliverToBoxAdapter(
            child: Column(
              children: pendingQuotationTickets
                  .map((t) => _buildQuotationAlertBanner(t as Map<String, dynamic>))
                  .toList(),
            ),
          ),

        // 2. Recent Bookings — primary daily-activity section
        SliverToBoxAdapter(child: _buildRecentBookings()),

        // 3. Quick Actions
        SliverToBoxAdapter(child: _buildQuickActions()),

        // 4. Business Overview
        SliverToBoxAdapter(child: _buildMetricCards()),

        // 5. Slots & Limits — compact secondary section
        SliverToBoxAdapter(child: _buildSlotsAndLimitsSection()),

        // 6. My Events (optional, only shown when events exist)
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

  // ─────────────────────────────────────────────────────────────────────────
  // SHARED LAYOUT CONSTANTS — single source of truth for all sections
  // ─────────────────────────────────────────────────────────────────────────
  static const double _kH = 20;       // horizontal page padding
  static const double _kSec = 24;     // vertical gap between major sections
  static const double _kCardGap = 12; // vertical gap between cards in a group
  static const double _kCardPad = 16; // internal card padding
  static const double _kRadius = 12;  // card corner radius

  // Shared card decoration (white bg, standard border, no shadow)
  static BoxDecoration _cardDecoration() => BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(_kRadius),
        border: Border.all(color: AppTheme.borderColor),
      );

  // Shared section heading style
  static const TextStyle _sectionHeadingStyle = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w700,
    color: AppTheme.textColor,
    letterSpacing: 0.1,
  );

  // "See all" / action link style
  static const TextStyle _linkStyle = TextStyle(
    fontSize: 12.5,
    fontWeight: FontWeight.w600,
    color: AppTheme.primaryColor,
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 5. SLOTS & LIMITS — single compact horizontal card
  // Left: title + inline usage  |  Right: action button + chevron
  // ──────────────────────────────────────────────────────────────────────────
  Widget _buildSlotsAndLimitsSection() {
    final user = context.watch<AuthService>().currentUser;
    final maxEv = user?.maxEvents ?? 5;
    final maxSe = user?.maxServices ?? 5;
    final evCount = _totalEventsCount;
    final seCount = _myServices.length;
    final evFull = evCount >= maxEv;
    final seFull = seCount >= maxSe;
    final anyFull = evFull || seFull;

    const activeStatuses = ['pending', 'quotation_sent', 'paid'];
    final hasActiveRequest = _tickets.any(
      (t) => activeStatuses.contains((t as Map<String, dynamic>)['status']?.toString()),
    );

    // Inline usage text with optional red colour when a slot is full
    final usageColor = anyFull ? AppTheme.errorColor : AppTheme.subtitleColor;
    final usageText = 'Events $evCount/$maxEv  ·  Services $seCount/$maxSe';

    return Padding(
      padding: const EdgeInsets.fromLTRB(_kH, _kSec, _kH, 0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: _kCardPad, vertical: 14),
        decoration: _cardDecoration(),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // LEFT: title + usage line
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Slots & Limits', style: _sectionHeadingStyle),
                  const SizedBox(height: 3),
                  Text(
                    usageText,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: usageColor,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            // RIGHT: compact action button
            GestureDetector(
              onTap: () => context.push('/merchant/upgrade-slots'),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                  color: AppTheme.tintVioletBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: AppTheme.primaryColor.withValues(alpha: 0.2),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      hasActiveRequest ? 'View request' : 'Manage',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    const SizedBox(width: 3),
                    const Icon(
                      Icons.chevron_right_rounded,
                      size: 15,
                      color: AppTheme.primaryColor,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. RECENT BOOKINGS
  // ──────────────────────────────────────────────────────────────────────────
  Widget _buildRecentBookings() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(_kH, _kSec, _kH, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Recent Bookings', style: _sectionHeadingStyle),
              GestureDetector(
                onTap: () => context.go('/merchant/bookings'),
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                  child: Text('See all', style: _linkStyle),
                ),
              ),
            ],
          ),
          const SizedBox(height: _kCardGap),
          // Compact horizontal empty state (~88–96px tall)
          if (_recentBookings.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: _kCardPad,
                vertical: 22,
              ),
              decoration: _cardDecoration(),
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
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'No bookings yet',
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textColor,
                          ),
                        ),
                        SizedBox(height: 3),
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
  // 3. QUICK ACTIONS — 2×2 grid of icon-left tiles
  // ──────────────────────────────────────────────────────────────────────────
  Widget _buildQuickActions() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(_kH, _kSec, _kH, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Quick Actions', style: _sectionHeadingStyle),
          const SizedBox(height: _kCardGap),
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
              const SizedBox(width: _kCardGap),
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
          const SizedBox(height: _kCardGap),
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
              const SizedBox(width: _kCardGap),
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
  // 4. BUSINESS OVERVIEW — 2×2 uniform-height metric tiles
  // ──────────────────────────────────────────────────────────────────────────
  Widget _buildMetricCards() {
    final grossRevenue = (_earnings['grossRevenue'] as num?)?.toDouble() ?? 0.0;
    final totalEarnings = (_earnings['totalEarnings'] as num?)?.toDouble() ?? 0.0;
    final availableBalance = (_earnings['availableBalance'] as num?)?.toDouble() ?? 0.0;
    final totalEvents = _totalEventsCount;

    // IntrinsicHeight makes both tiles in each row the same height even if
    // one currency string is longer than the other.
    Widget row(Widget a, Widget b) => IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(child: a),
              const SizedBox(width: _kCardGap),
              Expanded(child: b),
            ],
          ),
        );

    return Padding(
      padding: const EdgeInsets.fromLTRB(_kH, _kSec, _kH, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Business Overview', style: _sectionHeadingStyle),
          const SizedBox(height: _kCardGap),
          row(
            _MetricCard(
              label: 'Available Balance',
              value: formatINR(availableBalance),
              icon: Icons.account_balance_wallet_rounded,
              iconBg: AppTheme.tintVioletBg,
              iconFg: AppTheme.primaryColor,
            ),
            _MetricCard(
              label: 'Total Earnings',
              value: formatINR(totalEarnings),
              icon: Icons.trending_up_rounded,
              iconBg: const Color(0xFFECFDF5),
              iconFg: AppTheme.successColor,
            ),
          ),
          const SizedBox(height: _kCardGap),
          row(
            _MetricCard(
              label: 'Gross Revenue',
              value: formatINR(grossRevenue),
              icon: Icons.payments_rounded,
              iconBg: AppTheme.tintOrangeBg,
              iconFg: AppTheme.tintOrangeFg,
            ),
            _MetricCard(
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
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. MY EVENTS — horizontal scroll cards
  // ──────────────────────────────────────────────────────────────────────────
  Widget _buildUpcomingEvents() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(_kH, _kSec, _kH, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('My Events', style: _sectionHeadingStyle),
              GestureDetector(
                onTap: () => context.go('/merchant/events'),
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                  child: Text('See all', style: _linkStyle),
                ),
              ),
            ],
          ),
          const SizedBox(height: _kCardGap),
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

  // ──────────────────────────────────────────────────────────────────────────
  // PENDING QUOTATION ALERT BANNER & TICKETS LIST
  // ──────────────────────────────────────────────────────────────────────────
  Widget _buildQuotationAlertBanner(Map<String, dynamic> ticket) {
    final reqEv = ticket['requestedEvents'] ?? 0;
    final reqSe = ticket['requestedServices'] ?? 0;
    final quoteAmt = (ticket['quotationAmount'] as num?)?.toDouble() ?? 0.0;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF3C7),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706), size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Action Required: Slot Upgrade Quotation Received',
                    style: GoogleFonts.poppins(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF92400E),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Admin quoted ${formatINR(quoteAmt)} to add +$reqEv Events and +$reqSe Services.',
              style: GoogleFonts.poppins(
                fontSize: 12,
                color: const Color(0xFF78350F),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () => _openPaymentModal(ticket),
                icon: const Icon(Icons.payment_rounded, size: 18),
                label: Text(
                  'Pay ${formatINR(quoteAmt)} Now',
                  style: GoogleFonts.poppins(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                  minimumSize: const Size(0, 48),
                  alignment: Alignment.center,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTicketsListSection() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Slots Upgrade Request Tickets',
                style: GoogleFonts.poppins(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textColor,
                ),
              ),
              GestureDetector(
                onTap: () => context.push('/merchant/upgrade-slots'),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
                  child: Text(
                    'View All',
                    style: GoogleFonts.poppins(
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
          if (_tickets.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: Center(
                child: Text(
                  'No upgrade request tickets raised yet.',
                  style: GoogleFonts.poppins(fontSize: 12.5, color: AppTheme.subtitleColor),
                ),
              ),
            )
          else
            Column(
              children: _tickets.take(3).map((t) {
                final ticket = t as Map<String, dynamic>;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _buildDashboardTicketCard(ticket),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildDashboardTicketCard(Map<String, dynamic> ticket) {
    final status = ticket['status']?.toString() ?? 'pending';
    final reqEv = ticket['requestedEvents'] ?? 0;
    final reqSe = ticket['requestedServices'] ?? 0;
    final quoteAmt = (ticket['quotationAmount'] as num?)?.toDouble() ?? 0.0;
    final msg = ticket['message']?.toString() ?? '';

    Color badgeBg;
    Color badgeFg;
    String statusLabel;

    switch (status) {
      case 'quotation_sent':
        badgeBg = AppTheme.tintVioletBg;
        badgeFg = AppTheme.primaryColor;
        statusLabel = 'Quotation Sent';
        break;
      case 'paid':
        badgeBg = const Color(0xFFDBEAFE);
        badgeFg = const Color(0xFF1D4ED8);
        statusLabel = 'Paid - Awaiting Approval';
        break;
      case 'approved':
        badgeBg = const Color(0xFFDCFCE7);
        badgeFg = const Color(0xFF15803D);
        statusLabel = 'Approved & Upgraded';
        break;
      default:
        badgeBg = const Color(0xFFFEF3C7);
        badgeFg = const Color(0xFFB45309);
        statusLabel = 'Pending Review';
        break;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: status == 'quotation_sent' ? AppTheme.primaryColor.withValues(alpha: 0.4) : AppTheme.borderColor,
        ),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Request: +$reqEv Events, +$reqSe Services',
                  style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textColor),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(6)),
                child: Text(
                  statusLabel,
                  style: GoogleFonts.poppins(fontSize: 10.5, fontWeight: FontWeight.w700, color: badgeFg),
                ),
              ),
            ],
          ),
          if (msg.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Message: "$msg"',
              style: GoogleFonts.poppins(fontSize: 11.5, color: AppTheme.subtitleColor),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (quoteAmt > 0)
                Text(
                  'Quote: ${formatINR(quoteAmt)}',
                  style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w800, color: AppTheme.primaryColor),
                )
              else
                const SizedBox(),
              if (status == 'quotation_sent')
                ElevatedButton(
                  onPressed: () => _openPaymentModal(ticket),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text('Pay Now', style: GoogleFonts.poppins(fontSize: 11.5, fontWeight: FontWeight.w700)),
                ),
            ],
          ),
        ],
      ),
    );
  }

  void _openPaymentModal(Map<String, dynamic> ticket) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _DashboardPayTicketModal(
        ticket: ticket,
        onSuccess: () {
          Navigator.of(ctx).pop();
          _loadDashboard();
          context.read<AuthService>().getMe();
        },
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

/// Compact slot usage chip: "Events 2/10" — goes red when full
class _SlotChip extends StatelessWidget {
  final String label;
  final int used;
  final int max;
  final bool isFull;

  const _SlotChip({
    required this.label,
    required this.used,
    required this.max,
    required this.isFull,
  });

  @override
  Widget build(BuildContext context) {
    final bg = isFull
        ? AppTheme.errorColor.withValues(alpha: 0.10)
        : AppTheme.inputFillColor;
    final fg = isFull ? AppTheme.errorColor : AppTheme.subtitleColor;
    final valueFg = isFull ? AppTheme.errorColor : AppTheme.textColor;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: isFull
              ? AppTheme.errorColor.withValues(alpha: 0.25)
              : AppTheme.borderColor,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$label ',
            style: GoogleFonts.poppins(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: fg,
            ),
          ),
          Text(
            '$used/$max',
            style: GoogleFonts.poppins(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: valueFg,
            ),
          ),
        ],
      ),
    );
  }
}

/// Metric tile — uniform internal padding; value-first hierarchy.
/// IntrinsicHeight is applied by the caller so both tiles in a row are equal.
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
      padding: const EdgeInsets.all(
          _MerchantDashboardScreenState._kCardPad),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(
            _MerchantDashboardScreenState._kRadius),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconFg, size: 15),
          ),
          const SizedBox(height: 10),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              maxLines: 1,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: AppTheme.textColor,
                height: 1.15,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              color: AppTheme.subtitleColor,
              fontWeight: FontWeight.w500,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}

/// Quick action tile — icon on left, label on right.
/// Consistent height ensured by identical internal padding across all four tiles.
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
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(
          _MerchantDashboardScreenState._kRadius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(
            _MerchantDashboardScreenState._kRadius),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: _MerchantDashboardScreenState._kCardPad,
            vertical: 14,
          ),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(
                _MerchantDashboardScreenState._kRadius),
            border: Border.all(color: AppTheme.borderColor),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 16),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textColor,
                    height: 1.3,
                  ),
                ),
              ),
            ],
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
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Image — 64×64
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: SizedBox(
                    width: 64,
                    height: 64,
                    child: imageUrl.isNotEmpty
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _imagePlaceholder(),
                          )
                        : _imagePlaceholder(),
                  ),
                ),
                const SizedBox(width: 10),
                // Details column
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        itemTitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textColor,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        customerName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11.5,
                          color: AppTheme.subtitleColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (formattedDate.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Icon(
                              Icons.calendar_today_outlined,
                              size: 10,
                              color: AppTheme.subtitleColor.withValues(alpha: 0.7),
                            ),
                            const SizedBox(width: 3),
                            Text(
                              formattedDate,
                              style: TextStyle(
                                fontSize: 10.5,
                                color: AppTheme.subtitleColor.withValues(alpha: 0.85),
                              ),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Text(
                            formatINR(total),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.textColor,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: _statusColor(status).withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              _formatStatus(status),
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w700,
                                color: _statusColor(status),
                              ),
                            ),
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
              color: const Color(0xFF060B28).withValues(alpha: 0.03),
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

// ─── Modal Sheet for Paying Ticket Quotation ─────────────────────────────────
class _DashboardPayTicketModal extends StatefulWidget {
  final Map<String, dynamic> ticket;
  final VoidCallback onSuccess;

  const _DashboardPayTicketModal({required this.ticket, required this.onSuccess});

  @override
  State<_DashboardPayTicketModal> createState() => _DashboardPayTicketModalState();
}

class _DashboardPayTicketModalState extends State<_DashboardPayTicketModal> {
  final _merchantService = MerchantService();
  final _formKey = GlobalKey<FormState>();

  final _cardNumCtrl = TextEditingController();
  final _expiryCtrl = TextEditingController();
  final _cvvCtrl = TextEditingController();
  final _cardholderCtrl = TextEditingController();

  bool _submitting = false;

  @override
  void dispose() {
    _cardNumCtrl.dispose();
    _expiryCtrl.dispose();
    _cvvCtrl.dispose();
    _cardholderCtrl.dispose();
    super.dispose();
  }

  Future<void> _payQuotation() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);

    try {
      final ticketId = widget.ticket['_id']?.toString() ?? '';
      await _merchantService.payTicket(ticketId, {
        'cardNumber': _cardNumCtrl.text.trim(),
        'cardholderName': _cardholderCtrl.text.trim(),
        'expiryDate': _expiryCtrl.text.trim(),
        'cvv': _cvvCtrl.text.trim(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Payment processed successfully! Awaiting admin approval.'),
          backgroundColor: AppTheme.successColor,
        ));
        widget.onSuccess();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString()),
          backgroundColor: AppTheme.errorColor,
        ));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final quoteAmt = (widget.ticket['quotationAmount'] as num?)?.toDouble() ?? 0.0;
    final reqEv = widget.ticket['requestedEvents'] ?? 0;
    final reqSe = widget.ticket['requestedServices'] ?? 0;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 14),

                Row(
                  children: [
                    const Icon(Icons.credit_card_rounded, color: AppTheme.primaryColor),
                    const SizedBox(width: 8),
                    Text('Pay Ticket Quotation', style: GoogleFonts.poppins(fontSize: 17, fontWeight: FontWeight.w700, color: AppTheme.textColor)),
                  ],
                ),
                Text(
                  'Upgrade: +$reqEv Events, +$reqSe Services · Amount: ${formatINR(quoteAmt)}',
                  style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor),
                ),
                const SizedBox(height: 16),

                _buildFieldLabel('CARD NUMBER'),
                TextFormField(
                  controller: _cardNumCtrl,
                  keyboardType: TextInputType.number,
                  style: _inputTextStyle(),
                  maxLength: 19,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(16),
                    _DashboardCardNumberFormatter(),
                  ],
                  decoration: _inputDecoration(hintText: '4111 2222 3333 4444', prefixIcon: const Icon(Icons.credit_card)),
                  validator: (v) {
                    if (v == null || v.replaceAll(' ', '').length != 16) return 'Please enter 16-digit card number';
                    return null;
                  },
                ),

                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildFieldLabel('EXPIRY DATE'),
                          TextFormField(
                            controller: _expiryCtrl,
                            keyboardType: TextInputType.number,
                            style: _inputTextStyle(),
                            maxLength: 5,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                              LengthLimitingTextInputFormatter(4),
                              _DashboardCardExpiryFormatter(),
                            ],
                            decoration: _inputDecoration(hintText: 'MM/YY'),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return 'Required';
                              if (!RegExp(r'^(0[1-9]|1[0-2])\/\d{2}$').hasMatch(v.trim())) {
                                return 'MM/YY required';
                              }
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildFieldLabel('CVV'),
                          TextFormField(
                            controller: _cvvCtrl,
                            keyboardType: TextInputType.number,
                            obscureText: true,
                            style: _inputTextStyle(),
                            maxLength: 3,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                              LengthLimitingTextInputFormatter(3),
                            ],
                            decoration: _inputDecoration(hintText: '123'),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return 'Required';
                              if (v.trim().length < 3) return '3 digits required';
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                _buildFieldLabel('CARDHOLDER NAME'),
                TextFormField(
                  controller: _cardholderCtrl,
                  style: _inputTextStyle(),
                  maxLength: 50,
                  inputFormatters: [
                    LengthLimitingTextInputFormatter(50),
                  ],
                  decoration: _inputDecoration(hintText: 'John Doe', prefixIcon: const Icon(Icons.person_outline)),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Cardholder name is required' : null,
                ),

                const SizedBox(height: 18),

                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _payQuotation,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: _submitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(
                            'Pay ${formatINR(quoteAmt)} & Submit',
                            style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                  ),
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFieldLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Text(
        label,
        style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.subtitleColor, letterSpacing: 0.5),
      ),
    );
  }

  TextStyle _inputTextStyle() => GoogleFonts.poppins(fontSize: 13, color: AppTheme.textColor);

  InputDecoration _inputDecoration({required String hintText, Widget? prefixIcon}) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: GoogleFonts.poppins(fontSize: 12.5, color: const Color(0xFF94A3B8)),
      filled: true,
      fillColor: AppTheme.inputFillColor,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      prefixIcon: prefixIcon != null ? IconTheme(data: const IconThemeData(color: AppTheme.subtitleColor, size: 18), child: prefixIcon) : null,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.borderColor)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.borderColor)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.5)),
      counterText: '',
    );
  }
}

class _DashboardCardNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    if (newValue.text.isEmpty) return newValue;
    final digitsOnly = newValue.text.replaceAll(RegExp(r'\D'), '');
    final limitedDigits = digitsOnly.length > 16 ? digitsOnly.substring(0, 16) : digitsOnly;
    final buffer = StringBuffer();
    for (int i = 0; i < limitedDigits.length; i++) {
      if (i > 0 && i % 4 == 0) buffer.write(' ');
      buffer.write(limitedDigits[i]);
    }
    final formatted = buffer.toString();
    return TextEditingValue(text: formatted, selection: TextSelection.collapsed(offset: formatted.length));
  }
}

class _DashboardCardExpiryFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    if (newValue.text.isEmpty) return newValue;
    final digitsOnly = newValue.text.replaceAll(RegExp(r'\D'), '');
    final limitedDigits = digitsOnly.length > 4 ? digitsOnly.substring(0, 4) : digitsOnly;
    final buffer = StringBuffer();
    for (int i = 0; i < limitedDigits.length; i++) {
      if (i == 2) buffer.write('/');
      buffer.write(limitedDigits[i]);
    }
    final formatted = buffer.toString();
    return TextEditingValue(text: formatted, selection: TextSelection.collapsed(offset: formatted.length));
  }
}

