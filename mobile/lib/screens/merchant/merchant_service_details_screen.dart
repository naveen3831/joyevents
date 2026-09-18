import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/api_config.dart';
import '../../config/app_theme.dart';
import '../../services/merchant_service.dart';
import '../../widgets/loading_view.dart';

class MerchantServiceDetailsScreen extends StatefulWidget {
  final String serviceId;
  final dynamic initialData;

  const MerchantServiceDetailsScreen({
    super.key,
    required this.serviceId,
    this.initialData,
  });

  @override
  State<MerchantServiceDetailsScreen> createState() =>
      _MerchantServiceDetailsScreenState();
}

class _MerchantServiceDetailsScreenState
    extends State<MerchantServiceDetailsScreen> {
  final _merchantService = MerchantService();
  late Map<String, dynamic> _service;
  bool _loading = false;
  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    _service = (widget.initialData is Map<String, dynamic>)
        ? Map<String, dynamic>.from(widget.initialData as Map<String, dynamic>)
        : {};
    _fetchFreshDetails();
  }

  Future<void> _fetchFreshDetails() async {
    if (widget.serviceId.isEmpty) return;
    if (_service.isEmpty) {
      setState(() => _loading = true);
    }
    try {
      final fresh = await _merchantService.getServiceDetails(widget.serviceId);
      if (fresh.isNotEmpty && mounted) {
        setState(() {
          _service = fresh;
        });
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error fetching service details: $e');
      }
    } finally {
      if (mounted && _loading) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _deleteService() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Delete Service',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
        ),
        content: Text(
          'Are you sure you want to delete this service? This action cannot be undone.',
          style: GoogleFonts.poppins(fontSize: 13.5, color: AppTheme.subtitleColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: GoogleFonts.poppins(color: AppTheme.subtitleColor, fontWeight: FontWeight.w600),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.errorColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(context, true),
            child: Text(
              'Delete',
              style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _deleting = true);
    try {
      await _merchantService.deleteService(widget.serviceId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Service deleted successfully',
              style: GoogleFonts.poppins(),
            ),
            backgroundColor: AppTheme.successColor,
          ),
        );
        context.pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  /// Extracts the main service cover image URL from multiple possible backend field keys.
  String _extractImageUrl(Map<String, dynamic> service) {
    final raw = (service['image'] ??
            service['coverImage'] ??
            service['coverImageUrl'] ??
            service['imageUrl'] ??
            (service['images'] is List && (service['images'] as List).isNotEmpty
                ? service['images'][0]
                : null))
        ?.toString();
    
    final resolved = ApiConfig.resolveImageUrl(raw);

    if (kDebugMode) {
      debugPrint('== Merchant Service Details Image Trace ==');
      debugPrint('Service ID: ${widget.serviceId}');
      debugPrint('Raw Image Path from API: $raw');
      debugPrint('Final Resolved Image URL: $resolved');
    }

    return resolved;
  }

  /// Formats currency numbers: 15000 -> "15,000"
  String _formatCurrency(double amount) {
    if (amount == 0) return '0';
    final numStr = amount.toStringAsFixed(0);
    final reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    return numStr.replaceAllMapped(reg, (Match m) => '${m[1]},');
  }

  /// Formats guest capacity cleanly without malformed "-- 100 guests"
  String? _formatGuests(dynamic minG, dynamic maxG) {
    final minVal = (minG is num) ? minG.toInt() : int.tryParse(minG?.toString() ?? '');
    final maxVal = (maxG is num) ? maxG.toInt() : int.tryParse(maxG?.toString() ?? '');

    if (minVal != null && maxVal != null) {
      return '$minVal–$maxVal guests';
    } else if (maxVal != null) {
      return 'Up to $maxVal guests';
    } else if (minVal != null) {
      return 'Minimum $minVal guests';
    }
    return null;
  }

  Widget _buildImagePlaceholder() {
    return Container(
      color: const Color(0xFFF1F5F9),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 54,
              height: 54,
              decoration: const BoxDecoration(
                color: AppTheme.tintVioletBg,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.design_services_outlined,
                size: 28,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Image unavailable',
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppTheme.subtitleColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_deleting) {
      return const Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        body: LoadingView(),
      );
    }

    final name = _service['name']?.toString() ?? 'Service Details';
    final category = _service['category']?.toString() ?? 'General';
    final numPrice = _service['price'] ?? _service['basePrice'];
    final price = (numPrice is num) ? numPrice.toDouble() : double.tryParse(numPrice?.toString() ?? '0') ?? 0.0;
    final desc = _service['description']?.toString() ?? '';
    final isActive = (_service['active'] ?? _service['isActive']) == true;
    final imageUrl = _extractImageUrl(_service);
    final addOns = _service['addOns'] as List? ?? [];
    final highlights = _service['highlights'] as List? ?? [];
    final minGuests = _service['minGuests'];
    final maxGuests = _service['maxGuests'];
    final guestText = _formatGuests(minGuests, maxGuests);

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: _loading && _service.isEmpty
          ? const LoadingView()
          : CustomScrollView(
              slivers: [
                SliverAppBar(
                  expandedHeight: 230,
                  pinned: true,
                  backgroundColor: AppTheme.primaryColor,
                  leading: CircularBackIconButton(onPressed: () => context.pop()),
                  flexibleSpace: FlexibleSpaceBar(
                    background: imageUrl.isNotEmpty
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            loadingBuilder: (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return Container(
                                color: const Color(0xFFF1F5F9),
                                child: const Center(
                                  child: SizedBox(
                                    width: 28,
                                    height: 28,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.5,
                                      valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                                    ),
                                  ),
                                ),
                              );
                            },
                            errorBuilder: (context, error, stackTrace) =>
                                _buildImagePlaceholder(),
                          )
                        : _buildImagePlaceholder(),
                  ),
                  actions: [
                    PopupMenuButton<String>(
                      icon: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.35),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.more_vert_rounded,
                          color: Colors.white,
                          size: 18,
                        ),
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      onSelected: (val) async {
                        if (val == 'edit') {
                          final updated = await context.push(
                            '/merchant/edit-service/${widget.serviceId}',
                            extra: _service,
                          );
                          if (updated == true) {
                            _fetchFreshDetails();
                          }
                        } else if (val == 'delete') {
                          _deleteService();
                        }
                      },
                      itemBuilder: (context) => [
                        PopupMenuItem<String>(
                          value: 'edit',
                          child: Row(
                            children: [
                              const Icon(Icons.edit_outlined, size: 18, color: AppTheme.textColor),
                              const SizedBox(width: 10),
                              Text(
                                'Edit Service',
                                style: GoogleFonts.poppins(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w500,
                                  color: AppTheme.textColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                        PopupMenuItem<String>(
                          value: 'delete',
                          child: Row(
                            children: [
                              const Icon(Icons.delete_outline_rounded, size: 18, color: AppTheme.errorColor),
                              const SizedBox(width: 10),
                              Text(
                                'Delete Service',
                                style: GoogleFonts.poppins(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.errorColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 8),
                  ],
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Service Title & Status Badge
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(
                                name,
                                style: GoogleFonts.poppins(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.textColor,
                                  height: 1.2,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: isActive
                                    ? const Color(0xFFDCFCE7)
                                    : const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    isActive
                                        ? Icons.check_circle_rounded
                                        : Icons.pause_circle_filled_rounded,
                                    size: 13,
                                    color: isActive
                                        ? const Color(0xFF16A34A)
                                        : const Color(0xFFD97706),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    isActive ? 'Active' : 'Inactive',
                                    style: GoogleFonts.poppins(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: isActive
                                          ? const Color(0xFF16A34A)
                                          : const Color(0xFFD97706),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 6),

                        // Category Tag
                        if (category.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.tintVioletBg,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              category,
                              style: GoogleFonts.poppins(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                          ),

                        const SizedBox(height: 16),

                        // Price Display
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              '₹',
                              style: GoogleFonts.poppins(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                            Text(
                              _formatCurrency(price),
                              style: GoogleFonts.poppins(
                                fontSize: 28,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.primaryColor,
                                height: 1,
                              ),
                            ),
                            if (price == 0)
                              Padding(
                                padding: const EdgeInsets.only(left: 6),
                                child: Text(
                                  '(Base Price)',
                                  style: GoogleFonts.poppins(
                                    fontSize: 12,
                                    color: AppTheme.subtitleColor,
                                  ),
                                ),
                              ),
                          ],
                        ),

                        // Guest Capacity Row
                        if (guestText != null) ...[
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              const Icon(
                                Icons.people_alt_outlined,
                                size: 16,
                                color: AppTheme.subtitleColor,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                guestText,
                                style: GoogleFonts.poppins(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w500,
                                  color: AppTheme.subtitleColor,
                                ),
                              ),
                            ],
                          ),
                        ],

                        const SizedBox(height: 24),

                        // Description Section
                        if (desc.isNotEmpty) ...[
                          _buildSectionTitle('Description'),
                          const SizedBox(height: 10),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppTheme.borderColor),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.02),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Text(
                              desc,
                              style: GoogleFonts.poppins(
                                fontSize: 13.5,
                                color: AppTheme.textColor,
                                height: 1.6,
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],

                        // Highlights Section
                        if (highlights.isNotEmpty) ...[
                          _buildSectionTitle('Highlights'),
                          const SizedBox(height: 10),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppTheme.borderColor),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.02),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: highlights.map((h) {
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(2),
                                        margin: const EdgeInsets.only(top: 2),
                                        decoration: const BoxDecoration(
                                          color: Color(0xFFDCFCE7),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(
                                          Icons.check_rounded,
                                          size: 13,
                                          color: Color(0xFF16A34A),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          h.toString(),
                                          style: GoogleFonts.poppins(
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.w500,
                                            color: AppTheme.textColor,
                                            height: 1.4,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],

                        // Add-Ons Section
                        if (addOns.isNotEmpty) ...[
                          _buildSectionTitle('Add-Ons'),
                          const SizedBox(height: 10),
                          Column(
                            children: addOns.map((ao) {
                              final aoMap = ao as Map<String, dynamic>? ?? {};
                              final aoName = aoMap['name']?.toString() ?? 'Add-On';
                              final aoNumPrice = aoMap['price'];
                              final aoPrice = (aoNumPrice is num)
                                  ? aoNumPrice.toDouble()
                                  : double.tryParse(aoNumPrice?.toString() ?? '0') ?? 0.0;

                              return Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: AppTheme.borderColor),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.02),
                                      blurRadius: 6,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 38,
                                      height: 38,
                                      decoration: BoxDecoration(
                                        color: AppTheme.tintVioletBg,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Icon(
                                        Icons.extension_outlined,
                                        size: 20,
                                        color: AppTheme.primaryColor,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            aoName,
                                            style: GoogleFonts.poppins(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w600,
                                              color: AppTheme.textColor,
                                            ),
                                          ),
                                          Text(
                                            'Optional extra',
                                            style: GoogleFonts.poppins(
                                              fontSize: 12,
                                              color: AppTheme.subtitleColor,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Text(
                                      '+ ₹${_formatCurrency(aoPrice)}',
                                      style: GoogleFonts.poppins(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: AppTheme.primaryColor,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 24),
                        ],

                        // Compact Actions
                        Row(
                          children: [
                            Expanded(
                              child: SizedBox(
                                height: 50,
                                child: Material(
                                  color: Colors.transparent,
                                  child: Ink(
                                    decoration: BoxDecoration(
                                      gradient: AppTheme.gradientPrimary,
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: InkWell(
                                      onTap: () async {
                                        final updated = await context.push(
                                          '/merchant/edit-service/${widget.serviceId}',
                                          extra: _service,
                                        );
                                        if (updated == true) {
                                          _fetchFreshDetails();
                                        }
                                      },
                                      borderRadius: BorderRadius.circular(14),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Icon(Icons.edit_outlined, size: 18, color: Colors.white),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Edit Service',
                                            style: GoogleFonts.poppins(
                                              fontSize: 14,
                                              fontWeight: FontWeight.w700,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: SizedBox(
                                height: 50,
                                child: OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: AppTheme.errorColor, width: 1.5),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                  onPressed: _deleteService,
                                  icon: const Icon(
                                    Icons.delete_outline_rounded,
                                    size: 18,
                                    color: AppTheme.errorColor,
                                  ),
                                  label: Text(
                                    'Delete',
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: AppTheme.errorColor,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.poppins(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: AppTheme.textColor,
      ),
    );
  }
}

class CircularBackIconButton extends StatelessWidget {
  final VoidCallback onPressed;

  const CircularBackIconButton({super.key, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.35),
          shape: BoxShape.circle,
        ),
        child: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white, size: 20),
          onPressed: onPressed,
          padding: EdgeInsets.zero,
        ),
      ),
    );
  }
}
