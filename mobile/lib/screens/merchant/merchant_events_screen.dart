import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/app_theme.dart';
import '../../config/api_config.dart';
import '../../services/auth_service.dart';
import '../../services/merchant_service.dart';
import '../../utils/currency_formatter.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/empty_state.dart';

class MerchantEventsScreen extends StatefulWidget {
  const MerchantEventsScreen({super.key});

  @override
  State<MerchantEventsScreen> createState() => _MerchantEventsScreenState();
}

class _MerchantEventsScreenState extends State<MerchantEventsScreen> {
  final _merchantService = MerchantService();
  final _searchCtrl = TextEditingController();

  bool _loading = true;
  String? _error;
  List<dynamic> _events = [];
  String _searchQuery = '';
  String _statusFilter = 'All'; // 'All' | 'Live' | 'Upcoming' | 'Draft' | 'Completed'

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadEvents() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _merchantService.getMyEvents(),
        AuthService().getMe(),
      ]);
      setState(() => _events = results[0] as List);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  String _getEventStatus(Map<dynamic, dynamic> evt) {
    final isLive = evt['live'] == true;
    final status = evt['status']?.toString().toLowerCase() ?? '';
    final dateStr = evt['datetime']?.toString() ?? evt['date']?.toString() ?? evt['startDate']?.toString() ?? '';

    DateTime? evtDate;
    if (dateStr.isNotEmpty) {
      try {
        evtDate = DateTime.parse(dateStr);
      } catch (_) {}
    }

    if (!isLive) return 'Draft';
    if (status == 'completed' || (evtDate != null && evtDate.isBefore(DateTime.now().subtract(const Duration(days: 1))))) {
      return 'Completed';
    }
    if (status == 'upcoming' || (evtDate != null && evtDate.isAfter(DateTime.now()))) {
      return 'Upcoming';
    }
    return 'Live';
  }

  List<dynamic> get _filteredEvents {
    return _events.where((evt) {
      final map = evt is Map ? evt : <dynamic, dynamic>{};
      final title = map['title']?.toString().toLowerCase() ?? '';
      final location = map['location']?.toString().toLowerCase() ?? '';
      final category = map['category']?.toString().toLowerCase() ?? '';
      final query = _searchQuery.toLowerCase();

      final matchesQuery = query.isEmpty ||
          title.contains(query) ||
          location.contains(query) ||
          category.contains(query);

      final status = _getEventStatus(map);
      bool matchesStatus = true;
      if (_statusFilter == 'Live') {
        matchesStatus = map['live'] == true;
      } else if (_statusFilter == 'Upcoming') {
        matchesStatus = status == 'Upcoming' || status == 'Live';
      } else if (_statusFilter == 'Draft') {
        matchesStatus = map['live'] != true;
      } else if (_statusFilter == 'Completed') {
        matchesStatus = status == 'Completed';
      }

      return matchesQuery && matchesStatus;
    }).toList();
  }

  int _countForStatus(String filterName) {
    if (filterName == 'All') return _events.length;
    return _events.where((evt) {
      final map = evt is Map ? evt : <dynamic, dynamic>{};
      final st = _getEventStatus(map);
      if (filterName == 'Live') return map['live'] == true;
      if (filterName == 'Upcoming') return st == 'Upcoming' || st == 'Live';
      if (filterName == 'Draft') return map['live'] != true;
      if (filterName == 'Completed') return st == 'Completed';
      return true;
    }).length;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredEvents;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(
          'My Events',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.w700,
            fontSize: 20,
            color: AppTheme.textColor,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: ElevatedButton.icon(
                onPressed: () async {
                  await context.push('/merchant/create-event');
                  _loadEvents();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text(
                  'Create Event',
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: _loading
          ? const LoadingView()
          : _error != null
              ? _buildError()
              : Column(
                  children: [
                    // Search & Controls Header Container
                    Container(
                      color: Colors.white,
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Search Input Field
                          TextField(
                            controller: _searchCtrl,
                            onChanged: (val) => setState(() => _searchQuery = val.trim()),
                            style: GoogleFonts.poppins(fontSize: 13.5, color: AppTheme.textColor),
                            decoration: InputDecoration(
                              hintText: 'Search your events...',
                              hintStyle: GoogleFonts.poppins(fontSize: 13, color: const Color(0xFF94A3B8)),
                              prefixIcon: const Icon(Icons.search_rounded, size: 20, color: AppTheme.subtitleColor),
                              suffixIcon: _searchQuery.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(Icons.clear_rounded, size: 18, color: AppTheme.subtitleColor),
                                      onPressed: () {
                                        _searchCtrl.clear();
                                        setState(() => _searchQuery = '');
                                      },
                                    )
                                  : null,
                              filled: true,
                              fillColor: AppTheme.inputFillColor,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: AppTheme.borderColor),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: AppTheme.borderColor),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.5),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Filter Chips Bar
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _buildFilterChip('All'),
                                const SizedBox(width: 8),
                                _buildFilterChip('Live'),
                                const SizedBox(width: 8),
                                _buildFilterChip('Upcoming'),
                                const SizedBox(width: 8),
                                _buildFilterChip('Draft'),
                                const SizedBox(width: 8),
                                _buildFilterChip('Completed'),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Results Header Count
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      child: Row(
                        children: [
                          Text(
                            'Showing ${filtered.length} ${filtered.length == 1 ? 'event' : 'events'}',
                            style: GoogleFonts.poppins(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.subtitleColor,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Events List / Empty View
                    Expanded(
                      child: _events.isEmpty
                          ? EmptyState(
                              icon: Icons.event_outlined,
                              title: 'No Events Yet',
                              message: 'Create your first event to start accepting attendees.',
                            )
                          : filtered.isEmpty
                              ? _buildNoResultsView()
                              : RefreshIndicator(
                                  onRefresh: _loadEvents,
                                  color: AppTheme.primaryColor,
                                  child: ListView.separated(
                                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 24),
                                    itemCount: filtered.length,
                                    separatorBuilder: (context, index) => const SizedBox(height: 14),
                                    itemBuilder: (context, i) => _EventCard(
                                      event: filtered[i] is Map ? Map<String, dynamic>.from(filtered[i]) : <String, dynamic>{},
                                      computedStatus: _getEventStatus(filtered[i] is Map ? Map<String, dynamic>.from(filtered[i]) : <String, dynamic>{}),
                                      onRefresh: _loadEvents,
                                    ),
                                  ),
                                ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildFilterChip(String label) {
    final isSelected = _statusFilter == label;
    final count = _countForStatus(label);

    return Material(
      color: isSelected ? AppTheme.primaryColor : Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: () => setState(() => _statusFilter = label),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? AppTheme.primaryColor : AppTheme.borderColor,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: GoogleFonts.poppins(
                  fontSize: 12.5,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? Colors.white : AppTheme.textColor,
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Colors.white.withValues(alpha: 0.25)
                      : AppTheme.inputFillColor,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: GoogleFonts.poppins(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : AppTheme.subtitleColor,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNoResultsView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: AppTheme.tintVioletBg,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.search_off_rounded, size: 36, color: AppTheme.primaryColor),
            ),
            const SizedBox(height: 14),
            Text(
              'No Matching Events',
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppTheme.textColor,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'No events matched your search or status filter criteria.',
              textAlign: TextAlign.center,
              style: GoogleFonts.poppins(
                fontSize: 12.5,
                color: AppTheme.subtitleColor,
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () {
                _searchCtrl.clear();
                setState(() {
                  _searchQuery = '';
                  _statusFilter = 'All';
                });
              },
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTheme.primaryColor),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(
                'Reset Filters',
                style: GoogleFonts.poppins(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline_rounded, size: 48, color: AppTheme.errorColor),
          const SizedBox(height: 12),
          Text(
            _error ?? 'Failed to load events',
            style: GoogleFonts.poppins(color: AppTheme.subtitleColor, fontSize: 13),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadEvents,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Text(
              'Retry',
              style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final Map<String, dynamic> event;
  final String computedStatus;
  final VoidCallback onRefresh;

  const _EventCard({
    required this.event,
    required this.computedStatus,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final id = event['_id']?.toString() ?? event['id']?.toString() ?? '';
    final title = event['title']?.toString() ?? 'Event Title';
    final isLive = event['live'] == true;
    final numPrice = event['price'] ?? event['basePrice'];
    final price = (numPrice is num) ? numPrice.toDouble() : double.tryParse(numPrice?.toString() ?? '0') ?? 0.0;
    final attendees = (event['attendeesCount'] as num?)?.toInt() ?? 0;
    final location = event['location']?.toString().trim() ?? '';
    final rawImage = (event['image'] ?? event['coverImage'] ?? event['imageUrl'])?.toString();
    final imageUrl = ApiConfig.resolveImageUrl(rawImage);

    // Format Date & Time
    final dateStr = event['date']?.toString() ?? event['startDate']?.toString() ?? event['datetime']?.toString() ?? '';
    final startTimeStr = event['startTime']?.toString() ?? '';
    
    String formattedDate = '';
    if (dateStr.isNotEmpty) {
      try {
        final dt = DateTime.parse(dateStr);
        final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        formattedDate = '${dt.day} ${months[dt.month - 1]} ${dt.year}';
      } catch (_) {
        formattedDate = dateStr;
      }
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () async {
            await context.push('/merchant/event-details/$id', extra: event);
            onRefresh();
          },
          borderRadius: BorderRadius.circular(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Cover Image Banner with Overlay Status Badge
              AspectRatio(
                aspectRatio: 16 / 7.5,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    imageUrl.isNotEmpty
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, err, stack) => _buildPlaceholderBanner(),
                          )
                        : _buildPlaceholderBanner(),
                    
                    // Gradient Overlay for Badge Contrast
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withValues(alpha: 0.35),
                              Colors.transparent,
                            ],
                            stops: const [0.0, 0.6],
                          ),
                        ),
                      ),
                    ),

                    // Status Badge
                    Positioned(
                      top: 10,
                      left: 10,
                      child: _buildStatusBadge(isLive, computedStatus),
                    ),
                  ],
                ),
              ),

              // Card Content Body
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textColor,
                        height: 1.25,
                      ),
                    ),

                    // Date, Time & Location Metadata (Only render when available)
                    if (formattedDate.isNotEmpty || location.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 12,
                        runSpacing: 6,
                        children: [
                          if (formattedDate.isNotEmpty)
                            _buildInfoChip(
                              icon: Icons.calendar_today_rounded,
                              text: startTimeStr.isNotEmpty ? '$formattedDate • $startTimeStr' : formattedDate,
                            ),
                          if (location.isNotEmpty)
                            _buildInfoChip(
                              icon: Icons.location_on_rounded,
                              text: location,
                            ),
                        ],
                      ),
                    ],

                    const SizedBox(height: 12),
                    const Divider(height: 1, color: AppTheme.borderColor),
                    const SizedBox(height: 10),

                    // Bottom Row: Price, Attendees & View Details Action
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Price & Attendees
                        Row(
                          children: [
                            Text(
                              price > 0 ? formatINR(price) : 'Free',
                              style: GoogleFonts.poppins(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppTheme.inputFillColor,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppTheme.borderColor),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.people_alt_outlined, size: 13, color: AppTheme.subtitleColor),
                                  const SizedBox(width: 4),
                                  Text(
                                    '$attendees',
                                    style: GoogleFonts.poppins(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w600,
                                      color: AppTheme.textColor,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        // View Details CTA
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'View Details',
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                            const SizedBox(width: 2),
                            const Icon(
                              Icons.chevron_right_rounded,
                              size: 18,
                              color: AppTheme.primaryColor,
                            ),
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
      ),
    );
  }

  Widget _buildStatusBadge(bool isLive, String status) {
    Color badgeBg;
    Color textBg;
    String label;

    if (isLive) {
      badgeBg = AppTheme.successColor;
      textBg = Colors.white;
      label = '● LIVE';
    } else if (status == 'Upcoming') {
      badgeBg = const Color(0xFF8B5CF6); // Purple/Violet
      textBg = Colors.white;
      label = 'UPCOMING';
    } else if (status == 'Completed') {
      badgeBg = const Color(0xFF64748B); // Slate
      textBg = Colors.white;
      label = 'COMPLETED';
    } else {
      badgeBg = const Color(0xFFF59E0B); // Amber
      textBg = Colors.white;
      label = 'DRAFT';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: badgeBg,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Text(
        label,
        style: GoogleFonts.poppins(
          color: textBg,
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildInfoChip({required IconData icon, required String text}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppTheme.primaryColor),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppTheme.subtitleColor,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPlaceholderBanner() {
    return Container(
      color: AppTheme.tintVioletBg,
      child: const Center(
        child: Icon(
          Icons.event_seat_outlined,
          color: AppTheme.primaryColor,
          size: 36,
        ),
      ),
    );
  }
}
