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

class MerchantServicesScreen extends StatefulWidget {
  const MerchantServicesScreen({super.key});

  @override
  State<MerchantServicesScreen> createState() => _MerchantServicesScreenState();
}

class _MerchantServicesScreenState extends State<MerchantServicesScreen> {
  final _merchantService = MerchantService();
  final _searchCtrl = TextEditingController();

  bool _loading = true;
  String? _error;
  List<dynamic> _services = [];
  String _searchQuery = '';
  String _statusFilter = 'All'; // 'All' | 'Active' | 'Inactive'

  @override
  void initState() {
    super.initState();
    _loadServices();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadServices() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _merchantService.getMyServices(),
        AuthService().getMe(),
      ]);
      setState(() => _services = results[0] as List);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  List<dynamic> get _filteredServices {
    return _services.where((svc) {
      final map = svc is Map ? svc : <String, dynamic>{};
      final name = map['name']?.toString().toLowerCase() ?? '';
      final category = map['category']?.toString().toLowerCase() ?? '';
      final query = _searchQuery.toLowerCase();

      final matchesQuery = query.isEmpty || name.contains(query) || category.contains(query);

      final isActive = map['active'] == true || map['isActive'] == true;
      bool matchesStatus = true;
      if (_statusFilter == 'Active') {
        matchesStatus = isActive;
      } else if (_statusFilter == 'Inactive') {
        matchesStatus = !isActive;
      }

      return matchesQuery && matchesStatus;
    }).toList();
  }

  int get _activeCount {
    return _services.where((svc) {
      final map = svc is Map ? svc : <String, dynamic>{};
      return map['active'] == true || map['isActive'] == true;
    }).length;
  }

  int get _inactiveCount {
    return _services.where((svc) {
      final map = svc is Map ? svc : <String, dynamic>{};
      return map['active'] != true && map['isActive'] != true;
    }).length;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredServices;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(
          'My Services',
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
                  await context.push('/merchant/create-service');
                  _loadServices();
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
                  'Add Service',
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
                    // Search & Controls Container
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
                              hintText: 'Search your services...',
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
                                _buildFilterChip(
                                  label: 'All',
                                  count: _services.length,
                                  isSelected: _statusFilter == 'All',
                                  onTap: () => setState(() => _statusFilter = 'All'),
                                ),
                                const SizedBox(width: 8),
                                _buildFilterChip(
                                  label: 'Active',
                                  count: _activeCount,
                                  isSelected: _statusFilter == 'Active',
                                  onTap: () => setState(() => _statusFilter = 'Active'),
                                ),
                                const SizedBox(width: 8),
                                _buildFilterChip(
                                  label: 'Inactive',
                                  count: _inactiveCount,
                                  isSelected: _statusFilter == 'Inactive',
                                  onTap: () => setState(() => _statusFilter = 'Inactive'),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Results Header
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      child: Row(
                        children: [
                          Text(
                            'Showing ${filtered.length} ${filtered.length == 1 ? 'service' : 'services'}',
                            style: GoogleFonts.poppins(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.subtitleColor,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Services List / Empty View
                    Expanded(
                      child: _services.isEmpty
                          ? EmptyState(
                              icon: Icons.design_services_outlined,
                              title: 'No Services Yet',
                              message: 'Add your first service to start accepting bookings.',
                            )
                          : filtered.isEmpty
                              ? _buildNoResultsView()
                              : RefreshIndicator(
                                  onRefresh: _loadServices,
                                  color: AppTheme.primaryColor,
                                  child: ListView.separated(
                                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 24),
                                    itemCount: filtered.length,
                                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                                    itemBuilder: (context, i) => _ServiceCard(
                                      service: filtered[i] is Map ? Map<String, dynamic>.from(filtered[i]) : <String, dynamic>{},
                                      onRefresh: _loadServices,
                                    ),
                                  ),
                                ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required int count,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Material(
      color: isSelected ? AppTheme.primaryColor : Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
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
              'No Matching Services',
              style: GoogleFonts.poppins(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppTheme.textColor,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'No services matched your search or status filter criteria.',
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
            _error ?? 'Failed to load services',
            style: GoogleFonts.poppins(color: AppTheme.subtitleColor, fontSize: 13),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadServices,
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

class _ServiceCard extends StatelessWidget {
  final Map<String, dynamic> service;
  final VoidCallback onRefresh;

  const _ServiceCard({required this.service, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    final id = service['_id']?.toString() ?? service['id']?.toString() ?? '';
    final name = service['name']?.toString() ?? 'Service';
    final category = service['category']?.toString() ?? 'General';
    final numPrice = service['price'] ?? service['basePrice'];
    final price = (numPrice is num) ? numPrice.toDouble() : double.tryParse(numPrice?.toString() ?? '0') ?? 0.0;
    final isActive = service['active'] == true || service['isActive'] == true;
    final rawImage = (service['image'] ??
            service['coverImage'] ??
            service['coverImageUrl'] ??
            service['imageUrl'] ??
            (service['images'] is List && (service['images'] as List).isNotEmpty ? service['images'][0] : null))
        ?.toString();
    final imageUrl = ApiConfig.resolveImageUrl(rawImage);
    final addOns = service['addOns'] as List? ?? [];

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
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
            await context.push('/merchant/service-details/$id', extra: service);
            onRefresh();
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Cover Thumbnail
                Container(
                  width: 105,
                  height: 105,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    color: AppTheme.inputFillColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.borderColor.withValues(alpha: 0.6)),
                  ),
                  child: imageUrl.isNotEmpty
                      ? Image.network(
                          imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (ctx, err, stack) => _buildPlaceholderImage(),
                        )
                      : _buildPlaceholderImage(),
                ),

                const SizedBox(width: 14),

                // Main Info Column
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Top Row: Category tag + Status Pill
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppTheme.tintVioletBg,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                category.toUpperCase(),
                                style: GoogleFonts.poppins(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.primaryColor,
                                  letterSpacing: 0.4,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isActive
                                  ? AppTheme.successColor.withValues(alpha: 0.12)
                                  : const Color(0xFF64748B).withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: isActive ? AppTheme.successColor : const Color(0xFF64748B),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  isActive ? 'Active' : 'Inactive',
                                  style: GoogleFonts.poppins(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w600,
                                    color: isActive ? AppTheme.successColor : const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 6),

                      // Service Title
                      Text(
                        name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textColor,
                          height: 1.25,
                        ),
                      ),

                      const SizedBox(height: 8),

                      // Bottom Row: Price & Add-ons info
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                formatINR(price),
                                style: GoogleFonts.poppins(
                                  fontSize: 15.5,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                            ],
                          ),
                          if (addOns.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.inputFillColor,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: AppTheme.borderColor),
                              ),
                              child: Text(
                                '${addOns.length} ${addOns.length == 1 ? 'add-on' : 'add-ons'}',
                                style: GoogleFonts.poppins(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w500,
                                  color: AppTheme.subtitleColor,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 6),

                // Chevron Right
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AppTheme.subtitleColor,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPlaceholderImage() {
    return Container(
      color: AppTheme.tintVioletBg,
      child: const Center(
        child: Icon(
          Icons.design_services_outlined,
          color: AppTheme.primaryColor,
          size: 28,
        ),
      ),
    );
  }
}
