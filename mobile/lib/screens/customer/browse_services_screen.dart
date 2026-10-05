import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_theme.dart';
import '../../models/service_model.dart';
import '../../services/service_service.dart';
import '../../services/merchant_service.dart';
import '../../widgets/category_image_card.dart';
import '../../widgets/customer_gradient_header.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_view.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/service_card.dart';

/// Customer "Browse Services" screen in JoyEvents.
/// Features an extended top hero gradient header, image-based category card carousel,
/// precise category filtering, and a clean 2-column service grid (without search bar).
class BrowseServicesScreen extends StatefulWidget {
  const BrowseServicesScreen({super.key});

  @override
  State<BrowseServicesScreen> createState() => _BrowseServicesScreenState();
}

class _BrowseServicesScreenState extends State<BrowseServicesScreen> {
  final ServiceService _serviceService = ServiceService();

  List<ServiceModel> _allServices = [];
  List<ServiceModel> _displayedServices = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedCategory = 'All';

  List<Map<String, dynamic>> _categoriesList = [
    {'name': 'All'},
    {'name': 'Photography'},
    {'name': 'Catering'},
    {'name': 'Decoration'},
    {'name': 'Wedding Services'},
    {'name': 'Music'},
    {'name': 'DJ'},
    {'name': 'Venue'},
    {'name': 'Makeup'},
    {'name': 'Transport'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchCategories();
    _fetchServices();
  }

  Future<void> _fetchCategories() async {
    try {
      final rawCats = await MerchantService().getCategories(type: 'service');
      if (rawCats.isNotEmpty && mounted) {
        final List<Map<String, dynamic>> loaded = [
          {'name': 'All'}
        ];
        for (var c in rawCats) {
          if (c is Map && c.containsKey('name')) {
            final name = c['name'].toString();
            if (name.toLowerCase() != 'all') {
              loaded.add({
                'name': name,
                'imageUrl': c['imageUrl']?.toString(),
              });
            }
          }
        }
        setState(() {
          _categoriesList = loaded;
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchServices() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Fetch services collection and apply local category filtering for instant responsive switching
      final list = await _serviceService.getServices(
        category: 'All',
        search: '',
      );
      if (mounted) {
        setState(() {
          _allServices = list;
          _applyCategoryFilter();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _applyCategoryFilter() {
    if (_selectedCategory.toLowerCase() == 'all' || _selectedCategory.toLowerCase() == 'all services') {
      _displayedServices = List.from(_allServices);
    } else {
      _displayedServices = _allServices.where((s) {
        final cat = s.category.trim().toLowerCase();
        final selected = _selectedCategory.trim().toLowerCase();
        return cat == selected || cat.contains(selected) || selected.contains(cat);
      }).toList();
    }
  }

  /// Combine categories from _categoriesList (default + API-loaded) with any
  /// dynamic categories present in loaded services.
  List<String> get _dynamicCategories {
    // Seed from the existing _categoriesList field which already holds
    // the curated default list and any categories fetched from the backend.
    final categoriesSet = <String>{
      for (final item in _categoriesList) item['name'] as String,
    };
    for (final service in _allServices) {
      if (service.category.trim().isNotEmpty) {
        final match = categoriesSet.firstWhere(
          (c) => c.trim().toLowerCase() == service.category.trim().toLowerCase(),
          orElse: () => '',
        );
        if (match.isEmpty) {
          categoriesSet.add(service.category.trim());
        }
      }
    }
    return categoriesSet.toList();
  }

  void _resetCategory() {
    setState(() {
      _selectedCategory = 'All';
      _applyCategoryFilter();
    });
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;
    // _dynamicCategories merges _categoriesList names with service-derived categories.
    // The carousel below uses _categoriesList directly (with imageUrl).
    // ignore: unused_local_variable
    final unusedDyn = _dynamicCategories;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ═══════════════════════════════════════════
          // 1. EXTENDED TOP HERO GRADIENT HEADER
          // ═══════════════════════════════════════════
          CustomerGradientHeader(
            title: 'Browse Services',
            subtitle: 'Discover & book top event services',
            borderRadius: 28.0,
            padding: EdgeInsets.only(
              top: topPadding + 14,
              left: 20,
              right: 12,
              bottom: 24,
            ),
          ),

          const SizedBox(height: 18),

          // ═══════════════════════════════════════════
          // 2. CATEGORIES HEADER & CAROUSEL
          // ═══════════════════════════════════════════
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Categories',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textColor,
                    letterSpacing: -0.2,
                  ),
                ),
                if (_selectedCategory.toLowerCase() != 'all')
                  InkWell(
                    onTap: _resetCategory,
                    borderRadius: BorderRadius.circular(12),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Text(
                        'Reset Filter',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Image-based Horizontal Category Cards Carousel
          SizedBox(
            height: 104,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _categoriesList.length,
              itemBuilder: (context, index) {
                final item = _categoriesList[index];
                final cat = item['name'] as String;
                final imageUrl = item['imageUrl'] as String?;
                final isSelected = _selectedCategory.toLowerCase() == cat.toLowerCase();
                return CategoryImageCard(
                  title: cat,
                  imageUrl: imageUrl,
                  isSelected: isSelected,
                  width: 110,
                  height: 100,
                  allLabel: 'All Services',
                  onTap: () {
                    if (!isSelected) {
                      setState(() {
                        _selectedCategory = cat;
                        _applyCategoryFilter();
                      });
                    }
                  },
                );
              },
            ),
          ),

          const SizedBox(height: 14),

          // ═══════════════════════════════════════════
          // 3. SERVICES GRID AREA
          // ═══════════════════════════════════════════
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchServices,
              child: _isLoading
                  ? const LoadingView(message: 'Loading services...')
                  : _errorMessage != null
                      ? ErrorView(message: _errorMessage!, onRetry: _fetchServices)
                      : _displayedServices.isEmpty
                          ? EmptyState(
                              title: 'No Services Found',
                              message: 'No event services match your selected category.',
                              icon: Icons.miscellaneous_services_outlined,
                              action: ElevatedButton(
                                onPressed: _resetCategory,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primaryColor,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: const Text('Show All Services'),
                              ),
                            )
                          : GridView.builder(
                              padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                                mainAxisExtent: 210,
                              ),
                              itemCount: _displayedServices.length,
                              itemBuilder: (context, index) {
                                final service = _displayedServices[index];
                                return ServiceCard(
                                  service: service,
                                  onTap: () => context.push(
                                    '/customer/service-details/${service.id}',
                                    extra: service,
                                  ),
                                );
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }
}
