import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/app_theme.dart';
import '../../config/api_config.dart';
import '../../services/merchant_service.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/empty_state.dart';

class MerchantServicesScreen extends StatefulWidget {
  const MerchantServicesScreen({super.key});

  @override
  State<MerchantServicesScreen> createState() => _MerchantServicesScreenState();
}

class _MerchantServicesScreenState extends State<MerchantServicesScreen> {
  final _merchantService = MerchantService();

  bool _loading = true;
  String? _error;
  List<dynamic> _services = [];

  @override
  void initState() {
    super.initState();
    _loadServices();
  }

  Future<void> _loadServices() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final services = await _merchantService.getMyServices();
      setState(() => _services = services);
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
        title: const Text('My Services'),
        backgroundColor: Colors.white,
        automaticallyImplyLeading: false,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await context.push('/merchant/create-service');
          _loadServices();
        },
        backgroundColor: AppTheme.primaryColor,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Service',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
      body: _loading
          ? const LoadingView()
          : _error != null
              ? _buildError()
              : _services.isEmpty
                  ? EmptyState(
                      icon: Icons.design_services_outlined,
                      title: 'No Services Yet',
                      message: 'Add your first service to start accepting bookings.',
                    )
                  : RefreshIndicator(
                      onRefresh: _loadServices,
                      color: AppTheme.primaryColor,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _services.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 12),
                        itemBuilder: (context, i) => _ServiceCard(
                          service: _services[i],
                          onRefresh: _loadServices,
                        ),
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
          ElevatedButton(onPressed: _loadServices, child: const Text('Retry')),
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
    final category = service['category']?.toString() ?? '';
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

    return GestureDetector(
      onTap: () async {
        await context.push('/merchant/service-details/$id', extra: service);
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
        child: Row(
          children: [
            // Image
            SizedBox(
              width: 110,
              height: 110,
              child: imageUrl.isNotEmpty
                  ? Image.network(imageUrl, fit: BoxFit.cover,
                      errorBuilder: (ctx, err, stack) => Container(
                        color: AppTheme.tintPinkBg,
                        child: const Icon(Icons.design_services, color: AppTheme.tintPinkFg, size: 30),
                      ))
                  : Container(
                      color: AppTheme.tintPinkBg,
                      child: const Icon(Icons.design_services, color: AppTheme.tintPinkFg, size: 30),
                    ),
            ),
            // Info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(name,
                              style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.textColor)),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isActive
                                ? AppTheme.successColor.withValues(alpha: 0.1)
                                : AppTheme.warningColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            isActive ? 'Active' : 'Inactive',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: isActive ? AppTheme.successColor : AppTheme.warningColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (category.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(category,
                          style: const TextStyle(
                              fontSize: 12, color: AppTheme.subtitleColor)),
                    ],
                    const SizedBox(height: 8),
                    Text('₹${price.toStringAsFixed(0)}',
                        style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.primaryColor)),
                    const SizedBox(height: 4),
                    Text('${addOns.length} add-ons',
                        style: const TextStyle(fontSize: 12, color: AppTheme.subtitleColor)),
                  ],
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.only(right: 12),
              child: Icon(Icons.chevron_right, color: AppTheme.subtitleColor),
            ),
          ],
        ),
      ),
    );
  }
}
